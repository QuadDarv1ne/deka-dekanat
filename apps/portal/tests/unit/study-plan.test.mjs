import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, parseStudyAdvice, studyFocus } from '#modules/study-plan/study-plan.policy.ts';

const now = Date.parse('2026-11-17T08:00:00Z');
const exam = (id, subject, days, points, marked_ready = false) => ({
  id,
  subject_id: subject,
  subject,
  kind: 'exam',
  starts_at: new Date(now + days * DAY_MS).toISOString(),
  points,
  marked_ready
});
const grade = (subject, points) => ({ subject_id: subject, subject, points });

test('Study focus uses the nearest uncompleted assessment per course and then the 55-point rule', () => {
  const result = studyFocus(
    [grade('Below', 54), grade('Passing', 55)],
    [
      exam('passed', 'Past', -1, null),
      exam('ready', 'Ready', 1, 80, true),
      exam('later', 'Later', 9, null),
      exam('duplicate', 'Soon', 8, 70),
      exam('soon', 'Soon', 7, 70)
    ],
    now
  );
  assert.deepEqual(
    result.map((item) => [item.subject, item.assessment?.id]),
    [
      ['Soon', 'soon'],
      ['Below', undefined],
      ['Later', 'later']
    ]
  );
});

test('Study focus falls back to at most four scored courses when there are no urgent items', () => {
  const grades = [grade('A', 70), grade('B', 76), grade('C', 80), grade('D', 81), grade('E', 95)];
  assert.deepEqual(
    studyFocus(grades, [], now).map((item) => item.subject),
    ['A', 'B', 'C', 'D']
  );
  assert.deepEqual(studyFocus([], [], now), []);
});

test('AI output must contain one bounded plain-text step per supplied item', () => {
  const focus = studyFocus([grade('A', 62), grade('B', 92)], [], now);
  const first = { id: 1, step: 'Решите задачу по теме из последнего семинара.' };
  const second = { id: 2, step: 'Составьте вопросы по конспекту и ответьте на них.' };
  assert.deepEqual(parseStudyAdvice(JSON.stringify([second, first]), focus), {
    1: first.step,
    2: second.step
  });
  for (const invalid of [
    [first],
    [first, first],
    [first, { ...second, id: 3 }],
    [first, { ...second, step: '<script>console.log(1)</script>' }],
    [first, { ...second, step: 'Ссылка: https://example.invalid' }],
    [first, { ...second, step: 'x'.repeat(241) }]
  ])
    assert.equal(parseStudyAdvice(JSON.stringify(invalid), focus), null);
  assert.equal(parseStudyAdvice('Обычный текст вместо JSON', focus), null);
});
