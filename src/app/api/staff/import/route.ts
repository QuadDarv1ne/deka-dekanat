import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-helpers";
import { readAcademicFile } from "@/lib/academic-file";
import {
  importRowDisplay,
  isImportKind,
  parseAcademicTable,
  type ImportIssue,
} from "@/lib/academic-import";
import { validateImportRows } from "@/lib/academic-import-server";

/**
 * Предпросмотр импорта оценок или расписания.
 * Файл читается на сервере, строки проверяются по базе, но ничего не записывается:
 * деканат видит ошибки и подтверждает импорт отдельным запросом.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму" }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "");
  if (!isImportKind(kind)) {
    return NextResponse.json({ error: "Неизвестный тип импорта" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Выберите файл CSV или XLSX" }, { status: 400 });
  }

  try {
    const matrix = await readAcademicFile(file);
    const parsed = parseAcademicTable(kind, matrix);
    const dbIssues = await validateImportRows(kind, parsed.rows);
    const issues: ImportIssue[] = [...parsed.issues, ...dbIssues];

    return NextResponse.json({
      kind,
      headers: parsed.headers,
      rows: parsed.rows,
      preview: parsed.rows.slice(0, 20).map((row) => importRowDisplay(kind, row)),
      total: parsed.total,
      valid: parsed.rows.length,
      issues,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось разобрать таблицу" },
      { status: 400 }
    );
  }
}
