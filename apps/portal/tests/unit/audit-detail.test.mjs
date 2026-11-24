import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditDetail, auditTitle } from '#modules/administration/audit-detail.policy.ts';

test('Audit rows describe the recorded action instead of calling every row a request', () => {
  assert.equal(auditTitle('grade.update'), 'Обновлён результат');
  assert.equal(auditDetail('grade.update', { previous_points: 40, points: 76 }), '40 → 76 баллов');
  assert.equal(auditDetail('lesson.cancel', {}), 'Занятие снято с расписания');
  assert.equal(
    auditDetail('request.status_changed', { from: 'new', to: 'in_progress' }),
    'Новое → В работе'
  );
  assert.equal(auditDetail('attendance.mark', { status: null }), 'Нет отметки');
  assert.equal(
    auditDetail('academic_import.complete', { kind: 'schedule', count: 3 }),
    'расписание, строк: 3'
  );
  assert.equal(auditDetail('student_card.issue', { number: 12 }), 'ДК-0000012');
  assert.equal(auditDetail('announcement.publish', {}), 'Объявление видно студентам факультета');
  assert.equal(auditTitle('unknown.action'), 'unknown.action');
  assert.equal(auditDetail('unknown.action', {}), '');
});
