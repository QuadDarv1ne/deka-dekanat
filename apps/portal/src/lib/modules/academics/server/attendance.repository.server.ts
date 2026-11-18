import type { User } from '#modules/auth/auth.types.ts';
import { query } from '#server/database/postgres.ts';
import type { AttendanceEntry, AttendanceLesson, AttendanceStudent } from '../attendance.types.ts';

const recent = `l.cancelled_at IS NULL
  AND l.starts_at>=now()-interval '720 hours' AND l.ends_at<=now()`;
const lessonColumns = 'l.id,l.subject_id,s.name subject,g.name group_name,l.starts_at,l.kind';

export async function studentAttendance(user: User) {
  return (
    await query<AttendanceEntry>(
      `SELECT ${lessonColumns},a.status FROM lessons l
       JOIN subjects s ON s.id=l.subject_id JOIN study_groups g ON g.id=l.group_id
       LEFT JOIN lesson_attendance a ON a.lesson_id=l.id AND a.student_id=$1
       WHERE l.group_id=$2 AND ${recent} ORDER BY l.starts_at DESC,l.id`,
      [user.id, user.group_id]
    )
  ).rows;
}

export async function teacherAttendanceLessons(user: User) {
  return (
    await query<AttendanceLesson>(
      `SELECT ${lessonColumns} FROM lessons l
       JOIN subjects s ON s.id=l.subject_id JOIN study_groups g ON g.id=l.group_id
       WHERE l.teacher_id=$1 AND g.faculty_id=$2 AND ${recent}
       ORDER BY l.starts_at DESC,l.id`,
      [user.id, user.faculty_id]
    )
  ).rows;
}

export async function attendanceRoster(user: User, lessonId: string) {
  return (
    await query<AttendanceStudent>(
      `SELECT u.id,u.full_name name,a.status,coalesce(a.version,0) version
       FROM lessons l JOIN study_groups g ON g.id=l.group_id
       JOIN users u ON u.group_id=l.group_id AND u.faculty_id=g.faculty_id
       LEFT JOIN lesson_attendance a ON a.lesson_id=l.id AND a.student_id=u.id
       WHERE l.id=$3 AND l.teacher_id=$1 AND g.faculty_id=$2 AND ${recent}
         AND u.role='student' AND u.active
       ORDER BY u.full_name,u.id`,
      [user.id, user.faculty_id, lessonId]
    )
  ).rows;
}
