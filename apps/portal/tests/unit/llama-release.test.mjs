import { test } from 'node:test';
import assert from 'node:assert/strict';
import { llamaReleaseTag } from '../../../../apps/portal/tooling/assistant/llama-release.mjs';

test('llama.cpp release tag is taken from the archive name', () => {
  assert.equal(
    llamaReleaseTag('llama-b12649-bin-ubuntu-x64.tar.gz', 'b12180'),
    'b12649',
    'the archive name wins so the tag and archive cannot drift apart'
  );
});

test('llama.cpp release tag falls back when the archive name has no tag', () => {
  assert.equal(llamaReleaseTag('custom-build.tar.gz', 'b12180'), 'b12180');
  assert.equal(llamaReleaseTag('custom-build.tar.gz'), null);
  assert.equal(llamaReleaseTag(undefined, undefined), null);
});
