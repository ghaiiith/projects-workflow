/**
 * Realistic-looking, entirely fictional demo records for projects-workflow.
 * Run: npm run demo:seed
 * Additive, idempotent (DEMO-2026 codes), transaction-based.
 * NO real government approvals, tenders, companies or disbursements.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import {docs,stages} from '../server/workflow.mjs';

const DB=path.resolve(process.env.DATABASE_PATH||'./data/projects.sqlite');
const DIR=path.resolve(process.env.UPLOAD_DIR||'./data/uploads');
const CREDS=path.join(path.dirname(DB),'DEMO_USERS_CREDENTIALS.txt');
const MARK='DEMO / بيانات تجريبية غير حقيقية ولا تمثل مستندات أو مصروفات حكومية';
const DAY=86400000;
const now=new Date();
const uuid=()=>crypto.randomUUID();
const shift=(d,n)=>new Date(d.getTime()+DAY*n);
const sqlTime=d=>d.toISOString().replace('T',' ').slice(0,19);
const amount=n=>Math.round(n/1000000)*1000000;
const phaseIds=stages.filter(s=>!['completed','rejected'].includes(s.id)).map(s=>s.id);
const rolesForStage=Object.fromEntries(stages.map(s=>[s.id,s.role]));
const employees=[
 ['submission01','ليلى ناظم العبيدي','submitter'],['submission02','عمار فاضل التميمي','submitter'],['submission03','مريم خليل الراوي','submitter'],
 ['engineer01','حيدر كاظم الموسوي','engineer'],['engineer02','شهد علي الجبوري','engineer'],['engineer03','أحمد كريم اللامي','engineer'],
 ['member01','زينب فؤاد الخفاجي','committee_member'],['member02','حسن جبار الدليمي','committee_member'],
 ['member03','سارة عدنان الكعبي','committee_member'],['member04','محمد رائد الأسدي','committee_member'],
 ['chair01','سيف طالب الركابي','committee_chair'],['chair02','منار عبد الرزاق العباسي','committee_chair'],
 ['approver01','قاسم صبحي الساعدي','chairman'],
 ['contracts01','نور علاء الزبيدي','contracts'],['contracts02','منتظر فراس النعيمي','contracts'],
 ['opening01','رنا صادق المياحي','opening_committee'],['opening02','ليث صابر البدراني','opening_committee'],
 ['analysis01','عبد الله ناصر الطائي','analysis_committee'],['analysis02','رقية جميل الحسيني','analysis_committee'],
 ['award01','علي ماجد الحسن','award_committee'],['award02','أسماء وليد الهاشمي','award_committee'],
 ['legal01','براء أحمد الشمري','legal'],
 ['supervisor01','محمود صالح الجنابي','supervisor'],['supervisor02','فاطمة جاسم الطائي','supervisor'],['supervisor03','ضياء كريم الربيعي','supervisor'],
 ['finance01','زهراء عادل الناصري','finance'],['finance02','حسين قاسم الخزاعي','finance'],
 ['auditor01','فراس رائد الفتلاوي','auditor']
].map(([slug,name,role])=>({username:'demo_'+slug,name:name+' (تجريبي)',role}));
const committeeDefs=[
 {name:'DEMO | لجنة تدقيق مشاريع البنى التحتية',members:['demo_chair01','demo_member01','demo_member02','demo_member03']},
 {name:'DEMO | لجنة تدقيق مشاريع الماء والمجاري',members:['demo_chair02','demo_member01','demo_member03','demo_member04']},
 {name:'DEMO | لجنة تدقيق مشاريع التربية والصحة',members:['demo_chair01','demo_member02','demo_member03','demo_member04']},
 {name:'DEMO | لجنة تدقيق مشاريع الطرق والخدمات',members:['demo_chair02','demo_member01','demo_member02','demo_member04']}
];
const places=[
 ['نينوى','الموصل','حي الانتصار'],['نينوى','تلعفر','حي القادسية'],['نينوى','الحمدانية','برطلة'],
 ['صلاح الدين','تكريت','حي الجمعية'],['صلاح الدين','بيجي','حي الصناعة'],['صلاح الدين','سامراء','حي المعتصم'],
 ['الأنبار','الرمادي','حي التأميم'],['الأنبار','الفلوجة','حي الشهداء'],['الأنبار','هيت','مركز القضاء'],
 ['ديالى','بعقوبة','حي التحرير'],['ديالى','المقدادية','الوجيهية'],['ديالى','الخالص','مركز القضاء'],
 ['ذي قار','الناصرية','حي الصالحية'],['ذي قار','الشطرة','حي الزهراء'],['ذي قار','سوق الشيوخ','مركز القضاء'],
 ['المثنى','السماوة','حي الحسين'],['المثنى','الرميثة','مركز القضاء'],['المثنى','الخضر','مركز القضاء'],
 ['ميسان','العمارة','حي المعلمين'],['ميسان','المجر الكبير','مركز القضاء'],['ميسان','الكحلاء','مركز القضاء'],
 ['القادسية','الديوانية','حي الوحدة'],['القادسية','الشامية','مركز القضاء'],['القادسية','عفك','مركز القضاء'],
 ['واسط','الكوت','حي الجهاد'],['واسط','النعمانية','مركز القضاء'],['واسط','الحي','مركز القضاء'],
 ['بابل','الحلة','حي المهدية'],['بابل','الهاشمية','مركز القضاء'],['بابل','المسيب','مركز القضاء'],
 ['بغداد','المحمودية','حي السعدون'],['بغداد','أبو غريب','مركز القضاء'],['بغداد','المدائن','مركز القضاء'],
 ['كركوك','الحويجة','مركز القضاء'],['كركوك','داقوق','مركز القضاء'],
 ['البصرة','القرنة','مركز القضاء'],['البصرة','أبو الخصيب','مركز القضاء'],
 ['كربلاء','الهندية','مركز القضاء'],['النجف','الكوفة','حي ميسان'],['النجف','المناذرة','مركز القضاء']
];
const types=[
 ['ماء','تأهيل وتوسعة شبكة ماء الإسالة','مديرية الماء',1650000000,150,'زيادة طاقة شبكة التوزيع وتقليل الهدر'],
 ['صرف صحي','إنشاء شبكة مجاري أمطار ومحطات رفع','مديرية المجاري',3900000000,240,'تحسين تصريف الأمطار ومنع الفيضانات'],
 ['طرق وجسور','تأهيل وتبليط الطرق الداخلية والأرصفة','مديرية الطرق والجسور',2700000000,180,'رفع كفاءة حركة المركبات وسلامة المارة'],
 ['تربية','إضافة جناح من 12 صفاً إلى مدرسة','المديرية العامة للتربية',2200000000,210,'تقليل الدوام المزدوج والازدحام الصفي'],
 ['صحة','تأهيل مركز للرعاية الصحية الأولية','دائرة الصحة',1450000000,180,'توسيع نطاق الخدمات الصحية الأولية'],
 ['كهرباء','تطوير شبكة توزيع 11 ك.ف ونصب محولات','مديرية توزيع الكهرباء',980000000,120,'تقليل الانقطاعات ومعالجة الأحمال الزائدة'],
 ['خدمات بلدية','تأهيل الحدائق والأرصفة والإنارة','مديرية البلديات',730000000,120,'توفير مرافق خدمية عامة وتحسين البيئة الحضرية'],
 ['ماء','إنشاء مجمع ماء بطاقة إنتاجية متوسطة','مديرية الماء',4900000000,270,'توسيع تغطية مياه الشرب للأحياء قليلة الخدمة'],
 ['طرق وجسور','إكساء طريق رابط وتطوير عبارات التصريف','مديرية الطرق والجسور',6300000000,300,'تعزيز الربط بين القرى ومركز القضاء'],
 ['صرف صحي','تأهيل محطة ضخ مياه المجاري','مديرية المجاري',1350000000,160,'تقليل توقفات الضخ وتحسين كفاءة الشبكة'],
 ['تربية','تأهيل بناية مدرسية ومعالجة الرطوبة','المديرية العامة للتربية',860000000,150,'معالجة الأضرار وتأهيل القاعات والمرافق'],
 ['صحة','تطوير منظومات الأوكسجين والطاقة الاحتياطية','دائرة الصحة',1150000000,160,'زيادة جاهزية المنشآت الصحية'],
 ['خدمات بلدية','تطوير شبكة الإنارة العامة والممرات','مديرية البلديات',560000000,90,'تحسين الإنارة والسلامة على الطرق'],
 ['طرق وجسور','إنشاء عبارة صندوقية ومعالجة المقتربات','مديرية الطرق والجسور',1180000000,135,'رفع كفاءة تصريف المياه ومعالجة الاختناقات']
];
const projectStatuses=[
 ...Array(7).fill('draft'),...Array(7).fill('engineering_review'),
 ...Array(6).fill('committee_review'),...Array(5).fill('planning_approval'),
 ...Array(5).fill('announcement'),...Array(6).fill('tendering'),
 ...Array(4).fill('bid_opening'),...Array(5).fill('bid_analysis'),
 ...Array(3).fill('award_approval'),...Array(3).fill('awarded'),
 ...Array(4).fill('contracting'),...Array(7).fill('execution'),
 ...Array(4).fill('completed'),...Array(3).fill('rejected')
];
const companies=[
 'شركة أفق البناء (افتراضية)','شركة دجلة للمقاولات (افتراضية)',
 'شركة الفرات الهندسية (افتراضية)','شركة الرافدين للبنى التحتية (افتراضية)',
 'شركة نخيل الجنوب (افتراضية)','شركة المعمار المتقدم (افتراضية)',
 'شركة النهرين للتشييد (افتراضية)','شركة إشراق الهندسية (افتراضية)',
 'شركة عطاء العمران (افتراضية)','شركة الازدهار الإنشائية (افتراضية)'
];

function demoPDF(code,key,index) {
 const text=[
  'DEMO DOCUMENT - NOT AN OFFICIAL GOVERNMENT RECORD',
  'SYNTHETIC DATA FOR SOFTWARE TESTING ONLY',
  'Project code: '+code,
  'Document type: '+key,
  'Sample reference: DEMO/'+index+'/'+key,
  'No actual government approval, contractor agreement or payment.',
  'This PDF is generated automatically for interface demonstrations.'
 ];
 const quote=s=>s.replace(/[\\()]/g,'\\$&');
 const stream='BT /F1 13 Tf 42 750 Td '+text.map((line,i)=>(i?'0 -29 Td ':'')+'('+quote(line)+') Tj').join('\n')+' ET';
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length '+Buffer.byteLength(stream,'ascii')+' >>\nstream\n'+stream+'\nendstream'
 ];
 let output='%PDF-1.4\n';
 const positions=[0];
 for(let i=0;i<objects.length;i++){
  positions.push(Buffer.byteLength(output,'ascii'));
  output+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';
 }
 const xref=Buffer.byteLength(output,'ascii');
 output+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+positions.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
 output+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 return Buffer.from(output,'ascii');
}

function fail(msg){console.error('DEMO SEED ERROR: '+msg);process.exitCode=1;}
if(!fs.existsSync(DB)){fail('قاعدة البيانات غير موجودة؛ شغّل npm run dev أولاً.');}
else if(process.env.NODE_ENV==='production'){fail('لا يسمح بتعبئة DEMO في وضع الإنتاج.');}
else {
 fs.mkdirSync(DIR,{recursive:true});
 const db=new Database(DB,{fileMustExist:true,timeout:15000});
 db.pragma('foreign_keys=ON');
 db.pragma('busy_timeout=15000');
 const files=[];
 let wroteCredentials=false;
 const tally={projects:0,skipped:0,users:0,committees:0,documents:0,reviews:0,tenders:0,bids:0,contracts:0,advances:0,audits:0};
 try {
  const required=['users','projects','committees','committee_members','documents','reviews','audits','tenders','bids','contracts','advances'];
  for(const table of required)
   if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))
    throw new Error('جدول مفقود: '+table+'؛ شغّل المشروع بالإصدار الأخير.');
  const originalCount=db.prepare("SELECT count(*) n FROM users WHERE username LIKE 'demo_%'").get().n;
  const password=crypto.randomBytes(24).toString('base64url');
  if(originalCount===0 && !fs.existsSync(CREDS)){
   const lines=[
    'LOCAL SYNTHETIC DEMO ACCOUNTS. DO NOT USE FOR REAL GOVERNMENT WORK.',
    'All newly created demo accounts use this password: '+password,
    'Admin password was not changed.',
    '',
    ...employees.map(u=>u.username+' | '+u.role+' | '+u.name)
   ];
   fs.writeFileSync(CREDS,lines.join('\r\n')+'\r\n',{flag:'wx',mode:0o600});
   wroteCredentials=true;
  }
  const userNames=employees.map(u=>u.username);
  if(originalCount>0 && !fs.existsSync(CREDS) && userNames.some(username=>!db.prepare('SELECT 1 FROM users WHERE username=?').get(username)))
   throw new Error('حسابات DEMO سابقة بلا ملف بيانات دخول وبعض الحسابات ناقصة؛ العملية توقفت دون مساس بالموجود.');
  const auditSt=db.prepare('INSERT INTO audits(id,project_id,actor_id,action,from_status,to_status,details,created_at) VALUES(?,?,?,?,?,?,?,?)');
  const writeAudit=(p,actor,action,from,to,note,when)=>{
   auditSt.run(uuid(),p,actor,action,from,to,MARK+' | '+note,sqlTime(when));tally.audits++;
  };
  const docSt=db.prepare('INSERT INTO documents(id,project_id,doc_key,original_name,stored_name,mime,bytes,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?,?)');
  const projectSt=db.prepare('INSERT INTO projects(id,code,title,governorate,district,beneficiary,executing_entity,sector,summary,estimated_cost,total_cost,fiscal_year,procurement_method,status,committee_id,review_round,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const reviewSt=db.prepare('INSERT INTO reviews(id,project_id,review_round,user_id,decision,note,created_at) VALUES(?,?,?,?,?,?,?)');
  const bidSt=db.prepare('INSERT INTO bids(id,project_id,bidder,offer_amount,received_at,compliant,recommended,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)');
  const advanceSt=db.prepare('INSERT INTO advances(id,project_id,type,reference,amount,paid_amount,status,note,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  const roleUser=(role,i=0)=>{
   const rows=db.prepare("SELECT id FROM users WHERE username LIKE 'demo_%' AND role=? ORDER BY username").all(role);
   if(!rows.length)throw new Error('حساب دور DEMO غير موجود: '+role);
   return rows[i%rows.length].id;
  };
  const byUsername=username=>{
   const user=db.prepare('SELECT * FROM users WHERE username=?').get(username);
   if(!user)throw new Error('مستخدم DEMO مفقود: '+username);
   return user.id;
  };
  const addDoc=(p,code,key,idx,who,when)=>{
   const type=docs.find(d=>d.key===key);
   if(!type)throw new Error('نوع الوثيقة غير معروف: '+key);
   const blob=demoPDF(code,key,idx+1);
   const stored='demo_'+uuid()+'.pdf';
   const dest=path.join(DIR,stored);
   fs.writeFileSync(dest,blob,{flag:'wx'});
   files.push(dest);
   docSt.run(uuid(),p,key,'DEMO - '+type.label+'.pdf',stored,'application/pdf',blob.byteLength,who,sqlTime(when));
   tally.documents++;
   writeAudit(p,who,'document.uploaded',null,null,'وثيقة تجريبية '+key,when);
  };
  const run=db.transaction(()=>{
   for(const user of employees){
    const row=db.prepare('SELECT role FROM users WHERE username=?').get(user.username);
    if(row){if(row.role!==user.role)throw new Error('دور الحساب '+user.username+' تغير؛ لن أعدله.');continue;}
    if(originalCount>0)throw new Error('مستخدم تجريبي مفقود في تشغيل لاحق؛ حماية لبيانات دخول الحسابات الموجودة.');
    db.prepare('INSERT INTO users(id,username,name,role,password_hash) VALUES(?,?,?,?,?)')
      .run(uuid(),user.username,user.name,user.role,bcrypt.hashSync(password,10));
    tally.users++;
   }
   for(const def of committeeDefs){
    let c=db.prepare('SELECT id FROM committees WHERE name=?').get(def.name);
    if(!c){
     const cid=uuid();
     db.prepare('INSERT INTO committees(id,name,quorum) VALUES(?,?,?)').run(cid,def.name,2);
     c={id:cid};tally.committees++;
    }
    for(const username of def.members)
     db.prepare('INSERT OR IGNORE INTO committee_members(committee_id,user_id) VALUES(?,?)').run(c.id,byUsername(username));
   }
   for(let i=0;i<projectStatuses.length;i++){
    const status=projectStatuses[i],code='DEMO-2026-'+String(i+1).padStart(4,'0');
    if(db.prepare('SELECT 1 FROM projects WHERE code=?').get(code)){tally.skipped++;continue;}
    const [province,district,area]=places[(i*17+Math.floor(i/6))%places.length];
    const [sector,kind,beneficiary,baseline,duration,purpose]=types[(i*5+Math.floor(i/8))%types.length];
    const rank=status==='completed'?12:status==='rejected'?1+i%4:phaseIds.indexOf(status);
    if(rank<0)throw new Error('حالة غير معروفة: '+status);
    const start=shift(now,-(4+i%16+rank*11));
    const when=n=>shift(start,n*11);
    const committeeDef=committeeDefs[i%committeeDefs.length];
    const committee=db.prepare('SELECT id FROM committees WHERE name=?').get(committeeDef.name);
    const p=uuid(),author=roleUser('submitter',i),eng=roleUser('engineer',i);
    const estimate=amount(baseline*(0.84+(i%9)*0.062)),total=amount(estimate*(1.08+(i%3)*0.022));
    projectSt.run(p,code,'[DEMO] '+kind+' في '+area+' / '+district,province,district,
      beneficiary+' / '+province,'مديرية المشاريع / '+province+' (افتراضية)',sector,
      MARK+'؛ '+purpose+'؛ الموقع: '+area+' / '+district+' / '+province+
      '؛ يتضمن إعداد الكشف الموقعي وجداول الكميات والتصاميم والتدقيق الفني والتعاقد والمتابعة. جميع التفاصيل للتجربة.',
      estimate,total,2026,'مناقصة عامة',status,committee.id,rank>=2?1:0,author,sqlTime(start),sqlTime(when(rank)));
    tally.projects++;
    writeAudit(p,author,'project.created',null,'draft','فتح استمارة إدراج تجريبية',start);
    const mandatory=new Set(['study','boq','drawings','committee_orders','governorate_priorities','opening_minutes','analysis_report','award_approval','award_notice','objections_cleared','signed_contract','site_handover','final_acceptance']);
    const planned=[
     ['study',0],['ownership',1],['conflicts',1],['boq',1],['drawings',1],
     ['committee_orders',2],['governorate_priorities',3],['planning_letter',4],
     ['tender_announcement',4],['opening_minutes',6],['analysis_report',7],
     ['award_approval',8],['award_notice',9],['objections_cleared',9],
     ['signed_contract',10],['site_handover',10],
     ['advance_certificate',11],['final_acceptance',12]
    ];
    for(const [key,pos] of planned){
     if(pos>rank)continue;
     if(status!=='completed'&&pos===rank&&mandatory.has(key)&&i%3===0)continue;
     if(!mandatory.has(key)&&i%5===0&&key!=='advance_certificate')continue;
     const who=pos<2?eng:pos<5?roleUser('contracts',i):pos<9?roleUser('analysis_committee',i):pos<11?roleUser('legal',i):roleUser('supervisor',i);
     addDoc(p,code,key,i,who,shift(when(Math.min(pos,rank)),-1));
    }
    const extra=sector==='ماء'?['water_share','environment_report','environment_approval']:
      sector==='طرق وجسور'?['aerial','soil','land_clearance']:
      ['تربية','صحة','صرف صحي'].includes(sector)?['soil','environment_report','land_clearance']:[];
    if(rank>=2)for(const key of extra)if((i+key.length)%4!==0)addDoc(p,code,key,i,eng,shift(when(1),2));
    for(let stage=0;stage<rank;stage++){
     const from=phaseIds[stage],to=phaseIds[stage+1]||'completed';
     const who=from==='draft'?author:roleUser(rolesForStage[from]||'supervisor',i);
     writeAudit(p,who,'stage.approved',from,to,'قرار تجريبي رقم DEMO/'+code+'/DEC-'+(stage+1),when(stage+1));
    }
    if(status==='rejected')
     writeAudit(p,roleUser(rolesForStage[phaseIds[rank]]||'engineer',i),'stage.reject',phaseIds[rank],'rejected','رفض تجريبي لوجود نواقص فنية افتراضية',shift(when(rank),1));
    if(rank>=2){
     const members=committeeDef.members;
     const chair=members.find(x=>x.includes('chair'));
     const other=members.find(x=>x!==chair);
     const votes=rank===2?[{username:other,decision:'approve'}]:[
      {username:other,decision:'approve'},{username:chair,decision:'approve'}
     ];
     if(rank>2 && i%6===0)votes.push({username:members.find(x=>x!==chair&&x!==other),decision:'reject'});
     for(const [j,v] of votes.entries()){
      const who=byUsername(v.username);
      const note=MARK+' | '+(v.decision==='approve'?'الموافقة على البيانات والمرفقات بعد التدقيق الأولي':'وجود تحفظات فنية على بعض البنود');
      reviewSt.run(uuid(),p,1,who,v.decision,note,sqlTime(shift(when(2),j-1)));
      tally.reviews++;
      writeAudit(p,who,'committee.vote.'+v.decision,'committee_review','committee_review',note,shift(when(2),j-1));
     }
    }
    let recommended=null;
    if(rank>=4){
     const publish=shift(when(4),-2);
     const closes=status==='tendering'?shift(now,6+i%13):shift(publish,18);
     const tenderNo='DEMO/T/2026/'+String(i+1).padStart(3,'0');
     db.prepare('INSERT INTO tenders(project_id,tender_no,published_at,closes_at,publication_url,notes) VALUES(?,?,?,?,?,?)')
       .run(p,tenderNo,publish.toISOString(),closes.toISOString(),'',MARK+'؛ رقم وإعلان افتراضي غير منشور رسمياً');
     tally.tenders++;
     writeAudit(p,roleUser('contracts',i),'tender.saved','announcement','tendering','رقم مناقصة تجريبي: '+tenderNo,publish);
     if(rank>=5){
      const count=rank===5?1+i%2:3+i%3;
      for(let j=0;j<count;j++){
       const company=companies[(i*3+j)%companies.length];
       const offer=amount(estimate*(0.87+j*0.036+i%3*0.015));
       const compliant=j!==(count-1)||count===1;
       const selected=rank>=7&&j===1;
       const received=shift(publish,3+j*2);
       bidSt.run(uuid(),p,company,offer,received.toISOString(),compliant?1:0,selected?1:0,
        MARK+' | عرض فني وتجاري افتراضي',roleUser('contracts',i),sqlTime(received));
       tally.bids++;
       writeAudit(p,roleUser('contracts',i),'bid.received','tendering','tendering','استلام عطاء تجريبي من '+company,received);
       if(j===1||(count===1&&j===0))recommended={company,offer};
      }
     }
    }
    if(rank>=7&&recommended)
     writeAudit(p,roleUser('analysis_committee',i),'bid.recommended','bid_analysis','bid_analysis','توصية إحالة تجريبية إلى '+recommended.company,when(7));
    if(rank>=10){
     const contractor=recommended?.company||companies[i%companies.length];
     const contractValue=recommended?.offer||amount(estimate*0.94);
     const contractNo='DEMO/C/2026/'+String(i+1).padStart(4,'0');
     db.prepare('INSERT INTO contracts(project_id,contract_no,contractor,contract_amount,signed_at,duration_days,approval_ref,notes) VALUES(?,?,?,?,?,?,?,?)')
      .run(p,contractNo,contractor,contractValue,when(10).toISOString().slice(0,10),duration,'DEMO/APR/'+(i+1),MARK+'؛ لا يمثل عقداً حقيقياً');
     tally.contracts++;
     writeAudit(p,roleUser('legal',i),'contract.saved','contracting','contracting','عقد تجريبي رقم '+contractNo,when(10));
     if(rank>=11){
      const count=status==='completed'?4:2+i%3;
      const fractions=[0.15,0.21,0.18,0.17,0.11];
      const states=['requested','technical_verified','financial_verified','authorized','paid','rejected'];
      for(let j=0;j<count;j++){
       const amountAdvance=amount(contractValue*fractions[j]);
       const ref='DEMO/ADV/'+(i+1)+'/'+(j+1);
       const state=status==='completed'?'paid':states[(i+j)%states.length];
       const paid=state==='paid'?amountAdvance:0;
       const opened=shift(when(11),j*2);
       advanceSt.run(uuid(),p,j===0?'سلفة مقدمة':'مستخلص أعمال رقم '+j,ref,amountAdvance,paid,state,
        MARK+' | القيم افتراضية وغير خاضعة لاحتساب استقطاعات حقيقي',
        roleUser('supervisor',i),sqlTime(opened),sqlTime(shift(opened,4)));
       tally.advances++;
       writeAudit(p,roleUser('supervisor',i),'advance.requested',null,null,'طلب سلفة تجريبي '+ref,opened);
       const route=[['technical_verified','supervisor','advance.verify_technical'],['financial_verified','finance','advance.verify_financial'],['authorized','chairman','advance.authorize'],['paid','finance','advance.pay']];
       const limit=route.findIndex(x=>x[0]===state);
       for(let k=0;k<=limit;k++){
        const [stateName,role,action]=route[k];
        writeAudit(p,roleUser(role,role==='supervisor'?i+1:i),action,null,null,'إجراء تجريبي على '+ref+' / '+stateName,shift(opened,1+k));
       }
       if(state==='rejected')writeAudit(p,roleUser('finance',i),'advance.reject',null,null,'رفض تجريبي لنقص مستندات مستخلص',shift(opened,3));
      }
     }
    }
   }
  });
  run();
  console.log('\n======== DEMO DATASET / بيانات افتراضية ========');
  console.log('المشاريع الجديدة: '+tally.projects+' | تخطي المشاريع الموجودة: '+tally.skipped);
  console.log('المستخدمون: '+tally.users+' | اللجان: '+tally.committees);
  console.log('الوثائق PDF: '+tally.documents+' | التصويتات: '+tally.reviews);
  console.log('المناقصات: '+tally.tenders+' | العطاءات: '+tally.bids+' | العقود: '+tally.contracts);
  console.log('السلف: '+tally.advances+' | سجلات التدقيق: '+tally.audits);
  console.log('بيانات دخول الموظفين التجريبيين محفوظة محلياً هنا:\n'+CREDS);
  console.log('حساب admin وكلمة مروره لم يتم تغييرهما.');
  console.log('أعد تحميل صفحة النظام Ctrl+F5.');
  console.log('==============================================\n');
 }catch(err){
  for(const f of files)try{fs.unlinkSync(f);}catch{}
  if(wroteCredentials)try{fs.unlinkSync(CREDS);}catch{}
  fail('تراجعت قاعدة البيانات عن هذه المحاولة: '+err.message);
 }finally{db.close();}
}
