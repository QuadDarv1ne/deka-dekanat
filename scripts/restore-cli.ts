/**
 * Восстановление базы "Дека" из полной резервной копии из командной строки —
 * когда приложение не поднимается (сбой, откат версии, чистый перенос).
 *
 * Запуск:  npm run db:restore -- <путь к файлу deka-backup JSON> [--yes]
 * Пример:  npm run db:restore -- db/deka-backup-2025-11-20.json
 *
 * Файл — тот же, что скачивается в кабинете деканата ("Полный бэкап (JSON)"),
 * или снятый через GET /api/backup (формат deka-backup).
 *
 * Меры безопасности:
 *  1. Файл полностью валидируется ДО записи (формат, структура, связи).
 *  2. Перед заменой автоматически делается страховочный снапшот текущей базы
 *     в db/snapshots/deka-pre-restore-<штамп>.db.
 *  3. Замена идёт в одной транзакции: при любой ошибке база остаётся прежней.
 *  4. Без флага --yes скрипт требует ввести REPLACE вручную.
 *
 * Логика валидации и замены — общая с POST /api/restore (src/lib/backup-core.ts).
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { backupCounts, restoreBackupInto, validateBackupData, BACKUP_VERSION, type BackupRow } from "../src/lib/backup-core";

const args = process.argv.slice(2);
const autoYes = args.includes("--yes");
const fileArg = args.find((a) => !a.startsWith("--"));

function die(msg: string, hint = ""): never {
  console.error(`✗ ${msg}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

/** Путь к файлу SQLite: DATABASE_URL из окружения или .env, относительный — от prisma/. */
function resolveDbFile(): string {
  let url = process.env.DATABASE_URL;
  if (!url) {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
        if (m && !line.trim().startsWith("#")) {
          url = m[1].replace(/^["']|["']$/g, "");
          break;
        }
      }
    }
  }
  const fallback = path.join(process.cwd(), "db", "custom.db");
  if (!url) return fallback;
  const m = url.match(/^file:(.+)$/);
  if (!m) return fallback; // не SQLite — путь к файлу не нужен
  const p = m[1];
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), "prisma", p);
}

/** Страховочный снапшот текущей базы (best-effort). */
function safetySnapshot(): string | null {
  const dbFile = resolveDbFile();
  if (!fs.existsSync(dbFile)) return null;
  const dir = path.join(process.cwd(), "db", "snapshots");
  fs.mkdirSync(dir, { recursive: true });
  const msk = new Date(Date.now() + 3 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${msk.getUTCFullYear()}${pad(msk.getUTCMonth() + 1)}${pad(msk.getUTCDate())}` +
    `-${pad(msk.getUTCHours())}${pad(msk.getUTCMinutes())}${pad(msk.getUTCSeconds())}`;
  const dest = path.join(dir, `deka-pre-restore-${stamp}.db`);
  try {
    fs.copyFileSync(dbFile, dest);
    return path.relative(process.cwd(), dest);
  } catch {
    return null;
  }
}

async function main() {
  // 1. Файл
  if (!fileArg) {
    die("укажите путь к файлу резервной копии", "Пример: npm run db:restore -- db/deka-backup-2025-11-20.json");
  }
  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) die(`файл не найден: ${filePath}`);

  let body: { format?: string; version?: number; data?: Record<string, unknown> };
  try {
    body = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    die("файл не является корректным JSON");
  }
  if (body.format !== "deka-backup") {
    die("это не резервная копия \"Дека\" (ожидался формат deka-backup)", "Личные данные студента (deka-personal-data) сюда не подходят.");
  }
  if (typeof body.version === "number" && body.version > BACKUP_VERSION) {
    die("копия сделана более новой версией \"Дека\" — обновите приложение");
  }
  const d = body.data;
  if (!d || typeof d !== "object") die("в файле нет данных (data)");

  const invalid = validateBackupData(d);
  if (invalid) die(`файл повреждён: ${invalid}`);

  // 2. Сводка и подтверждение
  const counts = backupCounts(d);
  console.log("Содержимое копии:");
  for (const [table, n] of Object.entries(counts)) console.log(`  ${table}: ${n}`);
  const logins = (d.users as BackupRow[]).map((u) => `${u.login} (${u.role})`).join(", ");
  console.log(`  пользователи: ${logins}`);

  if (!autoYes) {
    if (!process.stdin.isTTY) {
      die("stdin не терминал: подтвердите замену данных флагом --yes", "Пример: npm run db:restore -- файл.json --yes");
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question("Все текущие данные будут ЗАМЕНЕНЫ содержимым файла. Введите REPLACE для подтверждения: ")).trim();
    rl.close();
    if (answer !== "REPLACE") die("подтверждение не введено — база не изменена");
  }

  // 3. Страховочный снапшот
  const snap = safetySnapshot();
  if (snap) console.log(`✓ Страховочный снапшот текущей базы: ${snap}`);

  // 4. Восстановление в одной транзакции
  const prisma = new PrismaClient();
  try {
    const restored = await prisma.$transaction((tx) => restoreBackupInto(tx, d));
    console.log("✓ База восстановлена из резервной копии:");
    for (const [table, n] of Object.entries(restored)) console.log(`  ${table}: ${n}`);
    console.log("Перезапустите приложение — пользователи, история и пароли вернулись 1:1.");
  } catch (err) {
    die(
      `восстановление не удалось, база осталась прежней: ${err instanceof Error ? err.message : "неизвестная ошибка"}`,
      snap ? `Текущее состояние сохранено в ${snap}` : ""
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => die(`непредвиденная ошибка: ${err instanceof Error ? err.message : String(err)}`));
