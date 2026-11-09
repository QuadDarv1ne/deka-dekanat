#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbDir = path.join(root, "db");
const dbFile = path.join(dbDir, "custom.db");

mkdirSync(dbDir, { recursive: true });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${dbFile}`;
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("[ensure-db-env] no command provided");
  process.exit(1);
}

// Локальные бинарники запускаем напрямую через node — это обходит ограничение
// Windows (CVE-2024-27980), при котором spawnSync с shell:false не может
// запускать .cmd-обёртки (npx.cmd, npm.cmd) без shell:true.
const localBins = {
  prisma: path.join("node_modules", "prisma", "build", "index.js"),
  tsx: path.join("node_modules", "tsx", "dist", "cli.mjs"),
  next: path.join("node_modules", "next", "dist", "bin", "next"),
};

let exec = process.execPath;
let execArgs;
const rel = localBins[cmd];
if (rel) {
  const cli = path.join(root, rel);
  if (!existsSync(cli)) {
    console.error(`[ensure-db-env] не найден локальный бинарник: ${cli}`);
    process.exit(1);
  }
  execArgs = [cli, ...args];
} else {
  exec = cmd;
  execArgs = args;
}

const child = spawnSync(exec, execArgs, {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
});

if (child.error) {
  console.error("[ensure-db-env] spawnSync ошибка:", child.error.message);
  process.exit(1);
}

process.exit(child.status ?? 1);
