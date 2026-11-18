import { randomUUID } from 'node:crypto';
import { error } from '@sveltejs/kit';
import type { PoolClient } from 'pg';
import { transaction } from '#server/database/postgres.ts';
import type { User } from '#modules/auth/auth.types.ts';
import type { GradeInput, LessonInput } from '../academic-management.types.ts';
import { academicEditor } from './academic-management.repository.server.ts';
import { isUuid } from '#shared/validation.ts';

export async function lockAcademics(db: PoolClient) {
  await db.query('SELECT pg_advisory_xact_lock(882705104)');
}
async function checkAssignment(db: PoolClient, user: User, row: LessonInput | GradeInput) {
  academicEditor(user);
  if (user.role === 'teacher' && user.id !== row.teacher_id)
    error(403, 'Выберите свою дисциплину.');
  const result = await db.query(
    `SELECT 1 FROM teaching_assignments a JOIN study_groups g ON g.id=a.group_id JOIN users t ON t.id=a.teacher_id WHERE a.teacher_id=$1 AND a.subject_id=$2 AND a.group_id=$3 AND g.faculty_id=$4 AND t.active`,
    [row.teacher_id, row.subject_id, row.group_id, user.faculty_id]
  );
  if (!result.rowCount) error(403, 'Дисциплина или группа недоступна.');
}
async function notifyGroup(db: PoolClient, group: string, body: string) {
  await db.query(
    `INSERT INTO notifications(id,user_id,title,body,href) SELECT gen_random_uuid(),id,'Расписание изменено',$2,'/schedule' FROM users WHERE group_id=$1 AND role='student' AND active`,
    [group, body]
  );
}
export async function saveLessonInTransaction(db: PoolClient, user: User, row: LessonInput) {
  if (user.role !== 'dean') error(403, 'Расписание изменяет деканат.');
  await checkAssignment(db, user, row);
  let oldGroup: string | undefined;
  if (row.id) {
    const old = await db.query(
      `SELECT l.* FROM lessons l JOIN study_groups g ON g.id=l.group_id WHERE l.id=$1 AND g.faculty_id=$2 FOR UPDATE OF l`,
      [row.id, user.faculty_id]
    );
    if (!old.rowCount) error(404, 'Занятие не найдено.');
    if (old.rows[0].version !== row.version) error(409, 'Занятие уже изменено. Обновите страницу.');
    oldGroup = old.rows[0].group_id;
  }
  const overlap = await db.query(
    `SELECT 1 FROM lessons WHERE cancelled_at IS NULL AND starts_at<$2 AND ends_at>$1 AND ($3::uuid IS NULL OR id<>$3) AND (group_id=$4 OR teacher_id=$5 OR lower(room)=lower($6)) LIMIT 1`,
    [row.starts_at, row.ends_at, row.id ?? null, row.group_id, row.teacher_id, row.room]
  );
  if (overlap.rowCount) error(409, 'В это время заняты группа, преподаватель или аудитория.');
  const id = row.id ?? randomUUID();
  if (row.id)
    await db.query(
      `UPDATE lessons SET subject_id=$2,group_id=$3,teacher_id=$4,starts_at=$5,ends_at=$6,room=$7,kind=$8,note=$9,cancelled_at=NULL,version=version+1 WHERE id=$1`,
      [
        id,
        row.subject_id,
        row.group_id,
        row.teacher_id,
        row.starts_at,
        row.ends_at,
        row.room,
        row.kind,
        row.note
      ]
    );
  else
    await db.query(
      `INSERT INTO lessons(id,subject_id,group_id,teacher_id,starts_at,ends_at,room,kind,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        row.subject_id,
        row.group_id,
        row.teacher_id,
        row.starts_at,
        row.ends_at,
        row.room,
        row.kind,
        row.note
      ]
    );
  const description = await db.query('SELECT name FROM subjects WHERE id=$1', [row.subject_id]);
  const date = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(row.starts_at));
  await notifyGroup(db, row.group_id, `${description.rows[0].name}. ${date}, ${row.room}.`);
  if (oldGroup && oldGroup !== row.group_id)
    await notifyGroup(db, oldGroup, 'Занятие перенесено в другую группу. Проверьте расписание.');
  await db.query('INSERT INTO audit_log(actor_id,action,entity_id,metadata) VALUES($1,$2,$3,$4)', [
    user.id,
    row.id ? 'lesson.update' : 'lesson.create',
    id,
    JSON.stringify(row)
  ]);
}
export async function saveGradeInTransaction(
  db: PoolClient,
  user: User,
  row: GradeInput,
  source: 'manual' | 'import' = 'manual'
) {
  await checkAssignment(db, user, row);
  const student = await db.query(
    "SELECT 1 FROM users WHERE id=$1 AND group_id=$2 AND role='student' AND active FOR SHARE",
    [row.student_id, row.group_id]
  );
  if (!student.rowCount) error(400, 'Студент не относится к выбранной группе.');
  const previous = (
    await db.query<{ points: number; version: number; teacher_id: string }>(
      'SELECT points,version,teacher_id FROM grades WHERE student_id=$1 AND subject_id=$2 FOR UPDATE',
      [row.student_id, row.subject_id]
    )
  ).rows[0];
  if ((previous?.version ?? 0) !== row.version)
    error(409, 'Результат уже изменён. Обновите данные перед сохранением.');
  if (previous?.points === row.points && previous.teacher_id === row.teacher_id) return;
  const saved = await db.query<{ version: number }>(
    `INSERT INTO grades(student_id,subject_id,teacher_id,points,updated_by) VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(student_id,subject_id) DO UPDATE SET teacher_id=EXCLUDED.teacher_id,
       points=EXCLUDED.points,updated_by=EXCLUDED.updated_by,updated_at=now(),version=grades.version+1
     WHERE grades.version=$6 RETURNING version`,
    [row.student_id, row.subject_id, row.teacher_id, row.points, user.id, row.version]
  );
  if (!saved.rowCount) error(409, 'Результат уже изменён. Обновите данные перед сохранением.');
  await db.query(
    `INSERT INTO grade_events(student_id,subject_id,teacher_id,actor_id,previous_points,points,grade_version,source)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      row.student_id,
      row.subject_id,
      row.teacher_id,
      user.id,
      previous?.points ?? null,
      row.points,
      saved.rows[0].version,
      source
    ]
  );
  await db.query(
    `INSERT INTO notifications(id,user_id,title,body,href) SELECT gen_random_uuid(),$1,'Обновлены результаты',name||': '||$3::text||' баллов','/grades' FROM subjects WHERE id=$2`,
    [row.student_id, row.subject_id, row.points]
  );
  await db.query(
    "INSERT INTO audit_log(actor_id,action,entity_id,metadata) VALUES($1,'grade.update',$2,$3)",
    [
      user.id,
      `${row.student_id}:${row.subject_id}`,
      JSON.stringify({
        ...row,
        previous_points: previous?.points ?? null,
        version: saved.rows[0].version,
        source
      })
    ]
  );
}
export async function saveLesson(user: User, row: LessonInput) {
  return transaction(async (db) => {
    await lockAcademics(db);
    await saveLessonInTransaction(db, user, row);
  });
}
export async function saveGrade(user: User, row: GradeInput) {
  return transaction(async (db) => {
    await lockAcademics(db);
    await saveGradeInTransaction(db, user, row);
  });
}
export async function cancelLesson(user: User, id: string, version: number) {
  if (user.role !== 'dean') error(403, 'Расписание изменяет деканат.');
  if (!isUuid(id) || !Number.isSafeInteger(version)) error(400, 'Некорректное занятие.');
  return transaction(async (db) => {
    await lockAcademics(db);
    const result = await db.query(
      `UPDATE lessons l SET cancelled_at=now(),version=version+1 FROM study_groups g WHERE l.id=$1 AND l.version=$2 AND l.cancelled_at IS NULL AND g.id=l.group_id AND g.faculty_id=$3 RETURNING l.group_id,l.subject_id`,
      [id, version, user.faculty_id]
    );
    if (!result.rowCount) error(409, 'Занятие уже изменено или недоступно. Обновите страницу.');
    const subject = await db.query('SELECT name FROM subjects WHERE id=$1', [
      result.rows[0].subject_id
    ]);
    await notifyGroup(
      db,
      result.rows[0].group_id,
      `Отменено занятие: ${subject.rows[0].name}. Проверьте расписание.`
    );
    await db.query(
      "INSERT INTO audit_log(actor_id,action,entity_id) VALUES($1,'lesson.cancel',$2)",
      [user.id, id]
    );
  });
}
