#!/usr/bin/env node
// Installs the local assistant for the Fly.io container: downloads the GGUF
// model (size + SHA-256 verified) and the llama.cpp runtime, then leaves both
// under $MODEL_DIRECTORY and $RUNTIME_DIRECTORY so fly-entrypoint.sh can start
// `llama-server` on 127.0.0.1:5188.
//
// The model and runtime are cached on the Fly volume (/data), so a redeploy or
// a machine restart does not download them again. A checksum mismatch removes
// the file and fails loudly instead of silently serving a corrupt model.
//
// Usage (inside the container):
//   node tooling/assistant/install-fly-assistant.mjs
//
// Env:
//   MODEL_DIRECTORY    where the .gguf lives          (default /data/models)
//   RUNTIME_DIRECTORY  where llama-server is unpacked (default /data/llama)

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ensureModel } from '../../../../infrastructure/assistant/download-model.mjs';
import { llamaReleaseTag } from './llama-release.mjs';

const log = (message) => console.log(`[assistant-install] ${message}`);

async function fileSize(file) {
  try {
    return (await stat(file)).size;
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }
}

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function download(url, target) {
  const partial = `${target}.partial`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(10 * 60 * 1000)
      });
      if (!response.ok || !response.body) {
        throw new Error(`Download failed with HTTP ${response.status}: ${url}`);
      }
      const total = Number(response.headers.get('content-length') ?? 0);
      let received = 0;
      await pipeline(
        Readable.fromWeb(response.body),
        new Transform({
          transform(chunk, _encoding, callback) {
            received += chunk.length;
            if (total > 0 && received % (8 * 1024 * 1024) < chunk.length) {
              log(`Downloaded ${Math.floor((received / total) * 100)}%`);
            }
            callback(null, chunk);
          }
        }),
        createWriteStream(partial)
      );
      await rename(partial, target);
      return;
    } catch (error) {
      lastError = error;
      await rm(partial, { force: true });
      if (attempt < 3) {
        log(`Download attempt ${attempt} failed (${error.message}); retrying...`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

async function ensureRuntime(runtime) {
  const directory = path.resolve(process.env.RUNTIME_DIRECTORY ?? '/data/llama');
  const server = path.join(directory, 'llama-server');
  const stamp = path.join(directory, '.archive');
  if (
    (await fileSize(server)) > 0 &&
    (await readFile(stamp, 'utf8').catch(() => '')) === runtime.linuxX64Archive
  ) {
    log('llama.cpp runtime already installed.');
    return server;
  }

  const archive = path.join(directory, runtime.linuxX64Archive);
  await mkdir(directory, { recursive: true });
  // The release tag must match the archive name, otherwise the download URL
  // 404s. It is derived from the archive name so the two cannot drift apart.
  const release = llamaReleaseTag(runtime.linuxX64Archive, runtime.linuxRelease ?? runtime.release);
  if (!release) throw new Error('llama.cpp release tag is unknown.');
  log(`Downloading llama.cpp ${release}...`);
  await download(
    `https://github.com/ggml-org/llama.cpp/releases/download/${release}/${runtime.linuxX64Archive}`,
    archive
  );

  const actual = await sha256(archive);
  if (actual !== runtime.linuxX64Sha256) {
    await rm(archive, { force: true });
    throw new Error(
      `llama.cpp checksum mismatch: expected ${runtime.linuxX64Sha256}, got ${actual}`
    );
  }
  log('llama.cpp archive verified. Extracting...');

  const { execFile } = await import('node:child_process');
  await new Promise((resolve, reject) => {
    execFile('tar', ['-xzf', archive, '-C', directory, '--strip-components=1'], (error) =>
      error ? reject(error) : resolve()
    );
  });
  await rm(archive, { force: true });
  await (await import('node:fs/promises')).writeFile(stamp, runtime.linuxX64Archive);
  log('llama.cpp runtime installed.');
  return server;
}

const manifest = JSON.parse(
  await readFile(
    new URL('../../../../infrastructure/assistant/model-manifest.json', import.meta.url),
    'utf8'
  )
);
const model = manifest.fly;
if (!model) throw new Error('manifest.fly is missing');

const modelDirectory = path.resolve(process.env.MODEL_DIRECTORY ?? '/data/models');
await mkdir(modelDirectory, { recursive: true });

log(`Ensuring model ${model.filename} (${(model.bytes / 1024 / 1024).toFixed(0)} MB)...`);

// ensureModel() re-hashes the whole file on every call (~60s for a 1GB model).
// The volume is persistent and nothing else writes to it, so remember the
// verified file in a marker: an unchanged size + inode + mtime means the
// checksum still holds and the expensive re-hash can be skipped.
const modelPath = path.join(modelDirectory, model.filename);
const markerPath = path.join(modelDirectory, '.verified.json');
let cached = null;
try {
  cached = JSON.parse(await readFile(markerPath, 'utf8'));
} catch {
  cached = null;
}
if (cached?.filename === model.filename && cached?.sha256 === model.sha256) {
  const current = await stat(modelPath).catch(() => null);
  if (
    current &&
    current.size === model.bytes &&
    current.ino === cached.ino &&
    current.mtimeMs === cached.mtimeMs
  ) {
    log('Model unchanged since the last verified boot. Skipping the checksum re-hash.');
    const server = await ensureRuntime(manifest.runtime);
    log(`Ready. model=${modelPath} server=${server}`);
    process.exit(0);
  }
}

const installed = await ensureModel({
  directory: modelDirectory,
  manifest: model,
  log
});

const verified = await stat(installed.path);
await (
  await import('node:fs/promises')
).writeFile(
  markerPath,
  JSON.stringify({
    filename: model.filename,
    sha256: model.sha256,
    ino: verified.ino,
    mtimeMs: verified.mtimeMs
  })
);

const server = await ensureRuntime(manifest.runtime);
log(`Ready. model=${installed.path} server=${server}`);
