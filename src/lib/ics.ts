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

const BACKSLASH = String.fromCharCode(92);

/** Экранирование текста по RFC 5545. */
function esc(text: string): string {
  return text
    .replace(new RegExp(BACKSLASH + BACKSLASH, 'g'), BACKSLASH + BACKSLASH)
    .replace(/;/g, BACKSLASH + ';')
    .replace(/,/g, BACKSLASH + ',')
    .replace(new RegExp(String.fromCharCode(13) + '?' + String.fromCharCode(10), 'g'), BACKSLASH + 'n');
}

/**
 * Перенос длинной строки по RFC 5545: не больше 75 октетов UTF-8,
 * продолжение начинается с пробела. Считаем именно байты, а не символы:
 * кириллица в UTF-8 занимает по два байта.
 */
function foldLine(line: string): string[] {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    if (bytes + charBytes > 75) {
      parts.push(current);
      current = ` ${char}`;
      bytes = 1 + charBytes;
    } else {
      current += char;
      bytes += charBytes;
    }
  }
  parts.push(current);
  return parts;
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
          // UID уникален для конкретной даты: один и тот же слот повторяется
          // каждую неделю, и без даты календари склеивали бы события.
          `UID:${s.id}-${day.dateIso.replace(/-/g, "")}@deka.example`,
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
  // RFC 5545: строки не длиннее 75 октетов и CRLF-переводы строк
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`;
}
