import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(import.meta.dirname, '../../database/manual-sql');
const files = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort();

// Statements are split on ';' after comments are removed.
const statements = (sql) =>
  sql
    .replace(/--.*$/gm, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim().toLowerCase())
    .filter(Boolean);

// The migrations must stay additive: they may only create NEW appointment_* tables (and enable RLS on those new tables).
// Anything that could touch existing data or structure - drop, truncate, delete, update, insert, alter of an existing
// table, creating indexes/constraints on existing tables - fails this test.
const ALLOWED = [
  /^create table if not exists appointment_(contacts|slot_locks) \(.+\)$/,
  /^alter table appointment_(contacts|slot_locks) enable row level security$/,
];

test('there are migration files', () => {
  assert.deepEqual(files, ['001_appointment_contacts.sql', '002_appointment_slot_locks.sql']);
});

for (const file of files) {
  test(`${file} only adds new tables and never changes existing data or structure`, () => {
    const parsed = statements(readFileSync(path.join(dir, file), 'utf8'));
    assert.ok(parsed.length > 0);
    for (const statement of parsed) {
      assert.ok(ALLOWED.some((re) => re.test(statement)), `not allowed in an additive-only migration: ${statement.slice(0, 80)}`);
    }
    const text = parsed.join(' ');
    // ("on delete cascade" inside the new tables' foreign keys is fine; it only affects rows of those new tables.)
    for (const banned of [/\bdrop\b/, /\btruncate\b/, /\bdelete from\b/, /\bupdate \w+ set\b/, /\binsert into\b/, /\balter column\b/, /\badd column\b/, /\bcreate (unique )?index\b/]) {
      assert.ok(!banned.test(text), `contains ${banned}`);
    }
  });

  test(`${file} is safe to re-run and never blocks deletes on appointments`, () => {
    const sql = readFileSync(path.join(dir, file), 'utf8').toLowerCase();
    assert.match(sql, /create table if not exists/);
    assert.match(sql, /references appointments \(id\) on delete cascade/);
  });
}

// ---- Merging must never change the database -------------------------------------------------------------------
// Supabase's GitHub integration applies everything in supabase/migrations/ on merge, and anything that runs SQL from
// CI or a deploy script would do the same. None of that may exist.
const root = path.resolve(import.meta.dirname, '../..');

function sqlFilesOutsideManualFolder(folder = root, found = []) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next'].includes(entry.name)) continue;
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) sqlFilesOutsideManualFolder(full, found);
    else if (entry.name.endsWith('.sql') && !full.startsWith(dir + path.sep)) found.push(path.relative(root, full));
  }
  return found;
}

test('no folder or config that Supabase would auto-apply on merge', () => {
  assert.equal(existsSync(path.join(root, 'supabase', 'migrations')), false, 'supabase/migrations must not exist');
  assert.equal(existsSync(path.join(root, 'supabase', 'config.toml')), false, 'supabase/config.toml must not exist');
});

test('the check files in database/manual-sql/checks are read-only (a single SELECT each)', () => {
  const checksDir = path.join(dir, 'checks');
  const checkFiles = readdirSync(checksDir).filter((name) => name.endsWith('.sql')).sort();
  assert.deepEqual(checkFiles, ['00_pre_check.sql', '01_after_001.sql', '02_after_002.sql', '99_final_check.sql']);
  for (const file of checkFiles) {
    const parsed = statements(readFileSync(path.join(checksDir, file), 'utf8'));
    assert.equal(parsed.length, 1, `${file} must be exactly one statement (the Supabase editor only shows the last result)`);
    assert.match(parsed[0], /^(with|select)\b/, `${file} must start with with/select`);
    // Text inside quotes is only a label (e.g. 'ON DELETE CASCADE'), so look at the SQL outside string literals.
    const code = parsed[0].replace(/'(?:[^']|'')*'/g, "''");
    for (const banned of [/\bdrop\b/, /\btruncate\b/, /\bdelete\b/, /\binsert\b/, /\bupdate\b/, /\balter\b/, /\bcreate\b/, /\bgrant\b/, /\brevoke\b/, /\bcomment on\b/, /\bcopy\b/, /\bdo \$/]) {
      assert.ok(!banned.test(code), `${file} contains ${banned}`);
    }
  }
});

test('SQL files exist only in database/manual-sql', () => {
  assert.deepEqual(sqlFilesOutsideManualFolder(), []);
});

test('no CI workflow or npm script runs SQL or migrations', () => {
  const runsSql = /supabase\s+(db|migration|link)|db\s+push|\bpsql\b|\bmigrat|pg_dump|prisma|knex|flyway|alembic/i;
  const workflows = path.join(root, '.github', 'workflows');
  const texts = existsSync(workflows)
    ? readdirSync(workflows).map((name) => [`.github/workflows/${name}`, readFileSync(path.join(workflows, name), 'utf8')])
    : [];
  for (const manifest of ['package.json', 'backend/package.json', 'frontend/package.json']) {
    const scripts = JSON.parse(readFileSync(path.join(root, manifest), 'utf8')).scripts ?? {};
    texts.push([`${manifest} scripts`, Object.values(scripts).join('\n')]);
  }
  for (const [name, text] of texts) assert.ok(!runsSql.test(text), `${name} runs SQL or migrations`);
});

test('backend code never executes DDL or raw SQL', () => {
  const runBackend = (folder, found = []) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (['node_modules', 'tests'].includes(entry.name)) continue;
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) runBackend(full, found);
      else if (entry.name.endsWith('.js')) found.push(full);
    }
    return found;
  };
  const risky = /\.rpc\(|\bcreate\s+table\b|\balter\s+table\b|\bdrop\s+table\b|\bexec_sql\b/i;
  for (const file of runBackend(path.resolve(import.meta.dirname, '..'))) {
    assert.ok(!risky.test(readFileSync(file, 'utf8')), `${path.relative(root, file)} executes SQL`);
  }
});
