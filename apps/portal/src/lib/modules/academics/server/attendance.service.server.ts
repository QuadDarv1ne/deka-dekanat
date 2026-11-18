import { error } from '@sveltejs/kit';
import type { User } from '#modules/auth/auth.types.ts';
import { transaction } from '#server/database/postgres.ts';
import type { AttendanceChange } from '../attendance.types.ts';

export async function markAttendance(user: User, change: AttendanceChange) {
  if (user.role !== 'teacher') error(403, 'Отметки вносит преподаватель занятия.');
  await transaction(async (db) => {
    const allowed = await db.query(
      `SELECT l.id FROM lessons l
       JOIN study_groups g ON g.id=l.group_id
       JOIN users u ON u.group_id=l.group_id AND u.faculty_id=g.faculty_id
       WHERE l.id=$1 AND u.id=$2 AND l.teacher_id=$3 AND g.faculty_id=$4
         AND l.cancelled_at IS NULL AND l.ends_at<=now()
         AND l.starts_at>=now()-interval '720 hours'
         AND u.active AND u.role='student'
       FOR SHARE OF l,g,u`,
      [change.lessonId, change.studentId, user.id, user.faculty_id]
    );
    if (!allowed.rowCount) error(404, 'Занятие или студент недоступны.');
    const value = change.status === 'unmarked' ? null : change.status;
    const written = await db.query(
      `INSERT INTO lesson_attendance (lesson_id,student_id,status,marked_by)
       SELECT $1,$2,$3,$4
       WHERE $5=0 OR EXISTS (
         SELECT 1 FROM lesson_attendance WHERE lesson_id=$1 AND student_id=$2
       )
       ON CONFLICT (lesson_id,student_id) DO UPDATE
       SET status=excluded.status,marked_by=excluded.marked_by,updated_at=now(),
         version=lesson_attendance.version+1
       WHERE lesson_attendance.version=$5
       RETURNING version`,
      [change.lessonId, change.studentId, value, user.id, change.version]
    );
    if (!written.rowCount) error(409, 'Отметку уже изменили. Обновите журнал.');
    await db.query(
      `INSERT INTO audit_log(actor_id,action,entity_id,metadata)
       VALUES($1,'attendance.mark',$2,$3)`,
      [user.id, change.lessonId, JSON.stringify({ studentId: change.studentId, status: value })]
    );
  });
}
