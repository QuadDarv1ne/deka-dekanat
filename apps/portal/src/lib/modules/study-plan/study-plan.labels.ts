import type { ReminderMinutes } from './study-plan.types.ts';

export const reminderLabels: Record<ReminderMinutes, string> = {
  60: 'За 1 час',
  1440: 'За 24 часа'
};
