/**
 * Local recovery utility: creates the FIRST admin or resets the password
 * of the configured existing admin. Does not delete or replace any data.
 *
 * Usage:
 *   node --env-file=.env scripts/reset-admin-password.mjs
 *
 * Run only from a trusted local terminal with access to the database.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

function fail(message) {
  console.error('ADMIN RECOVERY ERROR: ' + message);
  process.exit(1);
}

const username = (process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin').trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
const databasePath = path.resolve(process.env.DATABASE_PATH || './data/projects.sqlite');

if (!/^[a-zA-Z0-9_.-]{3,60}$/.test(username)) {
  fail('Set a valid BOOTSTRAP_ADMIN_USERNAME in .env (3-60 Latin characters).');
}
if (password.length < 12) {
  fail('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters. Edit .env first.');
}
if (!fs.existsSync(databasePath)) {
  fail('Database not found at ' + databasePath + '. Start the API once, then rerun this command. No database was created.');
}

const db = new Database(databasePath, { fileMustExist: true, timeout: 5000 });
try {
  const table = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!table) fail('Existing database has no users table. No changes were made.');

  const hash = bcrypt.hashSync(password, 12);
  const result = db.transaction(() => {
    const existing = db.prepare('SELECT id, role FROM users WHERE username = ?').get(username);
    if (existing) {
      if (existing.role !== 'admin') {
        throw new Error('The configured username belongs to a non-admin user. No changes were made.');
      }
      db.prepare('UPDATE users SET password_hash = ?, active = 1 WHERE id = ?').run(hash, existing.id);
      return 'updated';
    }
    const adminCount = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count;
    if (adminCount > 0) {
      throw new Error('An administrator already exists under another username. Check BOOTSTRAP_ADMIN_USERNAME. No changes were made.');
    }
    db.prepare('INSERT INTO users(id, username, name, role, password_hash, active) VALUES(?,?,?,?,?,1)')
      .run(crypto.randomUUID(), username, 'مدير المنظومة', 'admin', hash);
    return 'created';
  })();
  console.log(result === 'created'
    ? 'SUCCESS: Initial administrator created. Other records were preserved.'
    : 'SUCCESS: Administrator password reset and account activated. Other records were preserved.');
  console.log('Username: ' + username);
  console.log('The password was not printed.');
} catch (err) {
  fail(err.message);
} finally {
  db.close();
}
