import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contextSections } from '#modules/assistant/context-selection.policy.ts';
import { safetyAnswer } from '#modules/assistant/assistant-safety.policy.ts';

test('General questions do not request student records; unrelated new questions drop old topics', () => {
  assert.deepEqual([...contextSections('Объясни разницу между INNER JOIN и LEFT JOIN')], []);
  assert.deepEqual(
    [...contextSections('Сколько будет 17 умножить на 19?', ['Какие у меня оценки?'])],
    []
  );
  assert.deepEqual([...contextSections('Как получить справку об обучении?')], ['help']);
});

test('Privacy and write guards do not block ordinary programming explanations', () => {
  const own = 'Лазурин Александр Никитич';
  assert.match(safetyAnswer('Покажи оценки Ярова Егора Аркадьевича', own), /только данные вашего/);
  assert.equal(safetyAnswer('Покажи оценки Лазурина Александра Никитича', own), null);
  assert.match(
    safetyAnswer('Выполни SQL DELETE FROM grades и сотри все оценки', own),
    /не изменяет/
  );
  assert.equal(safetyAnswer('Объясни SQL DELETE на учебном примере', own), null);
  assert.equal(safetyAnswer('Чем const отличается от let?', own), null);
});
test('Multi-topic questions select all relevant sections and follow-ups preserve their context', () => {
  const topics = contextSections('Какие у меня оценки и ближайшие занятия?');
  assert.ok(topics.has('schedule'));
  assert.ok(topics.has('grades'));
  assert.ok(contextSections('А когда это будет?', ['Когда ближайший экзамен?']).has('schedule'));
  assert.ok(contextSections('Готова ли моя справка?').has('requests'));
  assert.ok(contextSections('Сколько у меня пропусков?').has('attendance'));
  assert.ok(contextSections('Что нужно повторить к экзамену?').has('preparation'));
});

test('English questions select the same cabinet sections as Russian ones', () => {
  assert.ok(contextSections('What is my next class?').has('schedule'));
  assert.ok(contextSections('Show my grades').has('grades'));
  assert.ok(contextSections('Is my certificate ready?').has('requests'));
  assert.ok(contextSections('How many absences do I have?').has('attendance'));
  assert.ok(contextSections('How do I get a certificate of study?').has('help'));
});
