import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-helpers";
import { restoreBackupInto, validateBackupData } from "@/lib/backup-core";

/**
 * Восстановление базы из полной резервной копии (файл формата «deka-backup»,
 * который отдаёт GET /api/backup). Данные валидируются ДО транзакции; сама
 * замена идёт в одной транзакции — при любой ошибке база остаётся прежней.
 *
 * Логика валидации и замены — общая с CLI-восстановлением
 * (scripts/restore-cli.ts, `npm run db:restore`), см. src/lib/backup-core.ts.
 *
 * Безопасность: только сотрудник деканата; требуется явное подтверждение
 * confirm:"REPLACE" — случайная замена данных исключена.
 */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  let body: { format?: string; version?: number; confirm?: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать файл: это не JSON" }, { status: 400 });
  }

  if (body.format !== "deka-backup") {
    return NextResponse.json(
      { error: "Это не резервная копия «Дека» (ожидался формат deka-backup). Личные данные студента (deka-personal-data) сюда не подходят." },
      { status: 400 }
    );
  }
  if (typeof body.version === "number" && body.version > 1) {
    return NextResponse.json({ error: "Копия сделана более новой версией «Дека» — обновите приложение" }, { status: 400 });
  }
  if (body.confirm !== "REPLACE") {
    return NextResponse.json({ error: "Нет подтверждения замены данных" }, { status: 400 });
  }
  const d = body.data;
  if (!d || typeof d !== "object") {
    return NextResponse.json({ error: "В файле нет данных (data)" }, { status: 400 });
  }

  const invalid = validateBackupData(d);
  if (invalid) {
    return NextResponse.json({ error: `Нарушена целостность копии: ${invalid}` }, { status: 400 });
  }

  try {
    const restored = await db.$transaction((tx) => restoreBackupInto(tx, d));

    return NextResponse.json({
      ok: true,
      restored,
      message: "База восстановлена из резервной копии. Все данные заменены содержимым файла.",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "неизвестная ошибка";
    return NextResponse.json(
      { error: `Восстановление не удалось, база осталась прежней. Причина: ${detail}` },
      { status: 400 }
    );
  }
}
