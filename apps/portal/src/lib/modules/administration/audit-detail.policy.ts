import { attendanceLabels } from '#modules/academics/attendance.labels.ts';
import { lessonKinds } from '#modules/academics/academic.labels.ts';
import { requestKinds, statusNames } from '#modules/requests/request.labels.ts';
import type { AttendanceValue } from '#modules/academics/attendance.types.ts';
import type { RequestKind, RequestStatus } from '#modules/requests/request.types.ts';

const titles: Record<string, string> = {
  'request.created': 'Создано заявление',
  'request.status_changed': 'Изменён статус заявления',
  'lesson.create': 'Добавлено занятие',
  'lesson.update': 'Изменено занятие',
  'lesson.cancel': 'Отменено занятие',
  'grade.update': 'Обновлён результат',
  'academic_import.complete': 'Импорт учебных данных',
  'student_card.issue': 'Выпущен студенческий',
  'student_card.verify': 'Проверен студенческий',
  'attendance.mark': 'Отмечена посещаемость',
  'announcement.publish': 'Опубликовано объявление',
  'announcement.remove': 'Удалено объявление'
};

function text(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function auditTitle(action: string) {
  return titles[action] ?? action;
}

export function auditDetail(action: string, metadata: Record<string, unknown> | null | undefined) {
  const data = metadata ?? {};
  if (action === 'request.status_changed') {
    const from = statusNames[data.from as RequestStatus] ?? text(data.from);
    const to = statusNames[data.to as RequestStatus] ?? text(data.to);
    if (from && to) return `${from} → ${to}`;
  }
  if (action === 'request.created')
    return requestKinds[data.kind as RequestKind] ?? 'Заявление отправлено в деканат';
  if (action === 'grade.update') {
    const points = text(data.points);
    const previous = text(data.previous_points);
    if (points && previous) return `${previous} → ${points} баллов`;
    if (points) return `${points} баллов`;
  }
  if (action === 'attendance.mark') {
    if (data.status == null) return attendanceLabels.unmarked;
    return attendanceLabels[data.status as AttendanceValue] ?? 'Отметка сохранена';
  }
  if (action === 'academic_import.complete') {
    const kind =
      data.kind === 'schedule' ? 'расписание' : data.kind === 'grades' ? 'оценки' : 'данные';
    const count = text(data.count);
    return count ? `${kind}, строк: ${count}` : kind;
  }
  if (action === 'student_card.issue' && text(data.number))
    return `ДК-${text(data.number).padStart(7, '0')}`;
  if (action === 'lesson.create' || action === 'lesson.update') {
    const kind = lessonKinds[data.kind as keyof typeof lessonKinds];
    const room = text(data.room);
    return [kind, room].filter(Boolean).join(' · ') || 'Занятие сохранено';
  }
  if (action === 'lesson.cancel') return 'Занятие снято с расписания';
  if (action === 'announcement.publish') return 'Объявление видно студентам факультета';
  if (action === 'announcement.remove') return 'Объявление скрыто';
  if (action === 'student_card.verify') return 'Код студенческого сверен';
  return '';
}
