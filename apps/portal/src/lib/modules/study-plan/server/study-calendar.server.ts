import { calendarExport } from '#modules/academics/server/calendar-export.server.ts';
import type { Lesson } from '#modules/academics/academic.types.ts';
import type { ReminderMinutes } from '../study-plan.types.ts';

export function studyCalendar(assessment: Lesson, reminder: ReminderMinutes, now = new Date()) {
  const calendar = calendarExport([assessment], now);
  // One event from calendarExport. Insert a DISPLAY alarm before its END:VEVENT.
  return calendar.replace(
    '\r\nEND:VEVENT\r\n',
    [
      '',
      'BEGIN:VALARM',
      `TRIGGER:-PT${reminder / 60}H`,
      'ACTION:DISPLAY',
      'DESCRIPTION:Подготовка к аттестации',
      'END:VALARM',
      'END:VEVENT',
      ''
    ].join('\r\n')
  );
}
