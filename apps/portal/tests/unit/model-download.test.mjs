import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ensureModel } from '../../../../infrastructure/assistant/download-model.mjs';
const content = Buffer.from('GGUF model download boundary test. '.repeat(60));
const manifest = {
  filename: 'model.gguf',
  repository: 'test/model',
  revision: 'fixed-revision',
  bytes: content.length,
  sha256: createHash('sha256').update(content).digest('hex')
};
async function directory(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'deka-model-test-'));
  t.after(async () => {
    if (
      path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) ||
      !path.basename(root).startsWith('deka-model-test-')
    )
      throw new Error('Unsafe test directory.');
    await rm(root, { recursive: true, force: true });
  });
  return root;
}
test('Model download checks size and SHA-256 and reuses a verified cached model', async (t) => {
  const root = await directory(t);
  let calls = 0;
  const fetchImpl = async (url) => {
    assert.match(url, /huggingface.co\/test\/model\/resolve\/fixed-revision/);
    calls++;
    return new Response(content);
  };
  const first = await ensureModel({ directory: root, manifest, fetchImpl, log: () => {} });
  assert.equal(first.downloaded, true);
  assert.deepEqual(await readFile(first.path), content);
  const again = await ensureModel({ directory: root, manifest, fetchImpl, log: () => {} });
  assert.equal(again.downloaded, false);
  assert.equal(calls, 1);
  await assert.rejects(stat(first.path + '.partial'), { code: 'ENOENT' });
});
test('Interrupted downloads resume with an HTTP Range request', async (t) => {
  const root = await directory(t);
  await writeFile(path.join(root, 'model.gguf.partial'), content.subarray(0, 17));
  await ensureModel({
    directory: root,
    manifest,
    attempts: 1,
    log: () => {},
    fetchImpl: async (url, options) => {
      assert.equal(options.headers.Range, 'bytes=17-');
      return new Response(content.subarray(17), {
        status: 206,
        headers: { 'content-range': `bytes 17-${content.length - 1}/${content.length}` }
      });
    }
  });
  assert.deepEqual(await readFile(path.join(root, 'model.gguf')), content);
});
test('A server ignoring HTTP Range restarts the file without appending duplicate bytes', async (t) => {
  const root = await directory(t);
  await writeFile(path.join(root, 'model.gguf.partial'), content.subarray(0, 19));
  await ensureModel({
    directory: root,
    manifest,
    attempts: 1,
    log: () => {},
    fetchImpl: async () => new Response(content)
  });
  assert.deepEqual(await readFile(path.join(root, 'model.gguf')), content);
});
test('A corrupt download cannot replace an existing model and the corrupt temporary file is removed', async (t) => {
  const root = await directory(t),
    target = path.join(root, 'model.gguf'),
    old = Buffer.from('Existing data');
  await writeFile(target, old);
  await assert.rejects(
    ensureModel({
      directory: root,
      manifest,
      attempts: 1,
      log: () => {},
      fetchImpl: async () => new Response(Buffer.alloc(content.length, 1))
    }),
    /checksum or size mismatch/
  );
  assert.deepEqual(await readFile(target), old);
  await assert.rejects(stat(target + '.partial'), { code: 'ENOENT' });
});
test('Invalid resume ranges are rejected and temporary network failures are retried', async (t) => {
  const root = await directory(t),
    partial = path.join(root, 'model.gguf.partial');
  await writeFile(partial, content.subarray(0, 17));
  await assert.rejects(
    ensureModel({
      directory: root,
      manifest,
      attempts: 1,
      log: () => {},
      fetchImpl: async () =>
        new Response(content.subarray(17), {
          status: 206,
          headers: { 'content-range': `bytes 18-${content.length - 1}/${content.length}` }
        })
    }),
    /Invalid download range/
  );
  let calls = 0;
  await ensureModel({
    directory: root,
    manifest,
    attempts: 2,
    log: () => {},
    fetchImpl: async () => {
      calls++;
      return calls === 1 ? new Response('Unavailable', { status: 503 }) : new Response(content);
    }
  });
  assert.equal(calls, 2);
  assert.deepEqual(await readFile(path.join(root, 'model.gguf')), content);
});
