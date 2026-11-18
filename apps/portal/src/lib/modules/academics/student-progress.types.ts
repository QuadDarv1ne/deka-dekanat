import type { Assessment } from '#modules/study-plan/study-plan.types.ts';

export interface AttendanceCounts {
  present: number;
  absent: number;
  excused: number;
  unmarked: number;
}

export interface CourseProgress {
  id: string;
  subject: string;
  points: number | null;
  gap: number | null;
  assessment: Pick<Assessment, 'id' | 'kind' | 'starts_at' | 'marked_ready'> | null;
  attendance: AttendanceCounts;
}
