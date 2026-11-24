import { calendarExport } from '#modules/academics/server/calendar-export.server.ts';
import type { Lesson } from '#modules/academics/academic.types.ts';
import type { ReminderMinutes } from '../study-plan.types.ts';

export function studyCalendar(assessment: Lesson, reminder: ReminderMinutes, now = new Date()) {
  return calendarExport([assessment], now, {
    before: `-PT${reminder / 60}H`,
    description: 'Подготовка к аттестации'
  });
}
