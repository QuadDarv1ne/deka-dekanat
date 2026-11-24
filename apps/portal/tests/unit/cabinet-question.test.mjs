import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cabinetQuestion } from '#modules/assistant/cabinet-question.policy.ts';

test('English cabinet questions use the same exact answers as the Russian ones', () => {
  assert.equal(cabinetQuestion('What is my next class?'), 'upcoming');
  assert.equal(cabinetQuestion('What\u2019s my next class?'), 'upcoming');
  assert.equal(cabinetQuestion('When is my next exam?'), 'exam');
  assert.equal(cabinetQuestion('Is my certificate ready?'), 'ready');
  assert.equal(cabinetQuestion('How many active requests do I have?'), 'active');
  assert.equal(cabinetQuestion('How many absences do I have?'), 'attendance');
  assert.equal(cabinetQuestion('Какие у меня ближайшие занятия?'), 'upcoming');
  assert.equal(cabinetQuestion('Сколько у меня активных заявлений?'), 'active');
  assert.equal(cabinetQuestion('How do I get a certificate of study?'), null);
  assert.equal(cabinetQuestion('Show my grades'), null);
});
