export interface TeachingAssignment {
  teacher_id: string;
  subject_id: string;
  group_id: string;
  teacher: string;
  teacher_email: string;
  subject: string;
  short_name: string;
  group_name: string;
}
export interface AcademicStudent {
  id: string;
  full_name: string;
  email: string;
  group_id: string;
  group_name: string;
}
export interface LessonInput {
  id?: string;
  version?: number;
  teacher_id: string;
  subject_id: string;
  group_id: string;
  starts_at: string;
  ends_at: string;
  room: string;
  kind: 'lecture' | 'practice' | 'lab' | 'exam' | 'credit';
  note: string;
}
export interface ManagedLesson extends LessonInput {
  id: string;
  version: number;
  subject: string;
  teacher: string;
  group_name: string;
  cancelled_at: string | null;
}
export interface GradeInput {
  student_id: string;
  teacher_id: string;
  subject_id: string;
  group_id: string;
  points: number;
  version: number;
}
export interface ManagedGrade {
  student_id: string;
  subject_id: string;
  points: number;
  version: number;
  updated_at: string;
}
export interface GradeEvent {
  id: string;
  previous_points: number | null;
  points: number;
  actor: string;
  source: 'baseline' | 'manual' | 'import';
  created_at: string;
}
export type ImportKind = 'schedule' | 'grades';
export interface ImportPreview {
  id: string;
  kind: ImportKind;
  count: number;
  headers: string[];
  rows: string[][];
}
export const assignmentKey = (
  a: Pick<TeachingAssignment, 'teacher_id' | 'subject_id' | 'group_id'>
) => `${a.teacher_id}.${a.subject_id}.${a.group_id}`;
