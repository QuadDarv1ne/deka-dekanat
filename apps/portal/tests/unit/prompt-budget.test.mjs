import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitChatPrompt } from '#modules/assistant/prompt-budget.policy.ts';

test('A long cabinet context does not push the current question out of the prompt', () => {
  const history = [
    { role: 'user', content: 'Какие у меня оценки?' },
    { role: 'assistant', content: 'Смотрю успеваемость.' },
    { role: 'user', content: 'Когда ближайший экзамен?' }
  ];
  const fitted = fitChatPrompt('инструкция\n', 'x'.repeat(10000), '\nконец', history);
  const size =
    fitted.system.length + fitted.messages.reduce((sum, message) => sum + message.content.length, 0);
  assert.ok(size <= 4200);
  assert.equal(fitted.messages.at(-1)?.content, 'Когда ближайший экзамен?');
  assert.ok(fitted.system.endsWith('\nконец'));
  assert.ok(fitted.system.startsWith('инструкция'));
  const crowded = fitChatPrompt('и'.repeat(8000), 'контекст', '\nконец', history, 4200);
  assert.equal(crowded.messages.at(-1)?.content, 'Когда ближайший экзамен?');
  const crowdedSize =
    crowded.system.length +
    crowded.messages.reduce((sum, message) => sum + message.content.length, 0);
  assert.ok(crowdedSize <= 4200);
});

test('Cabinet context is shortened as JSON, not cut through the middle of a record', () => {
  const preface = 'инструкция\n';
  const reminder = '\nконец';
  const context = JSON.stringify({
    role: 'student',
    schedule: {
      records: Array.from({ length: 12 }, (_, index) => ({
        subject: `Предмет ${index}`,
        room: 'аудитория 402'
      }))
    }
  });
  const fitted = fitChatPrompt(
    preface,
    context,
    reminder,
    [{ role: 'user', content: 'Когда экзамен?' }],
    280
  );
  const json = fitted.system.slice(preface.length, fitted.system.length - reminder.length);
  const parsed = JSON.parse(json);
  assert.equal(parsed.role, 'student');
  assert.ok(Array.isArray(parsed.schedule.records));
  assert.ok(parsed.schedule.records.length < 12);
  assert.equal(fitted.messages.at(-1)?.content, 'Когда экзамен?');
});
