#!/usr/bin/env node
/**
 * Файловый снапшот базы SQLite прототипа "Дека".
 *
 * Запуск: npm run db:snapshot   (или bun run db:snapshot)
 *
 * Копирует db/custom.db в db/snapshots/deka-<дата-время>.db и оставляет
 * последние 20 снапшотов (старые удаляются). Это "холодная" копия уровня
 * файла — самый быстрый способ зафиксировать состояние перед экспериментом
 * или обновлением. Полная логическая копия (JSON со всеми таблицами) —
 * через кабинет деканата: Профиль → "Полный бэкап (JSON)".
 *
 * Восстановление снапшота: остановите приложение и замените файл:
 *   cp db/snapshots/deka-<штамп>.db db/custom.db
 * Если сервер запущен — сначала остановите его (docker compose stop deka),
 * иначе копия может не захватить последние записи.
 */
import fs from "node:fs";
import path from "node:path";

const KEEP = 20;
const root = process.cwd();
const dbFile = path.join(root, "db", "custom.db");
const dir = path.join(root, "db", "snapshots");

if (!fs.existsSync(dbFile)) {
  console.error("✗ База db/custom.db не найдена. Сначала выполните: npm run db:push");
  process.exit(1);
}

fs.mkdirSync(dir, { recursive: true });

// имя штампуем в московском времени (UTC+3)
const msk = new Date(Date.now() + 3 * 3600 * 1000);
const pad = (n) => String(n).padStart(2, "0");
const stamp =
  `${msk.getUTCFullYear()}${pad(msk.getUTCMonth() + 1)}${pad(msk.getUTCDate())}` +
  `-${pad(msk.getUTCHours())}${pad(msk.getUTCMinutes())}${pad(msk.getUTCSeconds())}`;
const dest = path.join(dir, `deka-${stamp}.db`);
fs.copyFileSync(dbFile, dest);
const sizeKb = Math.round(fs.statSync(dest).size / 1024);
console.log(`✓ Снапшот: ${path.relative(root, dest)} (${sizeKb} КБ)`);

// оставляем только KEEP самых свежих
const all = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".db"))
  .sort();
for (const old of all.slice(0, Math.max(0, all.length - KEEP))) {
  fs.unlinkSync(path.join(dir, old));
  console.log(`  удалён старый: ${old}`);
}
console.log(`Всего снапшотов: ${Math.min(all.length + 1, KEEP)}. Восстановление: cp db/snapshots/deka-<штамп>.db db/custom.db`);
