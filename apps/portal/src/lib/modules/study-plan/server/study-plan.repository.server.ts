import type { User } from '#modules/auth/auth.types.ts';
import type { Lesson } from '#modules/academics/academic.types.ts';
import { query } from '#server/database/postgres.ts';
import type {
  Assessment,
  ReminderMinutes,
  StudyGrade,
  StudyPreference
} from '../study-plan.types.ts';

const upcomingAssessment = `
  l.group_id=$2 AND l.cancelled_at IS NULL
  AND l.kind IN ('exam','credit')
  AND l.starts_at>now() AND l.starts_at<=now()+interval '720 hours'`;

export async function studyGrades(user: User) {
  return (
    await query<StudyGrade>(
      `SELECT g.subject_id,s.name subject,g.points
       FROM grades g JOIN subjects s ON s.id=g.subject_id
       WHERE g.student_id=$1 ORDER BY g.points,s.name,s.id`,
      [user.id]
    )
  ).rows;
}

const assessmentsSelect = `
  SELECT l.id,l.subject_id,s.name subject,l.starts_at,l.room,l.kind,g.points,
    coalesce(p.marked_ready,false) marked_ready,p.reminder_minutes
  FROM lessons l
  JOIN subjects s ON s.id=l.subject_id
  LEFT JOIN grades g ON g.subject_id=l.subject_id AND g.student_id=$1
  LEFT JOIN study_plan_preferences p ON p.lesson_id=l.id AND p.student_id=$1
  WHERE ${upcomingAssessment}`;

export async function studyAssessments(user: User) {
  return (
    await query<Assessment>(`${assessmentsSelect} ORDER BY l.starts_at,l.id`, [
      user.id,
      user.group_id
    ])
  ).rows;
}

export async function assessmentWithReminder(user: User, lessonId: string) {
  const result = await query<Lesson & { reminder_minutes: ReminderMinutes }>(
    `SELECT l.id,s.name subject,s.color,u.full_name teacher,sg.name group_name,
       l.starts_at,l.ends_at,l.room,l.kind,l.note,p.reminder_minutes
     FROM lessons l
     JOIN subjects s ON s.id=l.subject_id
     JOIN users u ON u.id=l.teacher_id
     JOIN study_groups sg ON sg.id=l.group_id
     JOIN study_plan_preferences p ON p.lesson_id=l.id AND p.student_id=$1
     WHERE ${upcomingAssessment} AND l.id=$3 AND l.starts_at>now()+p.reminder_minutes*interval '1 minute'`,
    [user.id, user.group_id, lessonId]
  );
  return result.rows[0] ?? null;
}

export async function saveStudyPreference(user: User, lessonId: string, patch: StudyPreference) {
  const ready = 'ready' in patch ? patch.ready : null;
  const reminder = 'reminder' in patch ? patch.reminder : null;
  const result = await query(
    `WITH available AS (
       SELECT l.id FROM lessons l
       WHERE ${upcomingAssessment} AND l.id=$3
         AND ($5::smallint IS NULL OR $5=0 OR l.starts_at>now()+$5*interval '1 minute')
       FOR SHARE OF l
     )
     INSERT INTO study_plan_preferences (student_id,lesson_id,marked_ready,reminder_minutes)
     SELECT $1,id,coalesce($4::boolean,false),nullif($5::smallint,0) FROM available
     ON CONFLICT (student_id,lesson_id) DO UPDATE SET
       marked_ready=coalesce($4::boolean,study_plan_preferences.marked_ready),
       reminder_minutes=CASE WHEN $5::smallint IS NULL
         THEN study_plan_preferences.reminder_minutes ELSE nullif($5::smallint,0) END`,
    [user.id, user.group_id, lessonId, ready, reminder]
  );
  return result.rowCount === 1;
}
