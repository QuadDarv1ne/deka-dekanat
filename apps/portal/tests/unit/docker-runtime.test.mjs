import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
test(
  'Docker defaults to AI and GPU, downloads first, and falls back on device, startup or health failures',
  { skip: process.platform !== 'win32' },
  async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'deka-docker-test-'));
    try {
      const { stdout } = await promisify(execFile)(
        'powershell.exe',
        [
          '-NoProfile',
          '-File',
          'tests/fixtures/docker-runtime.ps1',
          '-Repository',
          path.resolve('../..'),
          '-TestDirectory',
          directory
        ],
        { windowsHide: true, maxBuffer: 500000 }
      );
      assert.match(stdout, /model initialization order passed/);
      assert.match(stdout, /Native assistant environment preserves existing settings/);
    } finally {
      if (
        path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) ||
        !path.basename(directory).startsWith('deka-docker-test-')
      )
        throw new Error('Unsafe test directory.');
      await rm(directory, { recursive: true, force: true });
    }
  }
);
