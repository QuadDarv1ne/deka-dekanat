import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = new URL('../../../../var/config/', import.meta.url);
await mkdir(directory, { recursive: true });
const target = new URL('compose.env', directory);
await writeFile(
  target,
  `POSTGRES_PASSWORD=${randomBytes(24).toString('hex')}\nAPP_DB_PASSWORD=${randomBytes(24).toString('hex')}\nAPP_ORIGIN=http://localhost:5180\nAPP_PORT=5180\nDEKA_VERSION=local\n`,
  { flag: 'wx', mode: 0o600 }
);
console.log('Created var/config/compose.env. Existing credentials are never replaced.');
