import { error } from '@sveltejs/kit';
import { query } from '#server/database/postgres.ts';
import type { User } from '#modules/auth/auth.types.ts';
import type {
  TeachingAssignment,
  AcademicStudent,
  ManagedLesson,
  ManagedGrade,
  GradeEvent,
  ImportKind
} from '../academic-management.types.ts';
import { isUuid } from '#shared/validation.ts';
export function academicEditor(user: User) {
  if (!['dean', 'teacher'].includes(user.role)) error(403, 'Изменение учебных данных недоступно.');
  return user;
}
export async function teachingAssignments(user: User) {
  academicEditor(user);
  return (
    await query<TeachingAssignment>(
      `SELECT a.*,u.full_name teacher,u.email teacher_email,s.name subject,s.short_name,g.name group_name FROM teaching_assignments a JOIN users u ON u.id=a.teacher_id JOIN subjects s ON s.id=a.subject_id JOIN study_groups g ON g.id=a.group_id WHERE g.faculty_id=$1 AND u.active AND ($2='dean' OR a.teacher_id=$3) ORDER BY g.name,s.name,u.full_name`,
      [user.faculty_id, user.role, user.id]
    )
  ).rows;
}
export async function academicStudents(user: User) {
  academicEditor(user);
  return (
    await query<AcademicStudent>(
      `SELECT u.id,u.full_name,u.email,u.group_id,g.name group_name FROM users u JOIN study_groups g ON g.id=u.group_id WHERE u.role='student' AND u.active AND g.faculty_id=$1 AND ($2='dean' OR EXISTS(SELECT 1 FROM teaching_assignments a WHERE a.teacher_id=$3 AND a.group_id=u.group_id)) ORDER BY g.name,u.full_name LIMIT 3000`,
      [user.faculty_id, user.role, user.id]
    )
  ).rows;
}
export async function managedLessons(user: User) {
  if (user.role !== 'dean') return [];
  return (
    await query<ManagedLesson>(
      `SELECT l.*,s.name subject,u.full_name teacher,g.name group_name FROM lessons l JOIN subjects s ON s.id=l.subject_id JOIN users u ON u.id=l.teacher_id JOIN study_groups g ON g.id=l.group_id WHERE g.faculty_id=$1 AND l.starts_at>=now()-interval '7 days' AND l.starts_at<now()+interval '90 days' ORDER BY l.starts_at LIMIT 300`,
      [user.faculty_id]
    )
  ).rows;
}
export async function managedGrades(user: User, subject: string, group: string) {
  academicEditor(user);
  return (
    await query<ManagedGrade>(
      `SELECT p.student_id,p.subject_id,p.points,p.version,p.updated_at FROM grades p
       JOIN users u ON u.id=p.student_id JOIN study_groups g ON g.id=u.group_id
       WHERE p.subject_id=$1 AND u.group_id=$2 AND g.faculty_id=$3 AND u.active
       AND ($4='dean' OR EXISTS(SELECT 1 FROM teaching_assignments a
         WHERE a.teacher_id=$5 AND a.subject_id=p.subject_id AND a.group_id=u.group_id))`,
      [subject, group, user.faculty_id, user.role, user.id]
    )
  ).rows;
}
export async function gradeHistory(user: User, student: string, subject: string) {
  academicEditor(user);
  return (
    await query<GradeEvent>(
      `SELECT e.id::text,e.previous_points,e.points,a.full_name actor,e.source,e.created_at
       FROM grade_events e JOIN users u ON u.id=e.student_id JOIN study_groups g ON g.id=u.group_id
       JOIN users a ON a.id=e.actor_id WHERE e.student_id=$1 AND e.subject_id=$2 AND g.faculty_id=$3
       AND ($4='dean' OR EXISTS(SELECT 1 FROM teaching_assignments t
         WHERE t.teacher_id=$5 AND t.subject_id=e.subject_id AND t.group_id=u.group_id))
       ORDER BY e.id DESC LIMIT 10`,
      [student, subject, user.faculty_id, user.role, user.id]
    )
  ).rows;
}
export async function importDraft(user: User, id: string | null) {
  if (!id || !isUuid(id)) return null;
  const result = await query<{ id: string; kind: ImportKind; rows: Record<string, unknown>[] }>(
    `SELECT id,kind,rows FROM academic_imports WHERE id=$1 AND actor_id=$2 AND completed_at IS NULL AND expires_at>now()`,
    [id, user.id]
  );
  return result.rows[0] ?? null;
}
