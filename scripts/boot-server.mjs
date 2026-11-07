#!/usr/bin/env node
/**
 * Автозапуск продакшн-сервера "Деки" на порту 3000.
 *
 * Окружение Z.ai при каждой загрузке песочницы выполняет `bun run db:push`
 * (см. boot-лог платформы), поэтому запуск сервера прицеплен в конец этого
 * скрипта в package.json. Логика идемпотентна и безопасна при повторных вызовах:
 *   1) если на :3000 кто-то уже слушает — ничего не делаем;
 *   2) если standalone-сборки нет — сначала собираем (`npm run build`);
 *   3) иначе поднимаем .next/standalone/server.js в фоне (detached, nohup),
 *      логи — в logs/server.log.
 *
 * Ручной запуск: node scripts/boot-server.mjs [--check]
 *   --check  только проверить состояние, сервер не запускать (код выхода 0 — жив).
 */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STANDALONE = path.join(ROOT, ".next", "standalone", "server.js");
const LOG_DIR = path.join(ROOT, "logs");
const LOG = path.join(LOG_DIR, "server.log");
const PORT = Number(process.env.PORT || 3000);
const ONLY_CHECK = process.argv.includes("--check");

/** Жив ли порт: TCP-соединение к 127.0.0.1:PORT. */
function portAlive(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: PORT });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

/** Ждать появления порта до timeoutMs. */
async function waitPort(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await portAlive(800)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: "inherit", ...opts });
    p.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.once("error", reject);
  });
}

async function main() {
  if (await portAlive()) {
    console.log(`[boot-server] порт ${PORT} уже занят — сервер работает, пропускаем запуск.`);
    return;
  }
  if (ONLY_CHECK) {
    console.error(`[boot-server] порт ${PORT} свободен — сервер НЕ запущен.`);
    process.exit(1);
  }

  if (!fs.existsSync(STANDALONE)) {
    console.log("[boot-server] standalone-сборки нет — собираю (npm run build)…");
    await run("npm", ["run", "build"]);
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const out = fs.openSync(LOG, "a");
  const child = spawn("node", [STANDALONE], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", out, out],
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "0.0.0.0",
      NODE_ENV: "production",
    },
  });
  child.unref();

  const up = await waitPort(25000);
  if (up) {
    console.log(`[boot-server] сервер "Дека" поднят на :${PORT} (pid ${child.pid}), лог: ${LOG}`);
  } else {
    console.error(`[boot-server] сервер не поднялся за 25 c — смотрите ${LOG}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[boot-server] ошибка:", err.message);
  process.exit(1);
});
