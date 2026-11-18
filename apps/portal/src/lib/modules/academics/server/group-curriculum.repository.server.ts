import { query } from '#server/database/postgres.ts';
import type { User } from '#modules/auth/auth.types.ts';

export async function groupCurriculum(user: User) {
  if (user.role !== 'student') return [];
  return (
    await query<{ subject_id: string; subject: string; teacher: string }>(
      `SELECT DISTINCT s.id subject_id,s.name subject,u.full_name teacher
       FROM teaching_assignments a JOIN subjects s ON s.id=a.subject_id
       JOIN users u ON u.id=a.teacher_id
       WHERE a.group_id=$1 AND u.role='teacher' AND u.active
       ORDER BY s.name,u.full_name,s.id`,
      [user.group_id]
    )
  ).rows;
}
