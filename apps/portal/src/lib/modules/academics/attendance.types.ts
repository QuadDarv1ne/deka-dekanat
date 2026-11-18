import type { Lesson } from './academic.types.ts';

export type AttendanceStatus = 'present' | 'absent' | 'excused';
export type AttendanceValue = AttendanceStatus | 'unmarked';

export interface AttendanceLesson extends Pick<
  Lesson,
  'id' | 'subject' | 'group_name' | 'starts_at' | 'kind'
> {
  subject_id: string;
}

export interface AttendanceEntry extends AttendanceLesson {
  status: AttendanceStatus | null;
}

export interface AttendanceStudent {
  id: string;
  name: string;
  status: AttendanceStatus | null;
  version: number;
}

export interface AttendanceChange {
  lessonId: string;
  studentId: string;
  status: AttendanceValue;
  version: number;
}
