/**
 * Быстрые регрессионные проверки чистых функций: время/семестры и iCalendar.
 * Не требует базы и сервера: `npm run test:unit`.
 */
import {
  addDaysIso,
  docValidUntilIso,
  formatDateSafe,
  mskDateIso,
  semesterFor,
  weekStartIso,
} from "../src/lib/time";
import { buildIcs } from "../src/lib/ics";
import { canTransition, allowedTransitions, isTerminal } from "../src/lib/request-policy";
import { clockAnswer } from "../src/lib/clock";
import { docVerifyPath } from "../src/lib/doc-verify";

let passed = 0;
const failures: string[] = [];

function eq(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
  } else {
    failures.push(`${label}: ожидалось ${JSON.stringify(expected)}, получено ${JSON.stringify(actual)}`);
  }
}

function ok(condition: boolean, label: string) {
  if (condition) passed++;
  else failures.push(label);
}

/* ---------- московская дата ---------- */
// 22:30 UTC — это уже следующие сутки в Москве (UTC+3).
eq(mskDateIso("2026-11-08T22:30:00Z"), "2026-11-09", "mskDateIso переходит на следующие сутки в 22:30Z");
eq(mskDateIso("2026-11-08T20:59:00Z"), "2026-11-08", "mskDateIso не сдвигает вечер 08.11");
eq(mskDateIso("не дата"), "", "mskDateIso на мусоре возвращает пустую строку");
eq(formatDateSafe(null), "", "formatDateSafe(null) пустая строка");
eq(formatDateSafe("2026-11-08T22:30:00Z"), "9 ноября", "formatDateSafe считает дату по МСК");

/* ---------- неделя и арифметика дат ---------- */
eq(weekStartIso("2026-11-08"), "2026-11-02", "weekStartIso для воскресенья даёт понедельник");
eq(weekStartIso("2026-11-02"), "2026-11-02", "weekStartIso для понедельника не меняет дату");
eq(addDaysIso("2026-12-20", 30), "2027-01-19", "addDaysIso переходит через год");

/* ---------- срок действия справки ---------- */
// Выдача 08.11 22:30 UTC = 09.11 по МСК → срок до 09.12.
eq(docValidUntilIso("2026-11-08T22:30:00Z"), "2026-12-09", "docValidUntilIso считает 30 дней от МСК-даты");
eq(docValidUntilIso(null), "", "docValidUntilIso(null) пустая строка");

/* ---------- семестры ---------- */
const jan = semesterFor("2026-01-15");
eq([jan.kind, jan.label, jan.startIso, jan.endIso, jan.sessionLabel], [
  "autumn",
  "Осенний семестр",
  "2025-09-01",
  "2025-12-31",
  "Зимняя сессия",
], "январь — осенний семестр прошлого учебного года");

const feb = semesterFor("2026-02-01");
eq([feb.kind, feb.label, feb.startIso, feb.endIso, feb.sessionLabel], [
  "spring",
  "Весенний семестр",
  "2026-02-01",
  "2026-06-30",
  "Летняя сессия",
], "1 февраля начинается весенний семестр");

eq(semesterFor("2026-07-01").kind, "spring", "июль ещё весенний семестр");
eq(semesterFor("2026-08-15").kind, "summer", "август — каникулы");
const sep = semesterFor("2026-09-01");
eq([sep.kind, sep.startIso, sep.endIso], ["autumn", "2026-09-01", "2026-12-31"], "сентябрь начинает новый учебный год");
eq(semesterFor("2026-12-31").kind, "autumn", "31 декабря — осенний семестр");

/* ---------- iCalendar ---------- */
const ics = buildIcs({
  calName: "Расписание, группа ИС-21",
  weeks: [
    {
      days: [
        {
          dateIso: "2026-11-09",
          slots: [
            {
              id: "slot-1",
              dateIso: "2026-11-09",
              start: "09:30",
              end: "11:00",
              subjectName: "Математический анализ, часть 2; спецкурс по теории вероятностей и математической статистике",
              kind: "Лекция",
              room: "А-312",
              building: "Корпус А",
              teacherName: "Иванова И. И.",
              status: "ok",
            },
            {
              id: "slot-2",
              dateIso: "2026-11-09",
              start: "11:10",
              end: "12:40",
              subjectName: "Отменённая пара",
              kind: "Семинар",
              room: "Б-1",
              building: null,
              teacherName: "Петров П. П.",
              status: "cancelled",
            },
          ],
        },
        {
          dateIso: "2026-11-16",
          slots: [
            {
              id: "slot-1",
              dateIso: "2026-11-16",
              start: "09:30",
              end: "11:00",
              subjectName: "Математический анализ",
              kind: "Лекция",
              room: "А-312",
              building: "Корпус А",
              teacherName: "Иванова И. И.",
              status: "ok",
            },
          ],
        },
      ],
    },
  ],
});

ok(ics.endsWith("\r\n"), "ICS заканчивается CRLF");
ok(!/(^|[^\r])\n/.test(ics), "ICS не содержит одиночных LF");
ok(ics.includes("BEGIN:VCALENDAR") && ics.includes("END:VCALENDAR"), "ICS содержит границы календаря");

const lines = ics.split("\r\n").filter(Boolean);
const tooLong = lines.filter((line) => Buffer.byteLength(line, "utf8") > 75);
ok(tooLong.length === 0, `ICS: все строки не длиннее 75 октетов (нарушено: ${tooLong.length})`);

const uidLines = lines.filter((line) => line.startsWith("UID:"));
eq(uidLines.length, 2, "ICS: отменённая пара не попала в календарь");
ok(new Set(uidLines).size === uidLines.length, "ICS: UID уникальны для разных дат");
ok(uidLines.some((line) => line.includes("20261109")), "ICS: UID содержит дату пары");

const backslash = String.fromCharCode(92);
const summary = lines.find((line) => line.startsWith("SUMMARY:"));
ok(Boolean(summary && summary.includes(backslash + ",")), "ICS: запятая в названии экранирована");
ok(Boolean(summary && summary.includes(backslash + ";")), "ICS: точка с запятой в названии экранирована");

/* ---------- политика переходов статусов заявки ---------- */
ok(canTransition("STAFF", "NEW", "IN_PROGRESS"), "деканат: NEW → IN_PROGRESS разрешён");
ok(canTransition("STAFF", "IN_PROGRESS", "READY"), "деканат: IN_PROGRESS → READY разрешён");
ok(canTransition("STAFF", "READY", "DONE"), "деканат: READY → DONE разрешён");
ok(canTransition("STAFF", "NEW", "REJECTED"), "деканат: NEW → REJECTED разрешён");
ok(!canTransition("STAFF", "NEW", "DONE"), "деканат: нельзя перескочить NEW → DONE");
ok(!canTransition("STAFF", "DONE", "IN_PROGRESS"), "деканат: закрытую заявку не переоткрыть");
ok(!canTransition("STAFF", "CANCELLED", "IN_PROGRESS"), "деканат: отменённую заявку не вернуть");

ok(canTransition("STUDENT", "NEW", "CANCELLED"), "студент: отмена новой заявки разрешена");
ok(canTransition("STUDENT", "IN_PROGRESS", "CANCELLED"), "студент: отмена заявки в работе разрешена");
ok(!canTransition("STUDENT", "READY", "CANCELLED"), "студент: готовую заявку отменить нельзя");
ok(!canTransition("STUDENT", "NEW", "IN_PROGRESS"), "студент: не может двигать заявку по служебным статусам");
ok(!canTransition("GUEST", "NEW", "CANCELLED"), "неизвестная роль не может менять статус");

ok(isTerminal("DONE") && isTerminal("REJECTED") && isTerminal("CANCELLED"), "закрытые статусы распознаются");
eq(allowedTransitions("STAFF", "NEW"), ["IN_PROGRESS", "REJECTED"], "деканат: набор действий для NEW");
eq(allowedTransitions("STAFF", "DONE"), [], "деканат: для закрытой заявки действий нет");

/* ---------- серверные часы ассистента ---------- */
const clockNow = new Date("2026-11-08T07:15:00Z"); // 10:15 по Москве
const msk = clockAnswer("Сколько сейчас времени в Москве?", clockNow);
ok(Boolean(msk && msk.includes("10:15")), "часы: московское время считается верно");
ok(Boolean(msk && msk.includes("МСК, UTC+3")), "часы: подписана зона МСК");
ok(Boolean(clockAnswer("Который час?", clockNow)?.includes("10:15")), "часы: вопрос «который час» без зоны — МСК по умолчанию");
ok(Boolean(clockAnswer("Сколько времени в Новосибирске?", clockNow)?.includes("14:15")), "часы: новосибирское время (UTC+7)");
eq(clockAnswer("Сколько времени займёт пересдача?", clockNow), null, "часы: вопрос о длительности не перехватывается");
eq(clockAnswer("Расскажи про расписание", clockNow), null, "часы: обычный вопрос не перехватывается");
eq(clockAnswer("Сколько времени в Токио?", clockNow), null, "часы: неизвестная зона не перехватывается");
eq(clockAnswer("Сколько сейчас времени?", clockNow), clockAnswer("Сколько сейчас времени?", clockNow), "часы: ответ детерминирован");

/* ---------- ссылка проверки документа ---------- */
eq(
  docVerifyPath("СП-2026-0118", "DEKA-7Q2K-11AF"),
  `/verify?doc=${encodeURIComponent("СП-2026-0118.DEKA-7Q2K-11AF")}`,
  "ссылка проверки: формат /verify?doc=НОМЕР.КОД"
);

/* ---------- итог ---------- */
if (failures.length) {
  console.error(`Проверок провалено: ${failures.length}\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`Юнит-проверки: ${passed} пройдено — всё в порядке.`);
