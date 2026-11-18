import { error } from '@sveltejs/kit';
import { isUuid } from '#shared/validation.ts';
import type { GradeInput, LessonInput } from '../academic-management.types.ts';
const fail = (message: string): never => {
  throw error(400, message);
};
export function assignmentValues(value: string) {
  const [teacher_id, subject_id, group_id, ...rest] = value.split('.');
  if (rest.length || ![teacher_id, subject_id, group_id].every((id) => id && isUuid(id)))
    fail('Выберите учебную дисциплину и группу.');
  return { teacher_id, subject_id, group_id };
}
export function lessonValues(form: FormData): LessonInput {
  const assignment = assignmentValues(String(form.get('assignment') ?? ''));
  const date = String(form.get('date') ?? ''),
    start = String(form.get('start') ?? ''),
    end = String(form.get('end') ?? '');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    ![start, end].every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))
  )
    fail('Проверьте дату и время занятия.');
  const starts_at = new Date(`${date}T${start}:00+03:00`),
    ends_at = new Date(`${date}T${end}:00+03:00`);
  if (
    !Number.isFinite(+starts_at) ||
    date !== new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(starts_at) ||
    +ends_at <= +starts_at ||
    +ends_at - +starts_at > 8 * 3600000
  )
    fail('Занятие должно длиться от 1 минуты до 8 часов в пределах одного дня.');
  const room = String(form.get('room') ?? '').trim(),
    note = String(form.get('note') ?? '').trim(),
    kind = String(form.get('kind') ?? '');
  if (
    !room ||
    room.length > 100 ||
    note.length > 500 ||
    !['lecture', 'practice', 'lab', 'exam', 'credit'].includes(kind)
  )
    fail('Проверьте аудиторию, тип занятия и комментарий.');
  const id = String(form.get('lessonId') ?? ''),
    version = Number(form.get('version'));
  if (id && (!isUuid(id) || !Number.isSafeInteger(version) || version < 1))
    fail('Некорректная версия занятия.');
  return {
    ...assignment,
    ...(id ? { id, version } : {}),
    starts_at: starts_at.toISOString(),
    ends_at: ends_at.toISOString(),
    room,
    note,
    kind: kind as LessonInput['kind']
  };
}
export function gradeValues(form: FormData): GradeInput {
  const assignment = assignmentValues(String(form.get('assignment') ?? ''));
  const student_id = String(form.get('student') ?? ''),
    raw = String(form.get('points') ?? '').trim(),
    points = Number(raw);
  if (
    !isUuid(student_id) ||
    !/^\d{1,3}$/.test(raw) ||
    !Number.isInteger(points) ||
    points < 0 ||
    points > 100
  )
    fail('Выберите студента и укажите целое число баллов от 0 до 100.');
  const rawVersion = String(form.get('version') ?? '');
  const version = Number(rawVersion);
  if (!/^\d{1,9}$/.test(rawVersion) || !Number.isSafeInteger(version) || version < 0)
    fail('Обновите страницу перед сохранением результата.');
  return { ...assignment, student_id, points, version };
}
