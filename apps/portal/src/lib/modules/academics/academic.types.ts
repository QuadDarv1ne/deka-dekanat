export interface Lesson {
  id: string;
  subject: string;
  color: string;
  teacher: string;
  group_name: string;
  starts_at: string;
  ends_at: string;
  room: string;
  kind: 'lecture' | 'practice' | 'lab' | 'exam' | 'credit';
  note: string;
  cancelled_at: string | null;
}
export interface Grade {
  student_id: string;
  student: string;
  subject: string;
  color: string;
  teacher: string;
  group_name: string;
  points: number;
  updated_at: string;
}
