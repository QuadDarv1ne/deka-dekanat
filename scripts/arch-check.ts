/**
 * Архитектурные инварианты проекта.
 *
 * Проверяем то, что легко нарушить случайно и трудно заметить на ревью:
 *  — прямой доступ к БД (Prisma) только вне клиентских компонентов;
 *  — клиентские секции не импортируют серверные модули;
 *  — имена файлов и каталогов — только ASCII (переносимость архива/сборки);
 *  — service worker не кэширует /api/* (персональные данные).
 *
 * Запуск: npm run test:arch
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");

let passed = 0;
const failures: string[] = [];

function ok(condition: boolean, label: string) {
  if (condition) passed++;
  else failures.push(label);
}

/** Рекурсивный обход каталога с отбором файлов по расширению. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

const files = walk(srcDir);
const rel = (p: string) => path.relative(root, p).replace(/\\/g, "/");

/* ---------- 1. ASCII-имена файлов и каталогов ---------- */
const nonAscii = files.filter((f) => !/^[\x20-\x7E]+$/.test(rel(f)));
ok(nonAscii.length === 0, `имена файлов только ASCII (нарушено: ${nonAscii.map(rel).join(", ")})`);

/* ---------- 2. Prisma-доступ только из серверных модулей ---------- */
// db импортируется из @/lib/db; клиентские компоненты ("use client") его не используют
const clientFiles = files.filter((f) => {
  if (!/\.(tsx?|ts)$/.test(f)) return false;
  const text = readFileSync(f, "utf8");
  return /^\s*["']use client["']/.test(text);
});
const clientDbImport = clientFiles.filter((f) => /from\s+["']@\/lib\/db["']/.test(readFileSync(f, "utf8")));
ok(
  clientDbImport.length === 0,
  `клиентские компоненты не импортируют Prisma (нарушено: ${clientDbImport.map(rel).join(", ")})`
);

/* ---------- 3. Клиентские секции не тянут серверные модули ---------- */
const serverOnly = ["@/lib/auth", "@/lib/api-helpers", "@/lib/db", "@/lib/backup-core"];
const leaks: string[] = [];
for (const f of clientFiles) {
  const text = readFileSync(f, "utf8");
  for (const mod of serverOnly) {
    if (new RegExp(`from\\s+["']${mod.replace(/[/@]/g, (c) => "\\" + c)}["']`).test(text)) {
      leaks.push(`${rel(f)} → ${mod}`);
    }
  }
}
ok(leaks.length === 0, `клиентские компоненты не импортируют серверные модули (${leaks.join("; ")})`);

/* ---------- 4. Service worker не кэширует API ---------- */
const swPath = path.join(root, "public", "sw.js");
const sw = readFileSync(swPath, "utf8");
ok(/url\.pathname\.startsWith\(["']\/api\/["']\)/.test(sw), "sw.js: запросы /api/* исключены из кэша");
ok(!/\.then\(\(\)\s*=>\s*self\.skipWaiting\(\)\)/.test(sw), "sw.js: установка не активирует новую версию сама");
ok(/APPLY_UPDATE/.test(sw), "sw.js: обновление применяется по сообщению APPLY_UPDATE");

/* ---------- 5. Файлы схемы и политики на месте ---------- */
ok(files.some((f) => rel(f) === "src/lib/request-policy.ts"), "есть общая политика переходов статусов");
ok(files.some((f) => rel(f) === "src/lib/audit.ts"), "есть модуль аудита действий");

/* ---------- итог ---------- */
if (failures.length) {
  console.error(`Архитектурных проверок провалено: ${failures.length}\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`Архитектурные проверки: ${passed} пройдено — всё в порядке.`);
