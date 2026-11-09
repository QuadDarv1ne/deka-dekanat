import { minutesToHHMM, mskNow } from "@/lib/time";

/**
 * Импорт учебных данных из CSV/XLSX.
 *
 * Здесь только чистые функции: разбор заголовков, проверка значений и
 * человекочитаемое представление строк. Доступ к БД и запись — в
 * `academic-import-server.ts`, чтобы правила можно было проверить без базы.
 */

export const IMPORT_KINDS = ["grades", "schedule"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export function isImportKind(value: string): value is ImportKind {
  return (IMPORT_KINDS as readonly string[]).includes(value);
}

/** Заголовки шаблона. Порядок совпадает с шаблоном, который скачивает деканат. */
export const IMPORT_HEADERS: Record<ImportKind, string[]> = {
  grades: ["Логин", "Дисциплина", "Преподаватель", "Вид", "Название", "Баллы", "МаксБаллов", "Оценка", "Дата", "Комментарий"],
  schedule: ["Группа", "ДеньНедели", "Начало", "Окончание", "Дисциплина", "Вид", "Аудитория", "Корпус", "Преподаватель"],
};

/** Заголовки таблицы предпросмотра (короче исходных, чтобы влезали на телефон). */
export const PREVIEW_HEADERS: Record<ImportKind, string[]> = {
  grades: ["Логин", "Дисциплина", "Преподаватель", "Вид", "Название", "Баллы", "Макс.", "Оценка", "Дата"],
  schedule: ["Группа", "День", "Время", "Дисциплина", "Вид", "Аудитория", "Корпус", "Преподаватель"],
};

const ALIASES: Record<string, string> = {
  логин: "login",
  login: "login",
  дисциплина: "subjectName",
  предмет: "subjectName",
  subject: "subjectName",
  преподаватель: "teacherName",
  teacher: "teacherName",
  вид: "kind",
  тип: "kind",
  "вид работы": "kind",
  вид_работы: "kind",
  название: "title",
  "контрольная точка": "title",
  title: "title",
  баллы: "score",
  score: "score",
  максбаллов: "maxScore",
  "макс. баллов": "maxScore",
  "макс баллов": "maxScore",
  максимум: "maxScore",
  maxscore: "maxScore",
  оценка: "mark",
  mark: "mark",
  дата: "dateIso",
  date: "dateIso",
  комментарий: "comment",
  comment: "comment",
  группа: "groupName",
  group: "groupName",
  деньнедели: "weekday",
  "день недели": "weekday",
  день: "weekday",
  weekday: "weekday",
  начало: "startMin",
  start: "startMin",
  окончание: "endMin",
  конец: "endMin",
  end: "endMin",
  аудитория: "room",
  кабинет: "room",
  room: "room",
  корпус: "building",
  building: "building",
};

const REQUIRED: Record<ImportKind, string[]> = {
  grades: ["login", "subjectName", "teacherName", "kind", "title"],
  schedule: ["groupName", "weekday", "startMin", "subjectName", "kind", "room", "teacherName"],
};

const SCHEDULE_KINDS: Record<string, string> = {
  лекция: "Лекция",
  lecture: "Лекция",
  практика: "Практика",
  "практическое занятие": "Практика",
  practice: "Практика",
  лаборатория: "Лаборатория",
  лабораторная: "Лаборатория",
  lab: "Лаборатория",
  электив: "Электив",
  elective: "Электив",
  экзамен: "Экзамен",
  exam: "Экзамен",
  зачет: "Зачёт",
  credit: "Зачёт",
  консультация: "Консультация",
  consultation: "Консультация",
};

const MARKS: Record<string, string> = {
  "5": "5",
  "4": "4",
  "3": "3",
  "2": "2",
  отлично: "5",
  хорошо: "4",
  удовлетворительно: "3",
  неудовлетворительно: "2",
  зачет: "Зачёт",
  незачет: "Незачёт",
};

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

function norm(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/\s+/g, " ");
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function integer(value: unknown, label: string, min: number, max: number): number {
  const raw = text(value);
  if (!raw) throw new ImportError(`${label}: значение не заполнено.`);
  if (!/^\d+$/.test(raw)) throw new ImportError(`${label}: нужно целое число.`);
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    throw new ImportError(`${label}: допустимо от ${min} до ${max}.`);
  }
  return n;
}

function parseDateIso(value: unknown): string {
  const raw = text(value);
  if (!raw) return mskNow().date;
  let iso = raw.slice(0, 10);
  const dotted = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dotted) {
    iso = `${dotted[3]}-${dotted[2].padStart(2, "0")}-${dotted[1].padStart(2, "0")}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new ImportError("Дата: используйте формат ГГГГ-ММ-ДД или ДД.ММ.ГГГГ.");
  }
  const d = new Date(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    throw new ImportError("Дата: такой календарной даты не существует.");
  }
  return iso;
}

function parseWeekday(value: unknown): number {
  const raw = norm(value);
  if (!raw) throw new ImportError("День недели: значение не заполнено.");
  if (/^[1-6]$/.test(raw)) return Number(raw);
  const map: Record<string, number> = {
    понедельник: 1,
    пн: 1,
    monday: 1,
    mon: 1,
    вторник: 2,
    вт: 2,
    tuesday: 2,
    tue: 2,
    среда: 3,
    ср: 3,
    wednesday: 3,
    wed: 3,
    четверг: 4,
    чт: 4,
    thursday: 4,
    thu: 4,
    пятница: 5,
    пт: 5,
    friday: 5,
    fri: 5,
    суббота: 6,
    сб: 6,
    saturday: 6,
    sat: 6,
  };
  const day = map[raw];
  if (!day) {
    if (["воскресенье", "вс", "sunday", "sun", "7"].includes(raw)) {
      throw new ImportError("День недели: занятия по воскресеньям не поддерживаются.");
    }
    throw new ImportError("День недели: укажите число 1–6 или название дня.");
  }
  return day;
}

function parseTime(value: unknown, label: string): number {
  const raw = text(value);
  if (!raw) throw new ImportError(`${label}: значение не заполнено.`);
  const normalized = raw.replace(",", ".").replace(".", ":");
  const m = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) {
      throw new ImportError(`${label}: некорректное время.`);
    }
    return h * 60 + min;
  }
  // Excel иногда отдаёт время долей суток (0,375 = 09:00).
  if (/^\d+(?:[.,]\d+)?$/.test(raw)) {
    const fraction = Number(raw.replace(",", "."));
    if (fraction >= 0 && fraction < 1) return Math.round(fraction * 1440) % 1440;
  }
  throw new ImportError(`${label}: используйте формат ЧЧ:ММ.`);
}

function normalizeMark(value: unknown): string | null {
  const raw = norm(value);
  if (!raw) return null;
  const mark = MARKS[raw];
  if (!mark) throw new ImportError("Оценка: допустимы 2–5, «Зачёт» или «Незачёт».");
  return mark;
}

function optionalScore(value: unknown, label: string): number | null {
  if (!text(value)) return null;
  return integer(value, label, 0, 1000);
}

export type GradeImportRow = {
  row: number;
  login: string;
  subjectName: string;
  teacherName: string;
  kind: string;
  title: string;
  score: number | null;
  maxScore: number | null;
  mark: string | null;
  dateIso: string;
  comment: string | null;
};

export type ScheduleImportRow = {
  row: number;
  groupName: string;
  weekday: number;
  startMin: number;
  endMin: number;
  subjectName: string;
  kind: string;
  room: string;
  building: string | null;
  teacherName: string;
};

export type ImportRow = GradeImportRow | ScheduleImportRow;

export type ImportIssue = { row: number; message: string };

export type ParsedImport = {
  headers: string[];
  rows: ImportRow[];
  issues: ImportIssue[];
  total: number;
};

function gradeRow(values: Record<string, unknown>, row: number): GradeImportRow {
  const login = text(values.login);
  const subjectName = text(values.subjectName);
  const teacherName = text(values.teacherName);
  const kind = text(values.kind) || "Модуль";
  const title = text(values.title) || `${kind} (импорт)`;
  if (!login) throw new ImportError("Логин: значение не заполнено.");
  if (!subjectName) throw new ImportError("Дисциплина: значение не заполнено.");
  if (!teacherName) throw new ImportError("Преподаватель: значение не заполнено.");
  if (login.length > 64 || subjectName.length > 160 || teacherName.length > 160 || title.length > 160) {
    throw new ImportError("Одно из текстовых значений слишком длинное.");
  }
  const score = optionalScore(values.score, "Баллы");
  let maxScore = optionalScore(values.maxScore, "МаксБаллов");
  const mark = normalizeMark(values.mark);
  if (score !== null && maxScore === null) maxScore = 100;
  if (score !== null && maxScore !== null && score > maxScore) {
    throw new ImportError("Баллы: значение больше максимума.");
  }
  if (score === null && mark === null) {
    throw new ImportError("Укажите баллы или оценку.");
  }
  return {
    row,
    login,
    subjectName,
    teacherName,
    kind,
    title,
    score,
    maxScore,
    mark,
    dateIso: parseDateIso(values.dateIso),
    comment: text(values.comment).slice(0, 500) || null,
  };
}

function scheduleRow(values: Record<string, unknown>, row: number): ScheduleImportRow {
  const groupName = text(values.groupName);
  const subjectName = text(values.subjectName);
  const room = text(values.room);
  const teacherName = text(values.teacherName);
  const kindRaw = norm(values.kind);
  const kind = SCHEDULE_KINDS[kindRaw];
  if (!groupName) throw new ImportError("Группа: значение не заполнено.");
  if (!subjectName) throw new ImportError("Дисциплина: значение не заполнено.");
  if (!room) throw new ImportError("Аудитория: значение не заполнена.");
  if (!teacherName) throw new ImportError("Преподаватель: значение не заполнено.");
  if (!kind) throw new ImportError("Вид: укажите лекцию, практику, лабораторию, электив, экзамен, зачёт или консультацию.");
  if (groupName.length > 32 || subjectName.length > 160 || room.length > 60 || teacherName.length > 160) {
    throw new ImportError("Одно из текстовых значений слишком длинное.");
  }
  const startMin = parseTime(values.startMin, "Начало");
  const endMin = text(values.endMin) ? parseTime(values.endMin, "Окончание") : startMin + 90;
  if (endMin <= startMin) throw new ImportError("Окончание: должно быть позже начала.");
  if (endMin > 1439) throw new ImportError("Окончание: пара не может заканчиваться после 23:59.");
  return {
    row,
    groupName,
    weekday: parseWeekday(values.weekday),
    startMin,
    endMin,
    subjectName,
    kind,
    room,
    building: text(values.building).slice(0, 80) || null,
    teacherName,
  };
}

/** Преобразует строку предпросмотра/JSON подтверждения в проверенную запись. */
export function normalizeImportRow(kind: ImportKind, input: unknown, row: number): ImportRow {
  if (!input || typeof input !== "object") throw new ImportError("Строка повреждена.");
  const values = input as Record<string, unknown>;
  return kind === "grades" ? gradeRow(values, row) : scheduleRow(values, row);
}

/** Разбирает матрицу (первая строка — заголовки) в записи и список ошибок по строкам. */
export function parseAcademicTable(kind: ImportKind, matrix: unknown[][]): ParsedImport {
  if (!Array.isArray(matrix) || matrix.length < 2) {
    throw new ImportError("Таблица должна содержать заголовок и хотя бы одну строку.");
  }
  const headerRow = matrix[0].map((v) => text(v));
  const columns = new Map<string, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const canonical = ALIASES[norm(headerRow[i])];
    if (!canonical) continue;
    if (columns.has(canonical)) {
      throw new ImportError(`Столбец «${headerRow[i]}» повторяется.`);
    }
    columns.set(canonical, i);
  }
  const missing = REQUIRED[kind].filter((key) => !columns.has(key));
  if (missing.length) {
    const labels = missing.map((key) => IMPORT_HEADERS[kind][headerKeyIndex(kind, key)] ?? key);
    throw new ImportError(`В таблице нет обязательных столбцов: ${labels.join(", ")}. Скачайте шаблон.`);
  }

  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const source = matrix[i];
    const values: Record<string, unknown> = {};
    for (const [key, index] of columns) values[key] = source[index] ?? "";
    if (!Object.values(values).some((v) => text(v))) continue; // пустая строка
    try {
      rows.push(kind === "grades" ? gradeRow(values, i + 1) : scheduleRow(values, i + 1));
    } catch (error) {
      issues.push({ row: i + 1, message: error instanceof Error ? error.message : "Не удалось разобрать строку." });
    }
  }
  if (!rows.length && !issues.length) throw new ImportError("В таблице нет данных.");
  return { headers: PREVIEW_HEADERS[kind], rows, issues, total: rows.length + issues.length };
}

function headerKeyIndex(kind: ImportKind, key: string): number {
  // Порядок canonical-ключей совпадает с IMPORT_HEADERS; нужен только для подписи ошибки.
  const order: Record<ImportKind, string[]> = {
    grades: ["login", "subjectName", "teacherName", "kind", "title", "score", "maxScore", "mark", "dateIso", "comment"],
    schedule: ["groupName", "weekday", "startMin", "endMin", "subjectName", "kind", "room", "building", "teacherName"],
  };
  return order[kind].indexOf(key);
}

/** Строка для таблицы предпросмотра. */
export function importRowDisplay(kind: ImportKind, row: ImportRow): string[] {
  if (kind === "grades") {
    const g = row as GradeImportRow;
    return [
      g.login,
      g.subjectName,
      g.teacherName,
      g.kind,
      g.title,
      g.score === null ? "" : String(g.score),
      g.maxScore === null ? "" : String(g.maxScore),
      g.mark ?? "",
      g.dateIso,
    ];
  }
  const s = row as ScheduleImportRow;
  return [
    s.groupName,
    String(s.weekday),
    `${minutesToHHMM(s.startMin)}–${minutesToHHMM(s.endMin)}`,
    s.subjectName,
    s.kind,
    s.room,
    s.building ?? "",
    s.teacherName,
  ];
}

/** CSV-шаблон с BOM и разделителем «;» — открывается в Excel и LibreOffice. */
export function importTemplate(kind: ImportKind): string {
  const lines =
    kind === "grades"
      ? [
          IMPORT_HEADERS.grades,
          ["student1", "Математический анализ", "Демидова Е. П.", "Модуль 2", "Баллы за 2-й модуль", "35", "40", "", mskNow().date, "Импорт из деканата"],
          ["student1", "Базы данных", "Хайдаров Р. Р.", "Лабораторные", "Лабораторная работа №4", "", "", "5", mskNow().date, "Зачтено"],
        ]
      : [
          IMPORT_HEADERS.schedule,
          ["ПИ-231", "1", "09:00", "10:30", "Математический анализ", "Лекция", "А-312", "Главный корпус", "Демидова Е. П."],
          ["ПИ-231", "3", "12:40", "14:10", "Веб-программирование", "Лаборатория", "216 (КТ)", "Корпус Б", "Полякова Д. А."],
        ];
  return `\uFEFF${lines.map((cells) => cells.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

function csvCell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
