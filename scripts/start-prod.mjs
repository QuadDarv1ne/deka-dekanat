#!/usr/bin/env node
/**
 * Production-лаунчер "Деки": самодостаточный старт в любой среде.
 *
 * Зачем: платформа деплоя (как и голый сервер/CI) не знает про песочницу, где
 * собирался проект. При деплое нет ни .env (он gitignored), ни файла базы
 * db/custom.db (тоже gitignored), а путь в .env — абсолютный. Раньше сервер
 * стартовал, но Prisma не находила DATABASE_URL → "/" отдавал 500 → health-check
 * деплоя падал ("Sorry, there was a problem deploying the code").
 *
 * Что делает:
 *  1. находит корень проекта и убеждается, что db/ существует;
 *  2. задаёт DATABASE_URL (если не задан извне, напр. docker-compose) —
 *     абсолютный путь file:<корень>/db/custom.db, работает где угодно;
 *  3. если файла базы нет (чистый деплой из git) — применяет схему
 *     (prisma db push) и наполняет демо-данными (scripts/seed.ts);
 *  4. запускает standalone-сервер Next.js (.next/standalone/server.js).
 *
 * Переменные окружения (все необязательные):
 *  PORT        — порт сервера (по умолчанию 3000, платформа подставляет свою);
 *  DATABASE_URL — если задан, используется как есть (docker-compose, Docker);
 *  DEKA_SKIP_SEED — "1" запрещает автосев (схема всё равно применяется).
 *
 * Безопасность данных: seed запускается только для ПУСТОЙ базы. Сам скрипт
 * seed.ts тоже не перезаписывает непустую базу, поэтому перезапуск сервера
 * никогда не приводит к потере уже накопленных данных.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");

const dbDir = path.join(root, "db");
const dbFile = path.join(dbDir, "custom.db");
const serverJs = path.join(root, ".next", "standalone", "server.js");

// ── 1. Корень и каталог базы ────────────────────────────────────────────────
try {
  mkdirSync(dbDir, { recursive: true });
} catch (err) {
  console.error("[deka-start] не удалось создать каталог db/:", err.message);
}

// ── 2. DATABASE_URL: извне (Docker) → как есть; иначе вычисляем сами ────────
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${dbFile}`;
}
console.log(`[deka-start] DATABASE_URL = ${process.env.DATABASE_URL}`);

// ── 3. Чистый деплой без базы: схема + демо-данные ──────────────────────────
if (!existsSync(dbFile)) {
  console.log("[deka-start] файла базы нет (чистый деплой) — применяю схему и наполняю демо-данными…");
  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

  const push = spawnSync(process.execPath, [prismaCli, "db", "push", "--accept-data-loss"], {
    cwd: root,
    stdio: "inherit",
  });
  if (push.status !== 0) {
    console.error("[deka-start] prisma db push завершился с ошибкой — старт прерван.");
    process.exit(push.status ?? 1);
  }

  if (process.env.DEKA_SKIP_SEED !== "1") {
    const seed = spawnSync(process.execPath, [tsxCli, path.join("scripts", "seed.ts")], {
      cwd: root,
      stdio: "inherit",
    });
    if (seed.status !== 0) {
      console.error("[deka-start] seed завершился с ошибкой — старт прерван.");
      process.exit(seed.status ?? 1);
    }
  }
}

// ── 4. Запуск standalone-сервера ─────────────────────────────────────────────
if (!existsSync(serverJs)) {
  console.error(
    "[deka-start] не найден .next/standalone/server.js — сначала выполните \"npm run build\"."
  );
  process.exit(1);
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const child = spawn(process.execPath, [serverJs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
