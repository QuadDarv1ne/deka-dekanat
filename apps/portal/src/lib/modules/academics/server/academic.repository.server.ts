import { query } from '#server/database/postgres.ts';
import type { Grade, Lesson } from '#modules/academics/academic.types.ts';
import type { User } from '#modules/auth/auth.types.ts';

export async function lessons(user: User) {
  const scope =
    user.role === 'student'
      ? 'l.group_id=$1'
      : user.role === 'teacher'
        ? 'l.teacher_id=$1'
        : 'g.faculty_id=$1';
  const value =
    user.role === 'student' ? user.group_id : user.role === 'teacher' ? user.id : user.faculty_id;
  if (user.role === 'admin') return [];
  return (
    await query<Lesson>(
      `SELECT l.id,s.name subject,s.color,u.full_name teacher,g.name group_name,l.starts_at,l.ends_at,l.room,l.kind,l.note,l.cancelled_at,l.version FROM lessons l
    JOIN subjects s ON s.id=l.subject_id JOIN users u ON u.id=l.teacher_id JOIN study_groups g ON g.id=l.group_id
    WHERE ${scope} AND l.starts_at>=date_trunc('week', now() AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'Europe/Moscow' AND l.starts_at<now()+interval '30 days' ORDER BY l.starts_at LIMIT 300`,
      [value]
    )
  ).rows;
}
export async function grades(user: User) {
  const scope =
    user.role === 'student'
      ? 'p.student_id=$1'
      : user.role === 'teacher'
        ? 'EXISTS(SELECT 1 FROM teaching_assignments a WHERE a.teacher_id=$1 AND a.subject_id=p.subject_id AND a.group_id=u.group_id)'
        : 'g.faculty_id=$1';
  const value =
    user.role === 'student' ? user.id : user.role === 'teacher' ? user.id : user.faculty_id;
  if (user.role === 'admin') return [];
  return (
    await query<Grade>(
      `SELECT p.student_id,u.full_name student,s.name subject,s.color,t.full_name teacher,g.name group_name,p.points,p.updated_at
    FROM grades p JOIN users u ON u.id=p.student_id JOIN study_groups g ON g.id=u.group_id JOIN subjects s ON s.id=p.subject_id JOIN users t ON t.id=p.teacher_id
    WHERE ${scope} AND g.faculty_id=$2 ORDER BY s.name,u.full_name LIMIT 500`,
      [value, user.faculty_id]
    )
  ).rows;
}
export async function groupRank(user: User) {
  if (user.role !== 'student' || !user.group_id) return null;
  const result = await query<{ position: string; total: string }>(
    `WITH scores AS (SELECT u.id,avg(p.points) average FROM users u JOIN grades p ON p.student_id=u.id WHERE u.group_id=$1 AND u.role='student' AND u.active GROUP BY u.id), ranking AS (SELECT id,rank() OVER (ORDER BY average DESC) position,count(*) OVER () total FROM scores) SELECT position::text,total::text FROM ranking WHERE id=$2`,
    [user.group_id, user.id]
  );
  return result.rows[0] ?? null;
}
