import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mskNow } from "@/lib/time";
import fs from "node:fs";
import path from "node:path";

/**
 * Проверка живости прототипа: публичный ответ без персональных данных.
 * Используется Docker-healthcheck (docker-compose.yml), мониторингом
 * доступности и жюри для быстрой проверки «сервер жив».
 * 200 — приложение и база работают; 503 — база недоступна.
 */

export const dynamic = "force-dynamic";

function appVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "dev";
  } catch {
    return "dev";
  }
}

export async function GET() {
  let dbOk = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }

  return NextResponse.json(
    {
      ok: dbOk,
      service: "deka-dekanat",
      version: appVersion(),
      db: dbOk ? "ok" : "fail",
      date: mskNow().date,
      uptimeSec: Math.round(process.uptime()),
    },
    { status: dbOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
