import { error, isHttpError } from '@sveltejs/kit';
import { transaction } from '#server/database/postgres.ts';
import type { User } from '#modules/auth/auth.types.ts';
import {
  academicEditor,
  teachingAssignments,
  academicStudents,
  importDraft
} from './academic-management.repository.server.ts';
import { readAcademicFile } from './academic-file.server.ts';
import { lessonValues, gradeValues } from './academic-validation.server.ts';
import {
  lockAcademics,
  saveLessonInTransaction,
  saveGradeInTransaction
} from './academic-management.service.server.ts';
import {
  assignmentKey,
  type ImportKind,
  type LessonInput,
  type GradeInput,
  type ImportPreview
} from '../academic-management.types.ts';
import { isUuid } from '#shared/validation.ts';

const norm = (s: string) => s.trim().toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');
function readRow<T>(index: number, read: () => T): T {
  try {
    return read();
  } catch (cause) {
    if (isHttpError(cause)) error(cause.status, `Строка ${index}: ${cause.body.message}`);
    throw cause;
  }
}
export const importHeaders = {
  schedule: [
    'Группа',
    'Дисциплина',
    'Преподаватель',
    'Дата',
    'Начало',
    'Окончание',
    'Аудитория',
    'Тип',
    'Комментарий'
  ],
  grades: ['Почта', 'Дисциплина', 'Преподаватель', 'Баллы']
};
export async function prepareAcademicImport(user: User, kind: ImportKind, file: File) {
  academicEditor(user);
  if (kind === 'schedule' && user.role !== 'dean') error(403, 'Расписание изменяет деканат.');
  const [table, assignments, students] = await Promise.all([
    readAcademicFile(file),
    teachingAssignments(user),
    academicStudents(user)
  ]);
  if (!table.length) error(400, 'В таблице нет данных.');
  const rows: (LessonInput | GradeInput)[] = [];
  const keys = new Set<string>();
  for (const { index, values } of table) {
    for (const header of importHeaders[kind].filter((h) => h !== 'Комментарий'))
      if (!(header in values)) error(400, `Отсутствует столбец "${header}". Скачайте шаблон.`);
    const student =
      kind === 'grades' ? students.find((s) => norm(s.email) === norm(values['Почта'])) : null;
    if (kind === 'grades' && !student)
      error(400, `Строка ${index}: студент не найден в доступных группах.`);
    const candidates = assignments.filter(
      (a) =>
        (kind === 'grades'
          ? a.group_id === student?.group_id
          : norm(a.group_name) === norm(values['Группа'])) &&
        [a.subject, a.short_name].some((s) => norm(s) === norm(values['Дисциплина'])) &&
        [a.teacher, a.teacher_email].some((s) => norm(s) === norm(values['Преподаватель']))
    );
    if (candidates.length !== 1)
      error(400, `Строка ${index}: проверьте группу, дисциплину и преподавателя.`);
    const form = new FormData();
    form.set('assignment', assignmentKey(candidates[0]));
    let parsed: LessonInput | GradeInput;
    if (kind === 'schedule') {
      const kinds: Record<string, string> = {
        лекция: 'lecture',
        практика: 'practice',
        лабораторная: 'lab',
        экзамен: 'exam',
        зачет: 'credit',
        lecture: 'lecture',
        practice: 'practice',
        lab: 'lab',
        exam: 'exam',
        credit: 'credit'
      };
      for (const [key, value] of Object.entries({
        date: values['Дата'],
        start: values['Начало'],
        end: values['Окончание'],
        room: values['Аудитория'],
        kind: kinds[norm(values['Тип']).replace(/[.]+$/u, '')] ?? '',
        note: values['Комментарий'] ?? ''
      }))
        form.set(key, value);
      parsed = readRow(index, () => lessonValues(form));
    } else {
      form.set('student', student!.id);
      form.set('points', values['Баллы']);
      form.set('version', '0');
      parsed = readRow(index, () => gradeValues(form));
    }
    const key =
      kind === 'schedule'
        ? `${parsed.group_id}:${(parsed as LessonInput).starts_at}`
        : `${(parsed as GradeInput).student_id}:${parsed.subject_id}`;
    if (keys.has(key)) error(400, `Строка ${index}: повторная запись в файле.`);
    keys.add(key);
    rows.push(parsed);
  }
  return transaction(async (db) => {
    if (kind === 'grades') {
      const versions = (
        await db.query<{ student_id: string; subject_id: string; version: number }>(
          `SELECT g.student_id,g.subject_id,g.version FROM grades g
         JOIN jsonb_to_recordset($1::jsonb) AS r(student_id uuid,subject_id uuid)
         ON g.student_id=r.student_id AND g.subject_id=r.subject_id`,
          [JSON.stringify(rows)]
        )
      ).rows;
      const byKey = new Map<string, number>(
        versions.map((g) => [g.student_id + ':' + g.subject_id, g.version])
      );
      for (const row of rows as GradeInput[])
        row.version = byKey.get(row.student_id + ':' + row.subject_id) ?? 0;
    }
    await db.query('DELETE FROM academic_imports WHERE expires_at<now()');
    const result = await db.query(
      `INSERT INTO academic_imports(actor_id,kind,rows) VALUES($1,$2,$3) RETURNING id`,
      [user.id, kind, JSON.stringify(rows)]
    );
    return result.rows[0].id as string;
  });
}
export async function importPreview(user: User, id: string | null): Promise<ImportPreview | null> {
  const draft = await importDraft(user, id);
  if (!draft) return null;
  const [assignments, students] = await Promise.all([
    teachingAssignments(user),
    academicStudents(user)
  ]);
  return {
    id: draft.id,
    kind: draft.kind,
    count: draft.rows.length,
    headers:
      draft.kind === 'schedule'
        ? ['Группа', 'Дисциплина', 'Дата и время', 'Аудитория']
        : ['Студент', 'Дисциплина', 'Баллы'],
    rows: draft.rows.slice(0, 20).map((r) => {
      const a = assignments.find(
        (a) =>
          a.group_id === r.group_id &&
          a.subject_id === r.subject_id &&
          a.teacher_id === r.teacher_id
      );
      return draft.kind === 'schedule'
        ? [
            a?.group_name ?? '',
            a?.subject ?? '',
            new Intl.DateTimeFormat('ru-RU', {
              timeZone: 'Europe/Moscow',
              dateStyle: 'short',
              timeStyle: 'short'
            }).format(new Date(String(r.starts_at))),
            String(r.room)
          ]
        : [
            students.find((s) => s.id === r.student_id)?.full_name ?? '',
            a?.subject ?? '',
            String(r.points)
          ];
    })
  };
}
export async function confirmAcademicImport(user: User, id: string) {
  academicEditor(user);
  if (!isUuid(id)) error(400, 'Некорректный импорт.');
  return transaction(async (db) => {
    await lockAcademics(db);
    const result = await db.query(
      `SELECT *,expires_at<now() expired FROM academic_imports WHERE id=$1 AND actor_id=$2 FOR UPDATE`,
      [id, user.id]
    );
    if (!result.rowCount) error(404, 'Импорт не найден.');
    const draft = result.rows[0];
    if (draft.completed_at) return draft.kind as ImportKind;
    if (draft.expired) error(409, 'Время подтверждения истекло. Загрузите файл снова.');
    for (const row of draft.rows) {
      if (draft.kind === 'schedule') await saveLessonInTransaction(db, user, row);
      else {
        if (!Number.isSafeInteger(row.version) || row.version < 0)
          error(409, 'Предпросмотр устарел. Загрузите файл снова.');
        await saveGradeInTransaction(db, user, row, 'import');
      }
    }
    await db.query('UPDATE academic_imports SET completed_at=now() WHERE id=$1', [id]);
    await db.query(
      "INSERT INTO audit_log(actor_id,action,entity_id,metadata) VALUES($1,'academic_import.complete',$2,$3)",
      [user.id, id, JSON.stringify({ kind: draft.kind, count: draft.rows.length })]
    );
    return draft.kind as ImportKind;
  });
}
