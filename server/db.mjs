import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const file=path.resolve(process.env.DATABASE_PATH || './data/projects.sqlite');
fs.mkdirSync(path.dirname(file),{recursive:true});
export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(String.raw`
CREATE TABLE IF NOT EXISTS users(
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 role TEXT NOT NULL, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS committees(
 id TEXT PRIMARY KEY, name TEXT NOT NULL, quorum INTEGER NOT NULL DEFAULT 2
);
CREATE TABLE IF NOT EXISTS committee_members(
 committee_id TEXT NOT NULL REFERENCES committees(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 PRIMARY KEY (committee_id,user_id)
);
CREATE TABLE IF NOT EXISTS projects(
 id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
 governorate TEXT NOT NULL, district TEXT NOT NULL, beneficiary TEXT NOT NULL,
 executing_entity TEXT DEFAULT '', sector TEXT DEFAULT 'خدمات', summary TEXT DEFAULT '',
 estimated_cost REAL NOT NULL, total_cost REAL NOT NULL, fiscal_year INTEGER NOT NULL,
 procurement_method TEXT NOT NULL DEFAULT 'مناقصة عامة',
 status TEXT NOT NULL DEFAULT 'draft', committee_id TEXT REFERENCES committees(id),
 review_round INTEGER NOT NULL DEFAULT 0,
 created_by TEXT NOT NULL REFERENCES users(id), version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS documents(
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 doc_key TEXT NOT NULL, original_name TEXT NOT NULL,
 stored_name TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
 uploaded_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS waivers(
 project_id TEXT NOT NULL REFERENCES projects(id),doc_key TEXT NOT NULL,
 reason TEXT NOT NULL, by_user TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 PRIMARY KEY(project_id,doc_key)
);
CREATE TABLE IF NOT EXISTS reviews(
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 review_round INTEGER NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
 decision TEXT NOT NULL, note TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(project_id,review_round,user_id)
);
CREATE TABLE IF NOT EXISTS audits(
 id TEXT PRIMARY KEY, project_id TEXT, actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL, from_status TEXT, to_status TEXT,
 details TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tenders(
 project_id TEXT PRIMARY KEY REFERENCES projects(id),
 tender_no TEXT NOT NULL, published_at TEXT NOT NULL, closes_at TEXT NOT NULL,
 publication_url TEXT DEFAULT '', notes TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS bids(
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 bidder TEXT NOT NULL, offer_amount REAL NOT NULL, received_at TEXT NOT NULL,
 compliant INTEGER NOT NULL DEFAULT 1, recommended INTEGER NOT NULL DEFAULT 0,
 note TEXT DEFAULT '', created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contracts(
 project_id TEXT PRIMARY KEY REFERENCES projects(id),
 contract_no TEXT NOT NULL, contractor TEXT NOT NULL, contract_amount REAL NOT NULL,
 signed_at TEXT NOT NULL, duration_days INTEGER NOT NULL,
 approval_ref TEXT NOT NULL, notes TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS advances(
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 type TEXT NOT NULL, reference TEXT NOT NULL, amount REAL NOT NULL,
 paid_amount REAL DEFAULT 0, status TEXT NOT NULL DEFAULT 'requested',
 note TEXT DEFAULT '', created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_docs_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_audits_project ON audits(project_id);
CREATE INDEX IF NOT EXISTS idx_advances_project ON advances(project_id);
`);

const adminCount=db.prepare("SELECT count(*) as n FROM users WHERE role='admin'").get().n;
if (!adminCount) {
 const username=process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin';
 const password=process.env.BOOTSTRAP_ADMIN_PASSWORD;
 if(password && password.length>=12){
  db.prepare('INSERT INTO users(id,username,name,role,password_hash) VALUES(?,?,?,?,?)')
    .run(crypto.randomUUID(),username,'مدير المنظومة','admin',bcrypt.hashSync(password,12));
  console.log('Initial administrator created from environment.');
 } else {
  console.warn('SECURITY SETUP: supply BOOTSTRAP_ADMIN_PASSWORD (12+ chars) to create the first administrator.');
 }
}
export const id=()=>crypto.randomUUID();
export const now=()=>new Date().toISOString();
export function audit(actor,action,projectId=null,from=null,to=null,details=''){
 db.prepare('INSERT INTO audits(id,project_id,actor_id,action,from_status,to_status,details) VALUES(?,?,?,?,?,?,?)')
   .run(id(),projectId,actor,action,from,to,details);
}
export function projectDetails(projectId){
 const project=db.prepare(`SELECT p.*,u.name AS creator_name,c.name AS committee_name
 FROM projects p JOIN users u ON u.id=p.created_by
 LEFT JOIN committees c ON c.id=p.committee_id WHERE p.id=?`).get(projectId);
 if(!project) return null;
 return {...project,
  documents:db.prepare('SELECT d.*,u.name AS uploader_name FROM documents d JOIN users u ON u.id=d.uploaded_by WHERE d.project_id=? ORDER BY d.created_at DESC').all(projectId),
  waivers:db.prepare('SELECT * FROM waivers WHERE project_id=?').all(projectId),
  reviews:db.prepare('SELECT r.*,u.name AS reviewer_name FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.project_id=? ORDER BY r.created_at DESC').all(projectId),
  tender:db.prepare('SELECT * FROM tenders WHERE project_id=?').get(projectId)||null,
  bids:db.prepare('SELECT * FROM bids WHERE project_id=? ORDER BY received_at DESC').all(projectId),
  contract:db.prepare('SELECT * FROM contracts WHERE project_id=?').get(projectId)||null,
  advances:db.prepare('SELECT a.*,u.name AS requested_by FROM advances a JOIN users u ON u.id=a.created_by WHERE a.project_id=? ORDER BY a.created_at DESC').all(projectId),
  audits:db.prepare('SELECT a.*,u.name AS actor_name FROM audits a JOIN users u ON u.id=a.actor_id WHERE a.project_id=? ORDER BY a.created_at DESC').all(projectId)
 };
}
