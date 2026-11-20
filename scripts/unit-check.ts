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
import {
  importRowDisplay,
  importTemplate,
  normalizeImportRow,
  parseAcademicTable,
} from "../src/lib/academic-import";
import { normalizeCardToken } from "../src/lib/student-card";
import {
  cardVerifyPath,
} from "../src/lib/student-card";
import {
  isNumericMark,
  summarizeGrades,
  gpaOf,
} from "../src/lib/grades";
import { announcementVisible, greetingFor } from "../src/lib/api-helpers";

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

/* ---------- импорт учебных данных ---------- */
const gradeTable = [
  ["Логин", "Дисциплина", "Преподаватель", "Вид", "Название", "Баллы", "МаксБаллов", "Оценка", "Дата", "Комментарий"],
  ["student1", "Математический анализ", "Демидова Е. П.", "Модуль 2", "Баллы за 2-й модуль", "35", "40", "", "2026-11-09", ""],
  ["student1", "Базы данных", "Хайдаров Р. Р.", "Лабораторные", "Лабораторная №4", "", "", "5", "09.11.2026", "Зачтено"],
];
const gradeParsed = parseAcademicTable("grades", gradeTable);
eq(gradeParsed.rows.length, 2, "импорт оценок: обе строки разобраны");
eq(gradeParsed.issues.length, 0, "импорт оценок: ошибок нет");
eq((gradeParsed.rows[0] as { score: number | null }).score, 35, "импорт оценок: баллы разобраны");
eq((gradeParsed.rows[1] as { mark: string | null }).mark, "5", "импорт оценок: оценка разобрана");
eq((gradeParsed.rows[1] as { dateIso: string }).dateIso, "2026-11-09", "импорт оценок: дата ДД.ММ.ГГГГ приведена к ISO");
eq(importRowDisplay("grades", gradeParsed.rows[0])[0], "student1", "импорт оценок: предпросмотр начинается с логина");

const badGrade = parseAcademicTable("grades", [
  gradeTable[0],
  ["student1", "Математический анализ", "Демидова Е. П.", "Модуль", "Контрольная", "50", "40", "", "2026-11-09", ""],
]);
eq(badGrade.issues.length, 1, "импорт оценок: баллы больше максимума отклонены");
ok(badGrade.issues[0].message.includes("больше максимума"), "импорт оценок: понятная ошибка по баллам");

const scheduleTable = [
  ["Группа", "ДеньНедели", "Начало", "Окончание", "Дисциплина", "Вид", "Аудитория", "Корпус", "Преподаватель"],
  ["ПИ-231", "Понедельник", "09:00", "10:30", "Математический анализ", "Лекция", "А-312", "Главный корпус", "Демидова Е. П."],
];
const scheduleParsed = parseAcademicTable("schedule", scheduleTable);
eq(scheduleParsed.rows.length, 1, "импорт расписания: строка разобрана");
eq((scheduleParsed.rows[0] as { weekday: number }).weekday, 1, "импорт расписания: день недели разобран");
eq((scheduleParsed.rows[0] as { startMin: number }).startMin, 540, "импорт расписания: время начала разобрано");
eq((scheduleParsed.rows[0] as { endMin: number }).endMin, 630, "импорт расписания: время окончания разобрано");

let missingHeader = false;
try {
  parseAcademicTable("grades", [["Логин"], ["student1"]]);
} catch {
  missingHeader = true;
}
ok(missingHeader, "импорт: отсутствие обязательных столбцов отклонено");

const normalized = normalizeImportRow(
  "grades",
  { login: "student1", subjectName: "Базы данных", teacherName: "Хайдаров Р. Р.", kind: "Модуль", title: "Модуль 1", score: "20", maxScore: "50", dateIso: "2026-11-09" },
  2
);
eq((normalized as { score: number | null }).score, 20, "импорт: подтверждение принимает строки предпросмотра");

ok(importTemplate("grades").startsWith("\uFEFF"), "шаблон CSV: BOM для Excel");
ok(importTemplate("schedule").includes("ДеньНедели"), "шаблон CSV: содержит заголовки расписания");

/* ---------- проверка студенческого ---------- */
eq(
  normalizeCardToken("https://deka.example/verify/card/0123456789ABCDEF0123456789ABCDEF"),
  "0123456789abcdef0123456789abcdef",
  "студенческий: токен извлекается из ссылки и приводится к нижнему регистру"
);
eq(normalizeCardToken("мусор"), null, "студенческий: мусорный ввод отклонён");
eq(
  cardVerifyPath("0123456789abcdef0123456789abcdef"),
  "/verify/card/0123456789abcdef0123456789abcdef",
  "студенческий: путь проверки формируется корректно"
);

/* ---------- успеваемость ---------- */
const gradeEntries = [
  { id: "g1", subjectName: "Матанализ", teacherName: "Иванов", kind: "Модуль 1", title: "Модуль 1", score: 40, maxScore: 50, mark: null, date: new Date("2026-10-15"), comment: null },
  { id: "g2", subjectName: "Матанализ", teacherName: "Иванов", kind: "Модуль 2", title: "Модуль 2", score: 30, maxScore: 50, mark: null, date: new Date("2026-11-15"), comment: null },
  { id: "g3", subjectName: "Матанализ", teacherName: "Иванов", kind: "Коллоквиум", title: "Колл. 1", score: null, maxScore: null, mark: "5", date: new Date("2026-11-01"), comment: null },
  { id: "g4", subjectName: "Физика", teacherName: "Петров", kind: "Зачёт", title: "Зачёт", score: null, maxScore: null, mark: "Зачтено", date: new Date("2026-12-01"), comment: null },
  { id: "g5", subjectName: "Физика", teacherName: "Петров", kind: "Модуль 1", title: "Модуль 1", score: 60, maxScore: 100, mark: null, date: new Date("2026-11-20"), comment: null },
];
const subjects = summarizeGrades(gradeEntries);
eq(subjects.length, 2, "grades: две дисциплины");
eq(subjects[0].subjectName, "Матанализ", "grades: сортировка по проценту (Матанализ 70% > Физика 60%)");
eq(subjects[0].points, 70, "grades: накопленные баллы Матанализ");
eq(subjects[0].percent, 70, "grades: процент Матанализ");
eq(subjects[0].projected, "hor", "grades: прогноз «хорошо» для 70%");
eq(subjects[1].percent, 60, "grades: процент Физика");
eq(subjects[1].projected, "udov", "grades: прогноз «удовлетворительно» для 60%");
eq(subjects[0].marks.length, 1, "grades: одна числовая оценка в Матанализ");
eq(subjects[0].entries.length, 3, "grades: все записи включены");
eq(subjects[0].entries[0].id, "g2", "grades: сортировка записей по дате (новые сверху)");

eq(isNumericMark("5"), true, "isNumericMark: «5» — числовая");
eq(isNumericMark("Зачтено"), false, "isNumericMark: «Зачтено» — не числовая");
eq(isNumericMark(null), false, "isNumericMark: null — не числовая");

const gpa = gpaOf(subjects);
eq(gpa, 5, "gpaOf: средний балл из оценок (только «5» = 5.0)");
eq(gpaOf([]), null, "gpaOf: пустой список — null");

const riskSubjects = summarizeGrades([
  { id: "r1", subjectName: "Химия", teacherName: "Сидоров", kind: "Модуль", title: "Модуль 1", score: 20, maxScore: 100, mark: "2", date: new Date("2026-11-01"), comment: null },
]);
eq(riskSubjects[0].projected, "risk", "grades: 20% → зона риска");

/* ---------- объявления: видимость ---------- */
eq(announcementVisible({ audience: "ALL" }, null), true, "announcementVisible: ALL виден всем");
eq(announcementVisible({ audience: "GROUP:ПИ-231" }, { groupName: "ПИ-231", faculty: "ИТ" }), true, "announcementVisible: группа совпадает");
eq(announcementVisible({ audience: "GROUP:ПИ-231" }, { groupName: "ЭК-321", faculty: "Экономика" }), false, "announcementVisible: другая группа");
eq(announcementVisible({ audience: "FACULTY:ИТ" }, { groupName: "ПИ-231", faculty: "ИТ" }), true, "announcementVisible: факультет совпадает");
eq(announcementVisible({ audience: "FACULTY:ИТ" }, { groupName: "ЭК-321", faculty: "Экономика" }), false, "announcementVisible: другой факультет");
eq(announcementVisible({ audience: "GROUP:ПИ-231" }, null), false, "announcementVisible: нет профиля — не видно");

/* ---------- приветствие по времени суток ---------- */
eq(greetingFor(6 * 60), "Доброе утро", "greetingFor: 6:00 — утро");
eq(greetingFor(13 * 60), "Добрый день", "greetingFor: 13:00 — день");
eq(greetingFor(20 * 60), "Добрый вечер", "greetingFor: 20:00 — вечер");
eq(greetingFor(3 * 60), "Доброй ночи", "greetingFor: 3:00 — ночь");

/* ---------- итог ---------- */
if (failures.length) {
  console.error(`Проверок провалено: ${failures.length}\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`Юнит-проверки: ${passed} пройдено — всё в порядке.`);
