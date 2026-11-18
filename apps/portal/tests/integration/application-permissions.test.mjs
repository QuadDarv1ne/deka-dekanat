import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const url = process.env.TEST_DATABASE_URL;
if (!url || !/^\/deka_test_[0-9a-f]{12}$/.test(new URL(url).pathname))
  throw Error('An isolated test database is required.');
const db = new pg.Client({ connectionString: url });
await db.connect();
const existed = (await db.query("SELECT 1 FROM pg_roles WHERE rolname='deka_app'")).rowCount > 0;
if (!existed) await db.query('CREATE ROLE deka_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE');
after(async () => {
  try {
    if (!existed) {
      await db.query('DROP OWNED BY deka_app');
      await db.query('DROP ROLE deka_app');
    }
  } finally {
    await db.end();
  }
});

test('Application role can record events but cannot rewrite audit, history or account permissions', async () => {
  const migration = await readFile(
    new URL('../../../../database/migrations/010_application_privileges.sql', import.meta.url),
    'utf8'
  );
  await db.query(migration);
  const columns = {
    audit_log: 'action',
    request_events: 'note',
    grade_events: 'points',
    student_cards: 'verification_code',
    users: 'active',
    teaching_assignments: 'teacher_id',
    schema_migrations: 'name'
  };
  for (const table of [
    'audit_log',
    'request_events',
    'grade_events',
    'student_cards',
    'users',
    'teaching_assignments',
    'schema_migrations'
  ]) {
    for (const operation of ['UPDATE', 'DELETE']) {
      await db.query('BEGIN');
      try {
        await db.query('SET LOCAL ROLE deka_app');
        const statement =
          operation === 'DELETE'
            ? `DELETE FROM ${table} WHERE false`
            : `UPDATE ${table} SET ${columns[table]}=${columns[table]} WHERE false`;
        await assert.rejects(
          db.query(statement),
          (cause) => cause.code === '42501',
          table + ' ' + operation
        );
      } finally {
        await db.query('ROLLBACK');
      }
    }
  }
  await db.query('BEGIN');
  try {
    await db.query('SET LOCAL ROLE deka_app');
    await db.query("INSERT INTO audit_log(action,entity_id) VALUES('permission.test','isolated')");
    await db.query('SELECT student_id,points,version FROM grades LIMIT 1');
  } finally {
    await db.query('ROLLBACK');
  }
});
