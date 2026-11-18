import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from '#modules/requests/request.policy.ts';
import {
  hashPassword,
  verifyPassword,
  newToken,
  hashToken
} from '#server/security/credentials.mjs';

test('Only the deanery processes requests; students can cancel their new requests', () => {
  assert.equal(canTransition('student', 'new', 'cancelled'), true);
  for (const role of ['student', 'teacher', 'admin'])
    for (const status of ['new', 'in_progress', 'ready', 'done', 'rejected', 'cancelled']) {
      for (const target of ['new', 'in_progress', 'ready', 'done', 'rejected'])
        assert.equal(canTransition(role, status, target), false, `${role}: ${status} → ${target}`);
    }
  assert.equal(canTransition('student', 'in_progress', 'cancelled'), false);
  assert.equal(canTransition('dean', 'new', 'in_progress'), true);
  assert.equal(canTransition('dean', 'new', 'ready'), false);
  assert.equal(canTransition('dean', 'in_progress', 'ready'), true);
  assert.equal(canTransition('dean', 'ready', 'done'), true);
  assert.equal(canTransition('dean', 'done', 'in_progress'), false);
  assert.equal(canTransition('dean', 'rejected', 'ready'), false);
});
test('Passwords use independent salts; session tokens are random and hashed', async () => {
  const first = await hashPassword('TestPassword123!');
  const second = await hashPassword('TestPassword123!');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('TestPassword123!', first), true);
  assert.equal(await verifyPassword('incorrect', first), false);
  const a = newToken(),
    b = newToken();
  assert.notEqual(a, b);
  assert.equal(a.length, 43);
  assert.equal(hashToken(a).length, 64);
  assert.notEqual(hashToken(a), a);
});
