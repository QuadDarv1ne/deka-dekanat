import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
async function files(directory) {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map(async (entry) =>
        entry.isDirectory() ? files(directory + '/' + entry.name) : [directory + '/' + entry.name]
      )
    )
  ).flat();
}
test('Routes contain no SQL, server modules stay marked, shared UI has no feature dependencies', async () => {
  for (const file of await files('src/routes')) {
    if (!file.endsWith('.ts')) continue;
    assert.doesNotMatch(
      await readFile(file, 'utf8'),
      /\b(?:SELECT|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM)\b/,
      file
    );
  }
  for (const file of await files('src/lib/modules'))
    if (file.includes('/server/')) assert.match(file, /\.server\.ts$/, file);
  for (const file of await files('src/lib/shared'))
    assert.doesNotMatch(await readFile(file, 'utf8'), /#modules\/|#application\/|#server\//, file);
});
test('Repository file and directory names use ASCII', async () => {
  const skipped = new Set(['node_modules', '.git', '.svelte-kit', '.output', '.test-build', 'var']);
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (skipped.has(entry.name)) continue;
      assert.match(entry.name, /^[\x20-\x7e]+$/, entry.name);
      if (entry.isDirectory()) await inspect(directory + '/' + entry.name);
    }
  }
  await inspect('../..');
});
