import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rpf-smoke-'));
const port=41792;
const url='http://127.0.0.1:'+port+'/api';
const password='SmoketestStrongP@ss2026';
const server=spawn(process.execPath,['server/index.mjs'],{
 cwd:process.cwd(),
 env:{...process.env,PORT:String(port),JWT_SECRET:crypto.randomBytes(48).toString('hex'),BOOTSTRAP_ADMIN_PASSWORD:password,DATABASE_PATH:path.join(temp,'test.sqlite'),UPLOAD_DIR:path.join(temp,'uploads')},
 stdio:['ignore','pipe','pipe']
});
let output='';
server.stdout.on('data',b=>{output+=b.toString();});
server.stderr.on('data',b=>{output+=b.toString();});

async function call(method,route,body,token){
 const headers={};
 if(token)headers.Authorization='Bearer '+token;
 if(body!==undefined && !(body instanceof FormData))headers['Content-Type']='application/json';
 const response=await fetch(url+route,{method,headers,body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});
 let value;try{value=await response.json();}catch{value={};}
 if(!response.ok)throw new Error(method+' '+route+' => '+response.status+': '+JSON.stringify(value));
 return value;
}
async function denied(method,route,body,token,status){
 const headers={'Content-Type':'application/json'};
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(url+route,{method,headers,body:JSON.stringify(body)});
 assert.equal(response.status,status,method+' '+route+' should be denied');
}
async function login(username){return (await call('POST','/auth/login',{username,password})).token;}
async function upload(projectId,key,token){
 const form=new FormData();
 form.append('doc_key',key);
 form.append('file',new Blob(['%PDF-1.4 test fixture'],{type:'application/pdf'}),key+'.pdf');
 await call('POST','/projects/'+projectId+'/documents',form,token);
}
async function advance(projectId,roleToken,note=''){
 return call('POST','/projects/'+projectId+'/actions',{action:'approve',note},roleToken);
}
async function untilReady(){
 for(let n=0;n<100;n++){
  if(server.exitCode!==null)throw new Error('server exited '+server.exitCode+'\n'+output);
  try{const r=await fetch(url+'/health');if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 throw new Error('server startup timeout\n'+output);
}

try{
 await untilReady();
 const admin=await login('admin');
 const project=await call('POST','/projects',{
  title:'إعادة تأهيل شبكة مياه القضاء التجريبي',
  governorate:'ذي قار',district:'الناصرية',
  beneficiary:'مديرية الماء',executing_entity:'جهة تنفيذية',
  sector:'ماء',summary:'مشروع ضمن اختبار المسار الداخلي',
  estimated_cost:100000000,total_cost:120000000,fiscal_year:2026
 },admin);
 assert.equal(project.status,'draft');
 await denied('POST','/projects/'+project.id+'/actions',{action:'approve'},admin,409);
 await upload(project.id,'study',admin);
 await advance(project.id,admin);
 assert.equal((await call('GET','/projects/'+project.id,undefined,admin)).status,'engineering_review');

 const targetRoles=['engineer','committee_member','committee_chair','chairman','contracts','opening_committee','analysis_committee','award_committee','legal','supervisor','finance'];
 const tokens={admin};
 for(const role of targetRoles){
  const username='test_'+role;
  await call('POST','/users',{username,name:'موظف '+role,role,password},admin);
  tokens[role]=await login(username);
 }
 await denied('POST','/projects/'+project.id+'/actions',{action:'approve'},tokens.finance,403);
 await upload(project.id,'boq',tokens.engineer);
 await upload(project.id,'drawings',tokens.engineer);
 const committee=await call('POST','/committees',{name:'لجنة الإدراج التجريبية',quorum:2},admin);
 const users=await call('GET','/users',undefined,admin);
 for(const role of ['committee_member','committee_chair']){
  const uid=users.find(u=>u.role===role).id;
  await call('POST','/committees/'+committee.id+'/members',{user_id:uid},admin);
 }
 await call('POST','/projects/'+project.id+'/committee',{committee_id:committee.id},admin);
 await advance(project.id,tokens.engineer);
 await upload(project.id,'committee_orders',admin);
 await call('POST','/projects/'+project.id+'/votes',{decision:'approve',note:'توصية فنية بالموافقة'},tokens.committee_member);
 await denied('POST','/projects/'+project.id+'/votes',{decision:'approve',note:'تصويت مكرر'},tokens.committee_member,409);
 await call('POST','/projects/'+project.id+'/votes',{decision:'approve',note:'موافقة رئيس اللجنة'},tokens.committee_chair);
 await advance(project.id,tokens.committee_chair,'محضر اللجنة رقم 1');
 await upload(project.id,'governorate_priorities',admin);
 await advance(project.id,tokens.chairman,'مصادقة الإدراج');
 assert.equal((await call('GET','/projects/'+project.id,undefined,admin)).status,'announcement');

 await call('POST','/projects/'+project.id+'/tender',{tender_no:'T-2026-001',published_at:'2020-01-01T12:00:00+03:00',closes_at:'2020-01-20T12:00:00+03:00',publication_url:'https://example.gov.iq/t-001'},tokens.contracts);
 await advance(project.id,tokens.contracts);
 await call('POST','/projects/'+project.id+'/bids',{bidder:'شركة الاختبار',offer_amount:93000000,received_at:'2020-01-15T12:00:00+03:00',compliant:true},tokens.contracts);
 await advance(project.id,tokens.contracts);
 await upload(project.id,'opening_minutes',admin);
 await advance(project.id,tokens.opening_committee);
 const afterOpening=await call('GET','/projects/'+project.id,undefined,admin);
 const bidId=afterOpening.bids[0].id;
 await call('POST','/projects/'+project.id+'/bids/'+bidId+'/recommend',{},tokens.analysis_committee);
 await upload(project.id,'analysis_report',admin);
 await advance(project.id,tokens.analysis_committee);
 await upload(project.id,'award_approval',admin);
 await advance(project.id,tokens.award_committee);
 await upload(project.id,'award_notice',admin);
 await upload(project.id,'objections_cleared',admin);
 await advance(project.id,tokens.contracts);
 await call('POST','/projects/'+project.id+'/contract',{
  contract_no:'C-2026-001',contractor:'شركة الاختبار',contract_amount:93000000,
  signed_at:'2020-03-01',duration_days:365,approval_ref:'LEGAL-001'
 },tokens.legal);
 await upload(project.id,'signed_contract',admin);
 await upload(project.id,'site_handover',admin);
 await advance(project.id,tokens.legal);
 assert.equal((await call('GET','/projects/'+project.id,undefined,admin)).status,'execution');

 const a=await call('POST','/projects/'+project.id+'/advances',{type:'مستخلص أعمال',reference:'ADV-001',amount:20000000},tokens.supervisor);
 await denied('POST','/advances/'+a.id+'/action',{action:'verify_technical'},tokens.supervisor,403);
 await call('POST','/users',{username:'test_second_supervisor',name:'مشرف تدقيق ثان',role:'supervisor',password},admin);
 const supervisor2=await login('test_second_supervisor');
 await call('POST','/advances/'+a.id+'/action',{action:'verify_technical',note:'الأعمال مثبتة'},supervisor2);
 await call('POST','/advances/'+a.id+'/action',{action:'verify_financial',note:'تم التدقيق'},tokens.finance);
 await call('POST','/advances/'+a.id+'/action',{action:'authorize',note:'موافقة'},tokens.chairman);
 await call('POST','/advances/'+a.id+'/action',{action:'pay',note:'سند اختبار'},tokens.finance);
 assert.equal((await call('GET','/projects/'+project.id,undefined,admin)).advances[0].status,'paid');
 await upload(project.id,'final_acceptance',admin);
 await advance(project.id,tokens.supervisor);
 const final=await call('GET','/projects/'+project.id,undefined,admin);
 assert.equal(final.status,'completed');
 assert.ok(final.audits.length>20);
 console.log('PASS: end-to-end project, approvals, committee votes, tender, award, contract, advance and completion.');
}catch(err){
 console.error('SMOKE TEST FAILED:',err);
 console.error(output);
 process.exitCode=1;
}finally{
 server.kill('SIGTERM');
 await new Promise(resolve=>server.once('exit',resolve));
 fs.rmSync(temp,{recursive:true,force:true});
}
