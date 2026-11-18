import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { spawn, execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { startModelFixture } from '../../tests/fixtures/model-server.mjs';

const execFile = promisify(execFileCallback);
const source = new URL(process.env.DATABASE_URL ?? '');
if (process.env.DEMO_MODE !== 'true' || !['127.0.0.1', 'localhost'].includes(source.hostname))
  throw new Error(
    'Test database creation is allowed only for an explicitly local demo environment.'
  );
const database = `deka_test_${randomBytes(6).toString('hex')}`;
const connection = new URL(source);
connection.pathname = '/' + database;
const maintenance = new pg.Client({ connectionString: source.href });
const origin = 'http://127.0.0.1:5182';
const modelFixture = await startModelFixture();
const env = {
  ...process.env,
  DATABASE_URL: connection.href,
  TEST_DATABASE_URL: connection.href,
  TEST_ORIGIN: origin,
  ORIGIN: origin,
  HOST: '127.0.0.1',
  PORT: '5182',
  DEMO_MODE: 'true',
  NODE_ENV: 'production',
  BUILD_DIRECTORY: '.test-build',
  AI_BASE_URL: modelFixture.baseUrl,
  TEST_MODEL_ORIGIN: modelFixture.origin
};
let server;
let created = false;
let output = '';
await maintenance.connect();
try {
  await maintenance.query(`CREATE DATABASE "${database}"`);
  created = true;
  await execFile(process.execPath, ['tooling/database/migrate.mjs'], { env });
  await execFile(process.execPath, ['tooling/database/seed.mjs'], { env });
  const built = await execFile(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    env,
    maxBuffer: 4 * 1024 * 1024
  });
  if (built.stderr) process.stderr.write(built.stderr);
  server = spawn(process.execPath, ['.test-build/index.js'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => (output += chunk));
  server.stderr.on('data', (chunk) => (output += chunk));
  let available = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`Production server exited: ${output}`);
    try {
      const response = await fetch(origin + '/login', { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        available = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!available) throw new Error(`Production server did not start: ${output}`);
  if (process.env.DEKA_CHROME_PATH) {
    const browser = await execFile(process.execPath, ['tooling/testing/verify-browser.mjs'], {
      env,
      windowsHide: true,
      timeout: 180000
    });
    process.stdout.write(browser.stdout);
  }
  const files = (
    await Promise.all(
      ['unit', 'integration'].map(async (directory) =>
        (await readdir('tests/' + directory))
          .filter((f) => f.endsWith('.test.mjs'))
          .map((f) => 'tests/' + directory + '/' + f)
      )
    )
  ).flat();
  const result = await new Promise((resolve, reject) => {
    // Files share one fixture database; explicit race tests still run concurrent requests.
    const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...files], {
      env,
      stdio: 'inherit',
      windowsHide: true
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = result;
  if (result !== 0 && output)
    process.stderr.write('\nTest server output:\n' + output.slice(-16000));
} finally {
  await modelFixture.close();
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once('exit', resolve));
  }
  if (created) {
    // Only this run's disposable database may be removed. Never drop the source database.
    if (!/^deka_test_[0-9a-f]{12}$/.test(database) || source.pathname.slice(1) === database)
      throw new Error('Test cleanup guard failed');
    await maintenance.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
      [database]
    );
    await maintenance.query(`DROP DATABASE "${database}"`);
  }
  await maintenance.end();
  const applicationPath = await realpath(process.cwd());
  const output = path.resolve(applicationPath, '.test-build');
  if (path.dirname(output) !== applicationPath || path.basename(output) !== '.test-build')
    throw new Error('Unexpected test build directory.');
  await rm(output, { recursive: true, force: true });
}
