import { parse } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";

/**
 * Чтение загруженной таблицы CSV/XLSX в матрицу значений.
 * Ограничения подобраны под ручной ввод деканата: до 1 МБ и 200 строк.
 * Файл разбирается в памяти процесса; внешние сервисы не используются.
 */

const MAX_BYTES = 1024 * 1024;
const MAX_ROWS = 201; // заголовок + 200 строк
const MAX_COLUMNS = 16;

function cellText(value: unknown, header: string): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const head = header.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").trim();
    if (head.includes("начало") || head.includes("окончание") || head === "start" || head === "end") {
      return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
    }
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const head = header.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").trim();
    if ((head.includes("начало") || head.includes("окончание")) && value >= 0 && value < 1) {
      const minutes = Math.round(value * 1440) % 1440;
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    }
    return String(value);
  }
  return String(value).trim();
}

function normalizeMatrix(raw: unknown[][]): unknown[][] {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("Таблица должна содержать заголовок и хотя бы одну строку.");
  }
  if (raw.length > MAX_ROWS) {
    throw new Error(`В таблице больше ${MAX_ROWS - 1} строк. Разделите файл на части.`);
  }
  if (raw.some((row) => !Array.isArray(row) || row.length > MAX_COLUMNS)) {
    throw new Error(`В таблице больше ${MAX_COLUMNS} столбцов. Скачайте шаблон.`);
  }
  const headers = raw[0].map((value) => String(value ?? "").replace(/^\uFEFF/, "").trim());
  if (new Set(headers).size !== headers.length || headers.some((header) => !header)) {
    throw new Error("Названия столбцов должны быть заполнены и не повторяться.");
  }
  return raw.map((row, rowIndex) =>
    row.map((value, column) => (rowIndex === 0 ? headers[column] : cellText(value, headers[column] ?? "")))
  );
}

export async function readAcademicFile(file: File): Promise<unknown[][]> {
  if (!file.size) throw new Error("Файл пустой.");
  if (file.size > MAX_BYTES) throw new Error("Выберите CSV или XLSX размером до 1 МБ.");

  let matrix: unknown[][];
  const name = file.name.toLocaleLowerCase("ru-RU");
  try {
    if (name.endsWith(".xlsx")) {
      matrix = (await readSheet(Buffer.from(await file.arrayBuffer()))) as unknown[][];
    } else if (name.endsWith(".csv")) {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
      const delimiter = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
      matrix = parse(text, {
        delimiter,
        bom: true,
        skip_empty_lines: true,
        max_record_size: 8000,
        relax_column_count: false,
      }) as unknown[][];
    } else {
      throw new Error("Поддерживаются файлы CSV и XLSX.");
    }
  } catch (error) {
    if (error instanceof Error && /^(Таблица|В таблице|Названия|Выберите|Файл|Поддерживаются)/.test(error.message)) {
      throw error;
    }
    throw new Error("Не удалось прочитать файл. Проверьте формат и размер таблицы.");
  }

  return normalizeMatrix(matrix);
}
