import pg from 'pg';
import path from 'node:path';
import { realpath, stat, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
const source = new URL(process.env.DATABASE_URL ?? '');
if (process.env.DEMO_MODE !== 'true' || !['127.0.0.1', 'localhost'].includes(source.hostname))
  throw Error('Restore verification requires a local sample database.');
if (!process.env.PG_RESTORE_BIN || !process.argv[2])
  throw Error('Pass a trusted backup and PG_RESTORE_BIN.');
const directory = await realpath(new URL('../../../../var/backups/', import.meta.url));
const file = await realpath(process.argv[2]);
if (
  path.dirname(file) !== directory ||
  !/^deka-[0-9-]+\.dump$/.test(path.basename(file)) ||
  !(await stat(file)).size
)
  throw Error('Unexpected backup file.');
const target = 'deka_restore_' + randomBytes(6).toString('hex');
const client = new pg.Client({ connectionString: source.href });
await client.connect();
let created = false;
const counts = async (db) =>
  (
    await db.query(
      `SELECT (SELECT count(*)::int FROM users) users,(SELECT count(*)::int FROM grades) grades,
        (SELECT count(*)::int FROM requests) requests,(SELECT count(*)::int FROM request_messages) request_messages,
        (SELECT count(*)::int FROM schema_migrations) migrations`
    )
  ).rows[0];
try {
  const expected = await counts(client);
  await client.query(`CREATE DATABASE "${target}"`);
  created = true;
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.env.PG_RESTORE_BIN,
      ['--no-owner', '--no-privileges', '--exit-on-error', '--dbname=' + target, file],
      {
        env: {
          ...process.env,
          PGHOST: source.hostname,
          PGPORT: source.port || '5432',
          PGUSER: decodeURIComponent(source.username),
          PGPASSWORD: decodeURIComponent(source.password)
        },
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true
      }
    );
    let error = '';
    child.stderr.on('data', (chunk) => (error += chunk));
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(Error('pg_restore failed: ' + error.slice(-2000)))
    );
  });
  const restoredUrl = new URL(source);
  restoredUrl.pathname = '/' + target;
  const restored = new pg.Client({ connectionString: restoredUrl.href });
  await restored.connect();
  let actual;
  try {
    actual = await counts(restored);
  } finally {
    await restored.end();
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw Error('Restored record counts differ.');
  const report = {
    verifiedAt: new Date().toISOString(),
    backup: path.basename(file),
    expected,
    restored: actual,
    status: 'verified'
  };
  await writeFile(file + '.verification.json', JSON.stringify(report, null, 2));
  console.log('Backup restored successfully in an isolated database. Record counts match.');
} finally {
  if (created) {
    if (!/^deka_restore_[0-9a-f]{12}$/.test(target) || source.pathname.slice(1) === target)
      throw Error('Restore cleanup guard failed.');
    await client.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
      [target]
    );
    await client.query(`DROP DATABASE "${target}"`);
  }
  await client.end();
}
