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
  assert.equal(visibleAnswer('Справка в «Моих заявлениях».'), 'Справка в "Моих заявлениях".');
});

test('Reasoning tags stay off the transcript until the answer itself arrives', () => {
  const raw = '<think>скрытое рассуждение</think>Ответ в «Деке».';
  let sent = '';
  for (let index = 1; index <= raw.length; index++) {
    const visible = visibleAnswer(raw.slice(0, index));
    assert.ok(visible.startsWith(sent));
    assert.doesNotMatch(visible, /скрытое|think/);
    sent = visible;
  }
  assert.equal(sent, 'Ответ в "Деке".');
  assert.equal(visibleAnswer('Ответ <think>ещё думаю'), 'Ответ');
});
