import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {db,id,audit,projectDetails} from './db.mjs';
import {roles,stages,docs,documentByKey,stageById,validateProject,missingDocs,canAdvance,previousStage,canVote,committeeOutcome} from './workflow.mjs';

const app=express();
const PORT=Number(process.env.PORT||4000);
const secret=process.env.JWT_SECRET;
if(!secret || secret.length<32) throw new Error('Set a random JWT_SECRET with at least 32 characters.');
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'1mb'}));
app.use('/api/auth/login',
 rateLimit({windowMs:15*60*1000,limit:200,standardHeaders:'draft-7',legacyHeaders:false}),
 rateLimit({windowMs:15*60*1000,limit:12,keyGenerator:req=>String(req.body?.username||'').trim().toLowerCase().slice(0,70),standardHeaders:'draft-7',legacyHeaders:false})
);
const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
const endpoint=fn=>(req,res,next)=>{try{Promise.resolve(fn(req,res)).catch(next);}catch(e){next(e);}};
const allow=(...allowed)=>(req,res,next)=> allowed.includes(req.user?.role)?next():next(Object.assign(new Error('ليس لديك الصلاحية المطلوبة'),{status:403}));
const int=(x,defaultValue=0)=>Number.isFinite(Number(x))?Number(x):defaultValue;
const max=(x,n=1000)=>String(x??'').trim().slice(0,n);
const bearer=(req,res,next)=>{
 const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');
 if(!token)return next(Object.assign(new Error('يرجى تسجيل الدخول'),{status:401}));
 try{
  const payload=jwt.verify(token,secret,{algorithms:['HS256']});
  const user=db.prepare('SELECT id,username,name,role,active FROM users WHERE id=?').get(payload.sub);
  if(!user?.active) return fail(401,'الحساب غير مفعل');
  req.user=user;next();
 }catch(e){next(Object.assign(new Error('جلسة الدخول منتهية أو غير صالحة'),{status:401}));}
};
const requireProject=(req)=>{
 const project=db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
 if(!project)fail(404,'المشروع غير موجود');
 return project;
};
const hasDoc=(projectId,key)=>Boolean(db.prepare('SELECT 1 FROM documents WHERE project_id=? AND doc_key=?').get(projectId,key));
const userSafe=u=>({id:u.id,name:u.name,username:u.username,role:u.role,active:!!u.active});
const auditSummary=p=>({id:p.id,code:p.code,title:p.title,governorate:p.governorate,district:p.district,beneficiary:p.beneficiary,sector:p.sector,estimated_cost:p.estimated_cost,total_cost:p.total_cost,status:p.status,updated_at:p.updated_at,created_at:p.created_at,created_by:p.created_by,creator_name:p.creator_name});
const updateStatus=db.prepare("UPDATE projects SET status=?,version=version+1,updated_at=datetime('now') WHERE id=? AND status=?");
const uploadDir=path.resolve(process.env.UPLOAD_DIR||'./data/uploads');
fs.mkdirSync(uploadDir,{recursive:true});
const mimeTypes=new Set(['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
const upload=multer({storage:multer.diskStorage({destination:uploadDir,filename:(req,file,cb)=>cb(null,crypto.randomUUID())}),limits:{fileSize:15*1024*1024,files:1},fileFilter:(req,file,cb)=>cb(null,mimeTypes.has(file.mimetype))});

app.get('/api/health',(req,res)=>res.json({ok:true,service:'projects-workflow',version:'0.1.0'}));
app.post('/api/auth/login',endpoint((req,res)=>{
 const username=max(req.body.username,70); const password=String(req.body.password||'');
 const user=db.prepare('SELECT * FROM users WHERE username=?').get(username);
 if(!user || !user.active || !bcrypt.compareSync(password,user.password_hash))fail(401,'اسم المستخدم أو كلمة المرور غير صحيحة');
 const token=jwt.sign({sub:user.id},secret,{algorithm:'HS256',expiresIn:'8h'});
 res.json({token,user:userSafe(user)});
}));
app.use('/api',bearer);
app.get('/api/me',(req,res)=>res.json({user:userSafe(req.user)}));
app.get('/api/meta',(req,res)=>res.json({roles,stages,docs,year:new Date().getUTCFullYear(),legalBasis:[
 {title:'تعليمات تنفيذ العقود العامة 1 لسنة 2025',url:'https://iraqld.msla.iq/legislations/showlegislation?lawbookid=54139'},
 {title:'نظام صندوق الإعمار 5 لسنة 2023',url:'https://iraqld.msla.iq/legislations/showlegislation?asc=210420236626690'},
 {title:'التعديل الأول 5 لسنة 2024',url:'https://iraqld.msla.iq/legislations/showlegislation?lawbookid=51487'}
]}));

app.get('/api/dashboard',endpoint((req,res)=>{
 const total=db.prepare('SELECT count(*) n FROM projects').get().n;
 const byStatus=db.prepare('SELECT status,count(*) n FROM projects GROUP BY status').all();
 const byGovernorate=db.prepare('SELECT governorate,count(*) n,coalesce(sum(total_cost),0) amount FROM projects GROUP BY governorate ORDER BY n DESC LIMIT 8').all();
 const pendingAdvances=db.prepare("SELECT count(*) n FROM advances WHERE status NOT IN ('paid','rejected')").get().n;
 const totalEstimated=db.prepare('SELECT coalesce(sum(estimated_cost),0) n FROM projects').get().n;
 const recent=db.prepare('SELECT p.*,u.name creator_name FROM projects p JOIN users u ON p.created_by=u.id ORDER BY p.updated_at DESC LIMIT 8').all().map(auditSummary);
 const tasks=byStatus.filter(s=>!['draft','completed','rejected'].includes(s.status)).reduce((a,b)=>a+b.n,0);
 res.json({total,totalEstimated,pendingAdvances,tasks,byStatus,byGovernorate,recent});
}));
app.get('/api/projects',endpoint((req,res)=>{
 const q='%'+max(req.query.q,150)+'%'; const status=max(req.query.status,40);
 const rows=db.prepare(`SELECT p.*,u.name AS creator_name FROM projects p JOIN users u ON u.id=p.created_by
 WHERE (p.title LIKE ? OR p.code LIKE ? OR p.governorate LIKE ?)
 AND (?='' OR p.status=?) ORDER BY p.updated_at DESC LIMIT 300`).all(q,q,q,status,status);
 res.json(rows.map(auditSummary));
}));
app.post('/api/projects',allow('admin','submitter'),endpoint((req,res)=>{
 const p=req.body||{};validateProject(p);
 const projectId=id();
 const year=int(p.fiscal_year,new Date().getFullYear());
 const last=db.prepare("SELECT count(*) n FROM projects WHERE fiscal_year=?").get(year).n+1;
 const code='RPF-'+year+'-'+String(last).padStart(4,'0');
 db.prepare(`INSERT INTO projects(id,code,title,governorate,district,beneficiary,executing_entity,sector,summary,estimated_cost,total_cost,fiscal_year,procurement_method,created_by)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(projectId,code,max(p.title,250),max(p.governorate,80),max(p.district,80),max(p.beneficiary,160),
 max(p.executing_entity,160),max(p.sector,80)||'خدمات',max(p.summary,2500),int(p.estimated_cost),int(p.total_cost),year,max(p.procurement_method,80)||'مناقصة عامة',req.user.id);
 audit(req.user.id,'project.created',projectId,null,'draft');
 res.status(201).json(projectDetails(projectId));
}));
app.get('/api/projects/:id',endpoint((req,res)=>{
 const p=projectDetails(req.params.id);if(!p)fail(404,'المشروع غير موجود');res.json(p);
}));
app.patch('/api/projects/:id',endpoint((req,res)=>{
 const p=requireProject(req);
 if(p.status!=='draft')fail(409,'تعديل البيانات الأساسية متاح في مرحلة المسودة فقط');
 if(req.user.role!=='admin'&&p.created_by!==req.user.id)fail(403,'التعديل لصاحب المشروع أو مدير النظام');
 const v={...p,...req.body};validateProject(v);
 db.prepare(`UPDATE projects SET title=?,governorate=?,district=?,beneficiary=?,executing_entity=?,sector=?,summary=?,estimated_cost=?,total_cost=?,procurement_method=?,version=version+1,updated_at=datetime('now') WHERE id=?`).run(
 max(v.title,250),max(v.governorate,80),max(v.district,80),max(v.beneficiary,160),max(v.executing_entity,160),max(v.sector,80),max(v.summary,2500),int(v.estimated_cost),int(v.total_cost),max(v.procurement_method,80),p.id);
 audit(req.user.id,'project.updated',p.id,p.status,p.status);
 res.json(projectDetails(p.id));
}));
app.get('/api/users',allow('admin'),endpoint((req,res)=>res.json(db.prepare('SELECT id,username,name,role,active,created_at FROM users ORDER BY created_at DESC').all())));
app.post('/api/users',allow('admin'),endpoint((req,res)=>{
 const {username,name,role,password}=req.body;
 if(!roles[role])fail(400,'الدور غير صالح');
 if(!/^[a-zA-Z0-9_.-]{3,60}$/.test(username||''))fail(400,'اسم المستخدم يجب أن يكون لاتينياً من 3 أحرف على الأقل');
 if(String(password||'').length<12)fail(400,'كلمة المرور لا تقل عن 12 رمزاً');
 const userId=id();
 try{db.prepare('INSERT INTO users(id,username,name,role,password_hash) VALUES(?,?,?,?,?)').run(userId,username,max(name,120),role,bcrypt.hashSync(password,12));}
 catch(e){if(e.code?.includes('CONSTRAINT'))fail(409,'اسم المستخدم مستخدم');throw e;}
 audit(req.user.id,'user.created',null,null,null,username+' / '+role);
 res.status(201).json({id:userId,username,name,role});
}));
app.patch('/api/users/:userId',allow('admin'),endpoint((req,res)=>{
 const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.params.userId);if(!u)fail(404,'المستخدم غير موجود');
 if(u.id===req.user.id && (req.body.active===false||req.body.role&&req.body.role!=='admin'))fail(400,'لا يمكنك تعطيل حسابك الإداري أو إزالة صلاحيتك');
 const role=req.body.role??u.role;if(!roles[role])fail(400,'الدور غير صحيح');
 const active=req.body.active===undefined?u.active:(req.body.active?1:0);
 db.prepare('UPDATE users SET role=?,active=? WHERE id=?').run(role,active,u.id);
 audit(req.user.id,'user.updated',null,null,null,u.username);
 res.json({ok:true});
}));
app.get('/api/committees',endpoint((req,res)=>{
 const rows=db.prepare('SELECT * FROM committees ORDER BY name').all();
 res.json(rows.map(c=>({...c,members:db.prepare(`SELECT u.id,u.name,u.role FROM committee_members m JOIN users u ON u.id=m.user_id WHERE m.committee_id=?`).all(c.id)})));
}));
app.post('/api/committees',allow('admin'),endpoint((req,res)=>{
 const name=max(req.body.name,120);const quorum=int(req.body.quorum,2);
 if(!name||quorum<1||quorum>20)fail(400,'اسم اللجنة والنصاب مطلوبان');
 const committeeId=id();
 db.prepare('INSERT INTO committees(id,name,quorum) VALUES(?,?,?)').run(committeeId,name,quorum);
 audit(req.user.id,'committee.created',null,null,null,name);
 res.json({id:committeeId});
}));
app.post('/api/committees/:committeeId/members',allow('admin'),endpoint((req,res)=>{
 const c=db.prepare('SELECT * FROM committees WHERE id=?').get(req.params.committeeId);
 const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.body.user_id);
 if(!c||!u)fail(404,'اللجنة أو المستخدم غير موجود');
 if(!canVote(u.role))fail(400,'عضوية لجنة الإدراج مخصصة للأعضاء ورئيس اللجنة');
 db.prepare('INSERT OR IGNORE INTO committee_members(committee_id,user_id) VALUES(?,?)').run(c.id,u.id);
 audit(req.user.id,'committee.member_added',null,null,null,c.name+' : '+u.username);
 res.json({ok:true});
}));
app.post('/api/projects/:id/committee',allow('admin','engineer'),endpoint((req,res)=>{
 const p=requireProject(req);
 if(!['draft','engineering_review'].includes(p.status))fail(409,'تحديد اللجنة قبل رفع المشروع إليها');
 const c=db.prepare('SELECT * FROM committees WHERE id=?').get(req.body.committee_id);
 if(!c)fail(404,'اللجنة غير موجودة');
 db.prepare('UPDATE projects SET committee_id=? WHERE id=?').run(c.id,p.id);
 audit(req.user.id,'project.committee_assigned',p.id,p.status,p.status,c.name);
 res.json({ok:true});
}));
app.post('/api/projects/:id/waivers',allow('admin','engineer'),endpoint((req,res)=>{
 const p=requireProject(req);
 const docKey=max(req.body.doc_key,80),reason=max(req.body.reason,800);
 if(!documentByKey[docKey]||!reason)fail(400,'نوع المستند وسبب عدم الانطباق مطلوبان');
 if(documentByKey[docKey].required)fail(400,'هذا المستند إلزامي ولا يمكن اعتباره غير منطبق');
 db.prepare('INSERT INTO waivers(project_id,doc_key,reason,by_user) VALUES(?,?,?,?) ON CONFLICT(project_id,doc_key) DO UPDATE SET reason=excluded.reason,by_user=excluded.by_user').run(p.id,docKey,reason,req.user.id);
 audit(req.user.id,'document.not_applicable',p.id,p.status,p.status,docKey+': '+reason);
 res.json({ok:true});
}));
app.post('/api/projects/:id/documents',upload.single('file'),endpoint((req,res)=>{
 const p=requireProject(req);
 if(!req.file)fail(400,'اختر ملف PDF أو صورة أو DOCX أو XLSX لا يزيد عن 15MB');
 const key=max(req.body.doc_key,80);
 if(!documentByKey[key]){fs.unlinkSync(req.file.path);fail(400,'نوع المستند غير معروف');}
 const permitted=['admin','engineer','submitter','committee_chair','committee_member','contracts','opening_committee','analysis_committee','award_committee','legal','supervisor','finance','chairman'];
 if(!permitted.includes(req.user.role))fail(403,'رفع المستندات غير متاح');
 if(p.status==='completed'||p.status==='rejected')fail(409,'المشروع مغلق');
 if(req.user.role==='submitter'&&p.created_by!==req.user.id)fail(403,'رفع الملفات لصاحب المشروع');
 db.prepare('INSERT INTO documents(id,project_id,doc_key,original_name,stored_name,mime,bytes,uploaded_by) VALUES(?,?,?,?,?,?,?,?)')
 .run(id(),p.id,key,max(req.file.originalname,250),req.file.filename,req.file.mimetype,req.file.size,req.user.id);
 audit(req.user.id,'document.uploaded',p.id,p.status,p.status,key+' / '+max(req.file.originalname,180));
 res.status(201).json({ok:true});
}));
app.get('/api/documents/:docId/download',endpoint((req,res)=>{
 const d=db.prepare('SELECT * FROM documents WHERE id=?').get(req.params.docId);
 if(!d)fail(404,'الوثيقة غير موجودة');
 const filepath=path.join(uploadDir,d.stored_name);
 if(!fs.existsSync(filepath))fail(404,'ملف الوثيقة غير متوفر على القرص');
 res.download(filepath,d.original_name);
}));
app.post('/api/projects/:id/votes',endpoint((req,res)=>{
 const p=requireProject(req);
 if(p.status!=='committee_review')fail(409,'التصويت متاح عند مرحلة لجنة الإدراج فقط');
 if(!canVote(req.user.role))fail(403,'المستخدم ليس عضواً في لجنة الإدراج');
 const member=db.prepare('SELECT 1 FROM committee_members WHERE committee_id=? AND user_id=?').get(p.committee_id,req.user.id);
 if(!member)fail(403,'أنت لست عضواً في اللجنة المعينة لهذا المشروع');
 const decision=max(req.body.decision,20),note=max(req.body.note,1500);
 if(!['approve','reject'].includes(decision)||!note)fail(400,'القرار والملاحظة إلزاميان');
 try{db.prepare('INSERT INTO reviews(id,project_id,review_round,user_id,decision,note) VALUES(?,?,?,?,?,?)').run(id(),p.id,p.review_round,req.user.id,decision,note);}
 catch(e){if(e.code?.includes('CONSTRAINT'))fail(409,'سبق تسجيل تصويتك في هذه الدورة');throw e;}
 audit(req.user.id,'committee.vote.'+decision,p.id,p.status,p.status,note);
 res.json({ok:true});
}));
app.post('/api/projects/:id/actions',endpoint((req,res)=>{
 const p=requireProject(req); const action=max(req.body.action,24);const note=max(req.body.note,2000);
 const stage=stageById[p.status];
 if(!stage?.next)fail(409,'لا توجد حركة متاحة من هذه المرحلة');
 if(action==='approve'){
  if(!canAdvance(req.user.role,p.status) && !(p.status==='draft'&&req.user.role==='admin'))fail(403,'لا تملك صلاحية المصادقة على هذه المرحلة');
  if(p.status==='draft'&&req.user.role!=='admin'&&p.created_by!==req.user.id)fail(403,'تقديم المسودة لصاحب المشروع');
  const uploaded=db.prepare('SELECT DISTINCT doc_key FROM documents WHERE project_id=?').all(p.id).map(r=>r.doc_key);
  const waived=db.prepare('SELECT doc_key FROM waivers WHERE project_id=?').all(p.id).map(r=>r.doc_key);
  const missing=missingDocs(p.status,uploaded,waived);
  if(missing.length)fail(409,'مستندات مرحلة ناقصة: '+missing.map(k=>documentByKey[k]?.label||k).join('، '));
  if(p.status==='engineering_review'&&!p.committee_id)fail(409,'يجب تعيين لجنة الإدراج أولاً');
  if(p.status==='committee_review'){
   const committee=db.prepare('SELECT * FROM committees WHERE id=?').get(p.committee_id);
   if(!committee)fail(409,'لجنة المشروع غير معرفة');
   const isMember=db.prepare('SELECT 1 FROM committee_members WHERE committee_id=? AND user_id=?').get(p.committee_id,req.user.id);
   if(!isMember)fail(403,'يجب أن يكون رئيس اللجنة عضواً فيها');
   const votes=db.prepare('SELECT * FROM reviews WHERE project_id=? AND review_round=?').all(p.id,p.review_round);
   if(!committeeOutcome(votes,committee.quorum).ready)fail(409,'لم يتحقق النصاب المعتمد وموافقة أغلبية الأصوات');
  }
  if(p.status==='announcement'&&!db.prepare('SELECT 1 FROM tenders WHERE project_id=?').get(p.id))fail(409,'سجل الإعلان وتواريخه أولاً');
  if(p.status==='tendering'){
   const tender=db.prepare('SELECT * FROM tenders WHERE project_id=?').get(p.id);
   if(!tender||new Date(tender.closes_at).getTime()>Date.now())fail(409,'لا يمكن إغلاق العطاءات قبل وقت الغلق');
  }
  if(p.status==='bid_opening'&&!db.prepare('SELECT 1 FROM bids WHERE project_id=?').get(p.id))fail(409,'سجل العطاءات المستلمة أولاً');
  if(p.status==='bid_analysis'&&!db.prepare('SELECT 1 FROM bids WHERE project_id=? AND recommended=1').get(p.id))fail(409,'يجب تحديد العطاء الموصى بإحالته');
  if(p.status==='contracting'&&!db.prepare('SELECT 1 FROM contracts WHERE project_id=?').get(p.id))fail(409,'وثق العقد الموقع والمصادق عليه أولاً');
  if(p.status==='awarded'&&!hasDoc(p.id,'objections_cleared'))fail(409,'وثق انتهاء فترة الاعتراضات أو حسمها قبل توقيع العقد');
  const result=db.transaction(()=>{
   const changed=updateStatus.run(stage.next,p.id,p.status);
   if(!changed.changes)fail(409,'تغيرت حالة المشروع، أعد تحميل الصفحة');
   if(stage.next==='committee_review')db.prepare('UPDATE projects SET review_round=review_round+1 WHERE id=?').run(p.id);
   audit(req.user.id,'stage.approved',p.id,p.status,stage.next,note);
  });result();
 }else if(action==='return'||action==='reject'){
  if(!canAdvance(req.user.role,p.status))fail(403,'لا تملك صلاحية إرجاع أو رفض هذه المرحلة');
  if(note.length<8)fail(400,'يجب كتابة سبب واضح من 8 أحرف على الأقل');
  const to=action==='reject'?'rejected':previousStage(p.status);
  const result=db.transaction(()=>{
   const changed=updateStatus.run(to,p.id,p.status);
   if(!changed.changes)fail(409,'تغيرت حالة المشروع');
   if(to==='committee_review') db.prepare('UPDATE projects SET review_round=review_round+1 WHERE id=?').run(p.id);
   audit(req.user.id,'stage.'+action,p.id,p.status,to,note);
  });result();
 }else fail(400,'الإجراء غير مدعوم');
 res.json(projectDetails(p.id));
}));
app.post('/api/projects/:id/tender',allow('contracts'),endpoint((req,res)=>{
 const p=requireProject(req);
 if(!['announcement','tendering'].includes(p.status))fail(409,'الإعلان غير متاح في هذه المرحلة');
 const {tender_no,published_at,closes_at,publication_url,notes}=req.body;
 if(!tender_no||!published_at||!closes_at||new Date(closes_at)<=new Date(published_at))fail(400,'رقم الإعلان وتواريخ النشر والغلق الصحيحة مطلوبة');
 db.prepare(`INSERT INTO tenders(project_id,tender_no,published_at,closes_at,publication_url,notes) VALUES(?,?,?,?,?,?)
 ON CONFLICT(project_id) DO UPDATE SET tender_no=excluded.tender_no,published_at=excluded.published_at,closes_at=excluded.closes_at,publication_url=excluded.publication_url,notes=excluded.notes`)
 .run(p.id,max(tender_no,100),published_at,closes_at,max(publication_url,500),max(notes,1000));
 audit(req.user.id,'tender.saved',p.id,p.status,p.status,max(tender_no,100));
 res.json({ok:true});
}));
app.post('/api/projects/:id/bids',allow('contracts','opening_committee'),endpoint((req,res)=>{
 const p=requireProject(req);
 if(!['tendering','bid_opening'].includes(p.status))fail(409,'استلام العطاءات غير متاح');
 const b=req.body;
 if(!max(b.bidder,180)||!(int(b.offer_amount)>0)||!b.received_at)fail(400,'اسم مقدم العطاء والقيمة ووقت الاستلام مطلوبة');
 const tender=db.prepare('SELECT closes_at FROM tenders WHERE project_id=?').get(p.id);
 if(tender&&new Date(b.received_at)>new Date(tender.closes_at))fail(409,'العطاء بعد وقت الغلق ولا يقبل في السجل');
 db.prepare('INSERT INTO bids(id,project_id,bidder,offer_amount,received_at,compliant,note,created_by) VALUES(?,?,?,?,?,?,?,?)')
 .run(id(),p.id,max(b.bidder,180),int(b.offer_amount),b.received_at,b.compliant===false?0:1,max(b.note,900),req.user.id);
 audit(req.user.id,'bid.received',p.id,p.status,p.status,max(b.bidder,180));
 res.status(201).json({ok:true});
}));
app.post('/api/projects/:id/bids/:bidId/recommend',allow('analysis_committee'),endpoint((req,res)=>{
 const p=requireProject(req);
 if(p.status!=='bid_analysis')fail(409,'التوصية في مرحلة تحليل العطاءات فقط');
 const bid=db.prepare('SELECT * FROM bids WHERE id=? AND project_id=?').get(req.params.bidId,p.id);
 if(!bid||!bid.compliant)fail(400,'العطاء غير موجود أو غير مستجيب');
 db.transaction(()=>{
  db.prepare('UPDATE bids SET recommended=0 WHERE project_id=?').run(p.id);
  db.prepare('UPDATE bids SET recommended=1 WHERE id=?').run(bid.id);
  audit(req.user.id,'bid.recommended',p.id,p.status,p.status,bid.bidder);
 })();
 res.json({ok:true});
}));
app.post('/api/projects/:id/contract',allow('legal','contracts'),endpoint((req,res)=>{
 const p=requireProject(req);
 if(!['awarded','contracting'].includes(p.status))fail(409,'توثيق العقد غير متاح');
 const v=req.body;
 if(!max(v.contract_no,100)||!max(v.contractor,180)||!(int(v.contract_amount)>0)||!v.signed_at||!(int(v.duration_days)>0)||!max(v.approval_ref,150))fail(400,'رقم العقد والمتعاقد والمبلغ والتاريخ والمدة ومرجع المصادقة مطلوبة');
 db.prepare(`INSERT INTO contracts(project_id,contract_no,contractor,contract_amount,signed_at,duration_days,approval_ref,notes) VALUES(?,?,?,?,?,?,?,?)
 ON CONFLICT(project_id) DO UPDATE SET contract_no=excluded.contract_no,contractor=excluded.contractor,contract_amount=excluded.contract_amount,signed_at=excluded.signed_at,duration_days=excluded.duration_days,approval_ref=excluded.approval_ref,notes=excluded.notes`)
 .run(p.id,max(v.contract_no,100),max(v.contractor,180),int(v.contract_amount),v.signed_at,int(v.duration_days),max(v.approval_ref,150),max(v.notes,800));
 audit(req.user.id,'contract.saved',p.id,p.status,p.status,max(v.contract_no,100));
 res.json({ok:true});
}));
app.post('/api/projects/:id/advances',allow('supervisor'),endpoint((req,res)=>{
 const p=requireProject(req);
 if(p.status!=='execution')fail(409,'طلبات السلف بعد المباشرة فقط');
 const contract=db.prepare('SELECT * FROM contracts WHERE project_id=?').get(p.id);
 if(!contract)fail(409,'سجل العقد مطلوب');
 const amount=int(req.body.amount);const reference=max(req.body.reference,100);
 if(amount<=0||!reference)fail(400,'المبلغ والرقم المرجعي مطلوبان');
 const total=db.prepare("SELECT coalesce(sum(amount),0) n FROM advances WHERE project_id=? AND status!='rejected'").get(p.id).n;
 if(total+amount>contract.contract_amount)fail(409,'مجموع طلبات السلف يتجاوز مبلغ العقد المسجل');
 const advanceId=id();
 db.prepare('INSERT INTO advances(id,project_id,type,reference,amount,note,created_by) VALUES(?,?,?,?,?,?,?)')
 .run(advanceId,p.id,max(req.body.type,60)||'مستخلص أعمال',reference,amount,max(req.body.note,1000),req.user.id);
 audit(req.user.id,'advance.requested',p.id,p.status,p.status,reference+' / '+amount);
 res.status(201).json({id:advanceId});
}));
app.post('/api/advances/:advanceId/action',endpoint((req,res)=>{
 const a=db.prepare('SELECT * FROM advances WHERE id=?').get(req.params.advanceId);
 if(!a)fail(404,'طلب السلفة غير موجود');
 const action=max(req.body.action,30),note=max(req.body.note,1000);
 const map={
 requested:{verify_technical:['supervisor','technical_verified']},
 technical_verified:{verify_financial:['finance','financial_verified']},
 financial_verified:{authorize:['chairman','authorized']},
 authorized:{pay:['finance','paid']}
 };
 let next;
 if(action==='reject'){
  if(!['supervisor','finance','chairman'].includes(req.user.role)||['paid','rejected'].includes(a.status))fail(403,'لا يجوز رفض هذا الطلب');
  if(note.length<8)fail(400,'اكتب سبب الرفض بالتفصيل');
  next='rejected';
 }else{
  const step=map[a.status]?.[action];
  if(!step||step[0]!==req.user.role)fail(403,'الإجراء غير مخول لدورك أو لموضع السلفة');
  next=step[1];
 }
 if(action==='verify_technical'&&a.created_by===req.user.id)fail(403,'يجب أن يجري التدقيق الفني موظف آخر غير مقدم الطلب');
 const paid=next==='paid'?a.amount:0;
 db.prepare("UPDATE advances SET status=?,paid_amount=?,note=?,updated_at=datetime('now') WHERE id=?").run(next,paid,note||a.note,a.id);
 audit(req.user.id,'advance.'+action,a.project_id,null,null,a.reference+' : '+a.status+' → '+next);
 res.json({ok:true,status:next});
}));
app.get('/api/audits',allow('auditor','admin'),endpoint((req,res)=>{
 res.json(db.prepare(`SELECT a.*,u.name actor_name,p.code project_code
 FROM audits a JOIN users u ON u.id=a.actor_id LEFT JOIN projects p ON p.id=a.project_id
 ORDER BY a.created_at DESC LIMIT 250`).all());
}));
const dist=path.resolve('dist');
if(fs.existsSync(dist)){
 app.use(express.static(dist));
 app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).end();res.sendFile(path.join(dist,'index.html'));});
}
app.use((err,req,res,next)=>{
 if(err instanceof multer.MulterError) return res.status(400).json({error:'خطأ رفع الملف: '+err.message});
 if(!err.status)console.error(err);
 res.status(err.status||500).json({error:err.status?err.message:'حدث خطأ داخلي، يرجى التواصل مع مسؤول النظام'});
});
app.listen(PORT,'0.0.0.0',()=>console.log('Projects Workflow API listening on '+PORT));
