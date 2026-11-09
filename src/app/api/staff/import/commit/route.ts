import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-helpers";
import {
  ImportError,
  isImportKind,
  normalizeImportRow,
  type ImportIssue,
  type ImportRow,
} from "@/lib/academic-import";
import { commitImport, validateImportRows } from "@/lib/academic-import-server";

/**
 * Подтверждение импорта. Строки приходят из предпросмотра, но заново
 * нормализуются и проверяются: клиент не может обойти правила.
 * Запись, уведомления и аудит выполняются одной транзакцией.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  let body: { kind?: string; rows?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  if (!isImportKind(kind)) {
    return NextResponse.json({ error: "Неизвестный тип импорта" }, { status: 400 });
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "Нет строк для импорта" }, { status: 400 });
  }
  if (body.rows.length > 200) {
    return NextResponse.json({ error: "За один раз можно импортировать не более 200 строк" }, { status: 400 });
  }

  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  body.rows.forEach((input, index) => {
    const rowNumber =
      input && typeof input === "object" && Number.isSafeInteger((input as { row?: unknown }).row)
        ? Number((input as { row: number }).row)
        : index + 2;
    try {
      rows.push(normalizeImportRow(kind, input, rowNumber));
    } catch (error) {
      issues.push({
        row: rowNumber,
        message: error instanceof ImportError ? error.message : "Не удалось проверить строку.",
      });
    }
  });

  if (issues.length) {
    return NextResponse.json({ error: "В таблице есть ошибки", issues }, { status: 400 });
  }

  const dbIssues = await validateImportRows(kind, rows);
  if (dbIssues.length) {
    return NextResponse.json({ error: "В таблице есть ошибки", issues: dbIssues }, { status: 400 });
  }

  try {
    const result = await commitImport(kind, rows, {
      id: auth.session.uid,
      name: auth.session.name,
      role: auth.session.role,
    });
    return NextResponse.json({ ok: true, kind, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось сохранить импорт" },
      { status: 500 }
    );
  }
}
