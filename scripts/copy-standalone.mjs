#!/usr/bin/env node
/**
 * Копирует статику и public-файлы в standalone-сборку Next.js.
 *
 * Зачем: в package.json раньше были юниксовые `cp -r`, которые не существуют
 * на Windows. fs.cpSync (Node 16.7+) работает на всех платформах одинаково.
 *
 * Запуск: node scripts/copy-standalone.mjs (вызывается из npm run build)
 */
import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");

const jobs = [
  { from: path.join(nextDir, "static"), to: path.join(nextDir, "standalone", ".next", "static") },
  { from: path.join(root, "public"), to: path.join(nextDir, "standalone", "public") },
];

let missing = false;
for (const { from, to } of jobs) {
  if (!existsSync(from)) {
    console.error(`[copy-standalone] источник не найден: ${from}`);
    missing = true;
    continue;
  }
  cpSync(from, to, { recursive: true });
  console.log(`[copy-standalone] ${path.relative(root, from)} → ${path.relative(root, to)}`);
}

process.exit(missing ? 1 : 0);
