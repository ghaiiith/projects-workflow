import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

test('admin recovery creates or resets only the admin and preserves other data', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpf-admin-recovery-'));
  const databasePath = path.join(dir, 'projects.sqlite');
  try {
    const db = new Database(databasePath);
    db.exec(
      "CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, " +
      "name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);" +
      "CREATE TABLE projects (id TEXT PRIMARY KEY, title TEXT NOT NULL);" +
      "INSERT INTO projects(id,title) VALUES('project-1','Keep this project');"
    );
    db.close();

    const run = password => spawnSync(
      process.execPath,
      ['scripts/reset-admin-password.mjs'],
      {cwd:process.cwd(),env:{...process.env,DATABASE_PATH:databasePath,BOOTSTRAP_ADMIN_USERNAME:'admin',BOOTSTRAP_ADMIN_PASSWORD:password},encoding:'utf8'}
    );

    const shortPassword = run('axxaxx@@10');
    assert.equal(shortPassword.status, 1);
    assert.match(shortPassword.stderr, /at least 12/);

    const firstPassword = 'FirstAdminSafePassword!2026';
    const created = run(firstPassword);
    assert.equal(created.status, 0, created.stderr);
    assert.match(created.stdout, /Initial administrator created/);

    const updatedPassword = 'DifferentAdminSafePassword!2026';
    const updated = run(updatedPassword);
    assert.equal(updated.status, 0, updated.stderr);
    assert.match(updated.stdout, /password reset/);

    const check = new Database(databasePath);
    try {
      const admins = check.prepare("SELECT * FROM users WHERE username='admin'").all();
      assert.equal(admins.length, 1);
      assert.equal(admins[0].role, 'admin');
      assert.equal(admins[0].active, 1);
      assert.equal(bcrypt.compareSync(firstPassword, admins[0].password_hash), false);
      assert.equal(bcrypt.compareSync(updatedPassword, admins[0].password_hash), true);
      const project = check.prepare("SELECT title FROM projects WHERE id='project-1'").get();
      assert.equal(project.title, 'Keep this project');
    } finally { check.close(); }
  } finally { fs.rmSync(dir, {recursive:true,force:true}); }
});
