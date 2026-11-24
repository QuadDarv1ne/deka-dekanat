import type { Lesson } from '../academic.types.ts';
const escape = (s: string) =>
  s
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r', '');
const stamp = (date: string) =>
  new Date(date)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
// RFC 5545 limits content lines to 75 octets. Continuation lines start with one space.
function fold(line: string) {
  const lines: string[] = [];
  let current = '',
    size = 0;
  for (const char of line) {
    const bytes = new TextEncoder().encode(char).length;
    if (size + bytes > 75) {
      lines.push(current);
      current = ' ';
      size = 1;
    }
    current += char;
    size += bytes;
  }
  return [...lines, current].join('\r\n');
}
export function calendarExport(
  lessons: Lesson[],
  now = new Date(),
  alarm: { before: string; description: string } | null = {
    before: '-PT15M',
    description: 'Занятие через 15 минут'
  }
) {
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Deka//University Calendar//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Дека. Расписание',
      ...lessons.flatMap((l) => [
        'BEGIN:VEVENT',
        `UID:${l.id}@deka`,
        `DTSTAMP:${stamp(now.toISOString())}`,
        `DTSTART:${stamp(l.starts_at)}`,
        `DTEND:${stamp(l.ends_at)}`,
        `SUMMARY:${escape(l.cancelled_at ? 'Отменено: ' + l.subject : l.subject)}`,
        `LOCATION:${escape(l.room)}`,
        `STATUS:${l.cancelled_at ? 'CANCELLED' : 'CONFIRMED'}`,
        `DESCRIPTION:${escape(`${l.group_name}. ${l.teacher}${l.note ? '\n' + l.note : ''}`)}`,
        ...(l.cancelled_at || !alarm
          ? []
          : [
              'BEGIN:VALARM',
              `TRIGGER:${alarm.before}`,
              'ACTION:DISPLAY',
              `DESCRIPTION:${escape(alarm.description)}`,
              'END:VALARM'
            ]),
        'END:VEVENT'
      ]),
      'END:VCALENDAR'
    ]
      .map(fold)
      .join('\r\n') + '\r\n'
  );
}
