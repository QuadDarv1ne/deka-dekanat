import type { Lesson } from '#modules/academics/academic.types.ts';

export type ReminderMinutes = 60 | 1440;

export interface StudyGrade {
  subject_id: string;
  subject: string;
  points: number;
}

export interface Assessment extends Pick<Lesson, 'id' | 'subject' | 'starts_at' | 'room'> {
  kind: 'exam' | 'credit';
  subject_id: string;
  points: number | null;
  marked_ready: boolean;
  reminder_minutes: ReminderMinutes | null;
}

export interface FocusItem {
  key: number;
  subject: string;
  points: number | null;
  assessment: Pick<Assessment, 'id' | 'kind' | 'starts_at'> | null;
}

export type StudyAdvice = Record<number, string>;
export type StudyPreference = { ready: boolean } | { reminder: ReminderMinutes | 0 };
