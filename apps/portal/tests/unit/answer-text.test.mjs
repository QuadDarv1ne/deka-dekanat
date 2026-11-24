import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleAnswer } from '#modules/assistant/answer-text.policy.ts';

test('Streamed em dashes stay a prefix of the saved answer', () => {
  const raw = 'Ответ — это проверка: 12 — 7.';
  let sent = '';
  const deltas = [];
  for (let index = 1; index <= raw.length; index++) {
    const visible = visibleAnswer(raw.slice(0, index));
    assert.ok(visible.startsWith(sent), `shrank at ${index}: "${visible}" after "${sent}"`);
    deltas.push(visible.slice(sent.length));
    sent = visible;
  }
  assert.equal(deltas.join(''), 'Ответ: это проверка: 12: 7.');
  assert.equal(visibleAnswer('  hello  '), 'hello');
  assert.equal(visibleAnswer('конец —'), 'конец:');
});
