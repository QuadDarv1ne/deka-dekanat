/**
 * Генерация iCalendar (.ics) из расписания. Чистая функция — работает
 * в браузере, файл скачивается локально без внешних сервисов.
 */

export type IcsSlot = {
  id: string;
  dateIso: string;
  start: string; // "09:30"
  end: string; // "11:00"
  subjectName: string;
  kind: string;
  room: string;
  building: string | null;
  teacherName: string;
  status: string;
  note?: string;
};

export type IcsWeek = {
  days: {
    dateIso: string;
    slots: IcsSlot[];
  }[];
};

/** Экранирование текста по RFC 5545. */
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** "2026-11-05" + "09:30" → "20261105T093000" (плавающее локальное время). */
function dt(dateIso: string, hhmm: string): string {
  return `${dateIso.replace(/-/g, "")}T${hhmm.replace(":", "")}00`;
}

/** Штамп текущего момента в UTC: 20261105T071500Z. */
function dtStampUtc(): string {
  return `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

export function buildIcs(opts: { calName: string; weeks: IcsWeek[] }): string {
  const now = dtStampUtc();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deka//Raspisanie//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(opts.calName)}`,
    "X-WR-TIMEZONE:Europe/Moscow",
  ];

  for (const week of opts.weeks) {
    for (const day of week.days ?? []) {
      for (const s of day.slots ?? []) {
        if (s.status === "cancelled") continue; // отменённые пары не переносим в календарь
        const location = [s.room, s.building].filter(Boolean).join(", ");
        const description = [
          `Тип: ${s.kind}`,
          `Преподаватель: ${s.teacherName}`,
          s.note ? `Важно: ${s.note}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        lines.push(
          "BEGIN:VEVENT",
          `UID:${s.id}@deka.example`,
          `DTSTAMP:${now}`,
          `DTSTART:${dt(day.dateIso, s.start)}`,
          `DTEND:${dt(day.dateIso, s.end)}`,
          `SUMMARY:${esc(`${s.subjectName} (${s.kind})`)}`,
          location ? `LOCATION:${esc(location)}` : "LOCATION:",
          `DESCRIPTION:${esc(description)}`,
          "BEGIN:VALARM",
          "TRIGGER:-PT15M",
          "ACTION:DISPLAY",
          `DESCRIPTION:${esc(`Через 15 минут: ${s.subjectName}`)}`,
          "END:VALARM",
          "END:VEVENT"
        );
      }
    }
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 требует CRLF-переводы строк
  return lines.join("\r\n");
}
