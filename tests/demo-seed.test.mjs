import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import Database from 'better-sqlite3';

test('realistic synthetic dataset seeds all modules and is idempotent', {timeout:120000}, () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rpf-demo-'));
 const dbFile=path.join(dir,'projects.sqlite'),uploadDir=path.join(dir,'uploads');
 const env={...process.env,DATABASE_PATH:dbFile,UPLOAD_DIR:uploadDir,BOOTSTRAP_ADMIN_PASSWORD:'TestingStrongOnly!2026',BOOTSTRAP_ADMIN_USERNAME:'admin',NODE_ENV:'development'};
 const run=(args)=>spawnSync(process.execPath,args,{cwd:process.cwd(),env,encoding:'utf8',timeout:110000});
 try{
  const init=run(['-e',"import('./server/db.mjs')"]);
  assert.equal(init.status,0,init.stderr);
  const first=run(['scripts/seed-demo.mjs']);
  assert.equal(first.status,0,first.stderr+'\n'+first.stdout);
  const db=new Database(dbFile,{fileMustExist:true});
  try{
   const count=table=>db.prepare('SELECT count(*) n FROM '+table).get().n;
   assert.equal(db.prepare("SELECT count(*) n FROM projects WHERE code LIKE 'DEMO-2026-%'").get().n,69);
   assert.ok(count('users')>=29);
   assert.ok(count('documents')>500);
   assert.ok(count('reviews')>30);
   assert.ok(count('tenders')>20);
   assert.ok(count('bids')>30);
   assert.ok(count('contracts')>=10);
   assert.ok(count('advances')>15);
   assert.ok(count('audits')>500);
   assert.equal(db.prepare("SELECT count(*) n FROM projects WHERE status='completed'").get().n,4);
   assert.equal(db.prepare("SELECT count(*) n FROM projects WHERE status='rejected'").get().n,3);
   const document=db.prepare("SELECT stored_name FROM documents LIMIT 1").get();
   assert.ok(document);
   assert.equal(fs.readFileSync(path.join(uploadDir,document.stored_name)).subarray(0,8).toString(),'%PDF-1.4');
   const adminBefore=db.prepare("SELECT password_hash FROM users WHERE username='admin'").get().password_hash;
   const snapshot=['users','projects','documents','tenders','bids','advances','audits','contracts'].map(count);
   const second=run(['scripts/seed-demo.mjs']);
   assert.equal(second.status,0,second.stderr+'\n'+second.stdout);
   assert.deepEqual(['users','projects','documents','tenders','bids','advances','audits','contracts'].map(count),snapshot);
   assert.equal(db.prepare("SELECT password_hash FROM users WHERE username='admin'").get().password_hash,adminBefore);
   const creds=fs.readFileSync(path.join(dir,'DEMO_USERS_CREDENTIALS.txt'),'utf8');
   assert.match(creds,/demo_engineer01/);
   assert.match(creds,/All newly created demo accounts use this password/);
  }finally{db.close();}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
