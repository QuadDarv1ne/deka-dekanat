#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
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

const isLocalBin = cmd === "prisma" || cmd === "tsx" || cmd === "next";
const exec = isLocalBin ? (process.platform === "win32" ? "npx.cmd" : "npx") : cmd;
const execArgs = isLocalBin ? [cmd, ...args] : args;

const child = spawnSync(exec, execArgs, {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
});

process.exit(child.status ?? 1);
