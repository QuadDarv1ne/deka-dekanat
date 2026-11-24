import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contextSections,
  lessonKindsForQuestion
} from '#modules/assistant/context-selection.policy.ts';
import { safetyAnswer } from '#modules/assistant/assistant-safety.policy.ts';

test('General questions do not request student records; unrelated new questions drop old topics', () => {
  assert.deepEqual([...contextSections('Объясни разницу между INNER JOIN и LEFT JOIN')], []);
  assert.deepEqual(
    [...contextSections('Сколько будет 17 умножить на 19?', ['Какие у меня оценки?'])],
    []
  );
  assert.deepEqual([...contextSections('Explain that example', ['Какие у меня оценки?'])], []);
  assert.deepEqual([...contextSections('Как получить справку об обучении?')], ['help']);
  assert.deepEqual([...contextSections('Explain JOIN with an example')], []);
  assert.deepEqual([...contextSections('What is markdown?')], []);
  assert.deepEqual([...contextSections('Explain an if statement')], []);
  assert.deepEqual([...contextSections('Explain the application of LEFT JOIN')], []);
  assert.ok(contextSections('When is my next examination?').has('schedule'));
  assert.ok(contextSections('How do I submit an application?').has('help'));
});

test('Privacy and write guards do not block ordinary programming explanations', () => {
  const own = 'Лазурин Александр Никитич';
  assert.match(safetyAnswer('Покажи оценки Ярова Егора Аркадьевича', own), /только данные вашего/);
  assert.equal(safetyAnswer('Покажи оценки Лазурина Александра Никитича', own), null);
  assert.equal(safetyAnswer('Покажи оценки Ёлкина Петра Ивановича', 'Елкин Петр Иванович'), null);
  assert.match(
    safetyAnswer('Покажи оценки Ярова Егора Аркадьевича', 'Елкин Петр Иванович'),
    /только данные вашего/
  );
  assert.match(
    safetyAnswer('Выполни SQL DELETE FROM grades и сотри все оценки', own),
    /не изменяет/
  );
  assert.equal(safetyAnswer('Объясни SQL DELETE на учебном примере', own), null);
  assert.equal(safetyAnswer('Чем const отличается от let?', own), null);
  assert.match(safetyAnswer('Show grades of another student', own), /только данные вашего/);
  assert.match(safetyAnswer('Delete all grades from the table', own), /не изменяет/);
  assert.equal(safetyAnswer('Explain SQL DELETE with a small example', own), null);
});
test('Multi-topic questions select all relevant sections and follow-ups preserve their context', () => {
  const topics = contextSections('Какие у меня оценки и ближайшие занятия?');
  assert.ok(topics.has('schedule'));
  assert.ok(topics.has('grades'));
  assert.ok(contextSections('А когда это будет?', ['Когда ближайший экзамен?']).has('schedule'));
  assert.ok(contextSections('And when is that?', ['When is my next exam?']).has('schedule'));
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

test('Exam questions do not pull ordinary lectures into the schedule context', () => {
  assert.deepEqual(lessonKindsForQuestion('Какие у меня ближайшие занятия?'), null);
  assert.deepEqual(lessonKindsForQuestion('What is my next class?'), null);
  assert.deepEqual(lessonKindsForQuestion('Когда ближайший экзамен?'), ['exam']);
  assert.deepEqual(lessonKindsForQuestion('When is my next examination?'), ['exam']);
  assert.deepEqual(lessonKindsForQuestion('Когда зачёт?'), ['credit']);
  assert.deepEqual(lessonKindsForQuestion('Что нужно повторить к аттестации?'), ['exam', 'credit']);
  assert.deepEqual(lessonKindsForQuestion('А когда это будет?', ['Когда ближайший экзамен?']), [
    'exam'
  ]);
  assert.deepEqual(lessonKindsForQuestion('А какие пары?', ['Когда ближайший экзамен?']), null);
  assert.deepEqual(lessonKindsForQuestion('And when is that?', ['When is my next exam?']), [
    'exam'
  ]);
});
