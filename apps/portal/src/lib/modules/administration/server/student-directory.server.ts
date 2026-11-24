import { query } from '#server/database/postgres.ts';
import { error } from '@sveltejs/kit';
import type { User } from '#modules/auth/auth.types.ts';
import { foldText } from '#shared/text-fold.ts';
export async function studentDirectory(user: User, search: string) {
  if (!['dean', 'teacher'].includes(user.role)) error(403, 'Реестр недоступен.');
  return (
    await query<{
      id: string;
      full_name: string;
      email: string;
      group_name: string;
      program: string;
      course: number;
      card_number: string | null;
    }>(
      `SELECT u.id,u.full_name,u.email,g.name group_name,g.program,g.course,c.number::text card_number FROM users u JOIN study_groups g ON g.id=u.group_id LEFT JOIN student_cards c ON c.student_id=u.id WHERE u.role='student' AND u.active AND g.faculty_id=$1 AND ($2='dean' OR EXISTS(SELECT 1 FROM teaching_assignments a WHERE a.teacher_id=$3 AND a.group_id=g.id)) AND ($4='' OR position(${foldText('$4')} in ${foldText("u.full_name||' '||g.name||' '||u.email||' '||coalesce(c.number::text,'')||' '||coalesce(lpad(c.number::text,7,'0'),'')")})>0) ORDER BY g.name,u.full_name LIMIT 100`,
      [
        user.faculty_id,
        user.role,
        user.id,
        search
          .slice(0, 100)
          .trim()
          .replace(/^(?:дк|dk)[-\s]*/iu, '')
      ]
    )
  ).rows;
}
