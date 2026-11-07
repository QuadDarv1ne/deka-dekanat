#!/usr/bin/env node
/**
 * Гарантия наличия архивов для скачивания (public/deka-dekanat-v<версия>.zip/.tar.gz)
 * в ЛЮБОЙ среде деплоя.
 *
 * Проблема, которую решает: .gitattributes содержит
 *   public/deka-dekanat-* export-ignore
 * (иначе архив включал бы сам себя), поэтому при деплое из git-экспорта
 * (git archive, GitHub ZIP-ball, снапшот платформы) архивов в public/ нет,
 * и ссылки на странице /download ведут на 404.
 *
 * Решение: скрипт вызывается из «build» ПЕРЕД next build. Если архивов нет —
 * генерирует их из git-экспорта текущего HEAD; если .git нет — из рабочего
 * каталога (zip/tar CLI с исключениями). Если и CLI недоступны — просто
 * пропускает (страница /download скроет недоступные кнопки сама).
 *
 * Уже существующие архивы не пересобираются (быстрый повторный деплой).
 * Пересобрать принудительно: node scripts/make-archives.mjs --force
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const FORCE = process.argv.includes("--force");

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const VERSION = pkg.version || "1.0.0";
const ZIP = path.join(PUBLIC, `deka-dekanat-v${VERSION}.zip`);
const TGZ = path.join(PUBLIC, `deka-dekanat-v${VERSION}.tar.gz`);

const inGit = fs.existsSync(path.join(ROOT, ".git"));

/** Исключения для tar по рабочему каталогу (когда .git нет). */
const TAR_EXCLUDES = [
  "node_modules", ".next", "db", "logs", "upload", "download", "skills",
  ".git", ".env", "public/deka-dekanat-*",
];

function sh(cmd, args, cwd = ROOT) {
  return spawnSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "inherit"] });
}

function makeZipFromGit() {
  // git archive уважает export-ignore → без рекурсии, идентично GitHub-релизу
  const r = sh("git", ["archive", "--format=zip", `-o${ZIP}`, "HEAD"]);
  return r.status === 0 && fs.existsSync(ZIP);
}

function makeTgzFromGit() {
  const r = sh("git", ["archive", "--format=tar.gz", `-o${TGZ}`, "HEAD"]);
  return r.status === 0 && fs.existsSync(TGZ);
}

function makeZipFromTree() {
  if (!fs.existsSync("/usr/bin/zip") && !spawnSync("zip", ["-v"]).status) return false;
  const r = sh("zip", ["-qr", ZIP, ".", "-x", ...TAR_EXCLUDES.map((e) => `${e}/*`), ...TAR_EXCLUDES.map((e) => e === "public/deka-dekanat-*" ? "public/deka-dekanat-*" : `${e}`)]);
  return r.status === 0 && fs.existsSync(ZIP);
}

function makeTgzFromTree() {
  const r = sh("tar", ["-czf", TGZ, ...TAR_EXCLUDES.flatMap((e) => ["--exclude", e]), "-C", ROOT, "."]);
  return r.status === 0 && fs.existsSync(TGZ);
}

function main() {
  fs.mkdirSync(PUBLIC, { recursive: true });
  const haveZip = !FORCE && fs.existsSync(ZIP);
  const haveTgz = !FORCE && fs.existsSync(TGZ);

  if (haveZip && haveTgz) {
    console.log(`[make-archives] v${VERSION}: оба архива уже на месте — пропускаю.`);
    return;
  }

  let okZip = haveZip;
  let okTgz = haveTgz;

  if (inGit) {
    if (!okZip) okZip = makeZipFromGit();
    if (!okTgz) okTgz = makeTgzFromGit();
  } else {
    if (!okZip) okZip = makeZipFromTree();
    if (!okTgz) okTgz = makeTgzFromTree();
  }

  console.log(
    `[make-archives] v${VERSION}: zip ${okZip ? "готов" : "НЕТ"}, tar.gz ${okTgz ? "готов" : "НЕТ"}` +
      (inGit ? " (git export HEAD)" : " (рабочий каталог)")
  );
  if (!okZip && !okTgz) {
    console.warn("[make-archives] ни один архив не создан — /download скроет кнопки (не критично для сборки).");
  }
}

main();
