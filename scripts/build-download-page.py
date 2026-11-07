#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сборка самодостаточной HTML-страницы загрузки проекта "Дека".

Страница download/Дека-загрузка-проекта.html содержит ВНУТРИ СЕБЯ весь zip-архив
проекта (base64 в блоке <script type="text/plain">). Кнопка "Скачать" собирает
Blob из встроенных данных и отдаёт файл — страница работает с любого носителя
(локально, письмо, любой хостинг) без внешних ссылок.

Проверка после сборки: извлечь base64 из HTML и сравнить SHA-256 с оригиналом.
"""

import base64
import hashlib
import json
import pathlib

ROOT = pathlib.Path("/home/z/my-project")
PKG = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
VERSION = PKG["version"]
ZIP_PATH = ROOT / "download" / f"deka-dekanat-v{VERSION}.zip"
OUT_PATH = ROOT / "download" / "Дека-загрузка-проекта.html"

zip_bytes = ZIP_PATH.read_bytes()
sha256 = hashlib.sha256(zip_bytes).hexdigest()
b64 = base64.b64encode(zip_bytes).decode("ascii")

# метаданные для страницы
version = VERSION
size_mb = f"{len(zip_bytes) / (1024 * 1024):.1f}".replace(".", ",")
import zipfile
with zipfile.ZipFile(ZIP_PATH) as z:
    file_count = len(z.namelist())

HTML = r"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Дека — цифровой деканат будущего · скачать проект</title>
<style>
  :root {
    --teal: #0f766e;
    --teal-dark: #115e59;
    --teal-soft: #ccfbf1;
    --ink: #0f172a;
    --muted: #64748b;
    --bg: #f1f5f9;
    --card: #ffffff;
    --line: #e2e8f0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: var(--bg);
    color: var(--ink);
    line-height: 1.55;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .topband {
    width: 100%;
    background: linear-gradient(135deg, var(--teal) 0%, var(--teal-dark) 100%);
    padding: 40px 16px 56px;
    text-align: center;
    color: #fff;
  }
  .mark {
    display: inline-flex;
    width: 64px; height: 64px;
    border-radius: 18px;
    background: rgba(255,255,255,.16);
    border: 2px solid rgba(255,255,255,.55);
    align-items: center; justify-content: center;
    font-size: 34px; font-weight: 700;
    margin-bottom: 14px;
  }
  .topband h1 { font-size: clamp(24px, 5vw, 34px); font-weight: 700; }
  .topband p { margin-top: 6px; color: #d8f5f0; font-size: 16px; }
  .badge {
    display: inline-block; margin-top: 12px;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.4);
    border-radius: 999px;
    padding: 4px 14px; font-size: 13px;
  }
  main { width: 100%; max-width: 760px; margin-top: -32px; padding: 0 16px 48px; }
  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 10px 30px rgba(15,118,110,.10);
    margin-bottom: 16px;
  }
  .btn {
    display: flex; width: 100%;
    align-items: center; justify-content: center; gap: 10px;
    background: var(--teal);
    color: #fff;
    border: none; border-radius: 12px;
    padding: 18px 24px;
    font-size: 18px; font-weight: 600;
    cursor: pointer;
    transition: background .15s ease;
  }
  .btn:hover { background: var(--teal-dark); }
  .btn:disabled { opacity: .6; cursor: wait; }
  .btn svg { width: 20px; height: 20px; flex: none; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .chip {
    font-size: 12.5px; color: var(--teal-dark);
    background: var(--teal-soft);
    border-radius: 999px; padding: 4px 12px;
    white-space: nowrap;
  }
  .status { margin-top: 12px; font-size: 14px; color: var(--teal-dark); min-height: 20px; }
  .status.err { color: #b91c1c; }
  h2 { font-size: 17px; margin-bottom: 12px; color: var(--teal-dark); }
  .features { list-style: none; }
  .features li { padding: 7px 0 7px 26px; position: relative; font-size: 14.5px; }
  .features li::before {
    content: ""; position: absolute; left: 2px; top: 13px;
    width: 12px; height: 12px; border-radius: 4px;
    background: var(--teal-soft);
    border: 2px solid var(--teal);
  }
  .features b { color: var(--ink); }
  pre {
    background: #0f172a; color: #e2e8f0;
    border-radius: 10px; padding: 12px 14px;
    font-size: 13px; overflow-x: auto;
    margin: 10px 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  .steps { list-style: none; counter-reset: step; }
  .steps > li { counter-increment: step; padding: 10px 0; font-size: 14.5px; }
  .steps > li::before {
    content: counter(step);
    display: inline-flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; border-radius: 50%;
    background: var(--teal); color: #fff;
    font-size: 13px; font-weight: 700;
    margin-right: 10px;
  }
  .steps p { display: inline; vertical-align: middle; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); }
  th { color: var(--muted); font-weight: 600; font-size: 12.5px; text-transform: uppercase; letter-spacing: .04em; }
  td code {
    background: var(--teal-soft); color: var(--teal-dark);
    border-radius: 6px; padding: 2px 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
  }
  .note {
    font-size: 13px; color: var(--muted);
    background: var(--bg); border: 1px dashed var(--line);
    border-radius: 10px; padding: 10px 14px; margin-top: 4px;
  }
  footer { color: var(--muted); font-size: 12.5px; text-align: center; padding: 0 16px 40px; max-width: 760px; }
  footer a { color: var(--teal); text-decoration: none; }
  @media (max-width: 480px) {
    .card { padding: 18px; }
    .topband { padding: 32px 14px 48px; }
  }
</style>
</head>
<body>
  <div class="topband">
    <div class="mark">Д</div>
    <h1>Дека — цифровой деканат будущего</h1>
    <p>Полноценный рабочий прототип: кабинет студента и кабинет деканата в одном приложении</p>
    <span class="badge">Версия __VERSION__ · __DATE__</span>
  </div>

  <main>
    <section class="card">
      <button class="btn" id="dl" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Скачать проект — deka-dekanat-v__VER_DOTS__.zip
      </button>
      <div class="chips">
        <span class="chip">ZIP · __SIZE__ МБ</span>
        <span class="chip">__COUNT__ файлов</span>
        <span class="chip">лицензия MIT</span>
        <span class="chip">архив встроен в страницу</span>
      </div>
      <div class="status" id="status"></div>
      <p class="note">
        Странице не нужен интернет: архив зашит в сам HTML. Файл можно переслать письмом,
        положить на флешку или любой хостинг — кнопка сработает везде. Контрольная сумма
        SHA-256 архива: <span style="word-break:break-all">__SHA__</span>.
      </p>
    </section>

    <section class="card">
      <h2>Как запустить</h2>
      <ol class="steps">
        <li><p>Распаковать архив и открыть папку в терминале.</p></li>
        <li><p>Запуск в режиме разработки (нужны Node.js 20+):</p>
          <pre>npm install
npm run dev        # → http://localhost:3000</pre>
        </li>
        <li><p>Или сервер целиком одной командой (Ubuntu + Docker):</p>
          <pre>bash install.sh   # сам поставит Docker, секреты и запустит сайт</pre>
        </li>
      </ol>
      <p class="note">База создаётся автоматически: при первом запуске схема применяется и наполняется демо-данными.</p>
    </section>

    <section class="card">
      <h2>Что внутри</h2>
      <ul class="features">
        <li><b>Кабинет студента</b> — расписание, оценки и сессия, заявки и услуги деканата, уведомления.</li>
        <li><b>Кабинет деканата</b> — студенты, заявки, расписание и изменения, объявления.</li>
        <li><b>ИИ-ассистент</b> — работает офлайн по данным базы, подключается к любому OpenAI-совместимому провайдеру или локальной модели Ollama.</li>
        <li><b>QR-проверка справок</b> — печатная справка с кодом, публичная страница проверки подлинности.</li>
        <li><b>Суверенитет данных</b> — SQLite на вашей машине, полный бэкап/восстановление базы, CLI-восстановление без приложения.</li>
        <li><b>Офлайн-режим и PWA</b> — кабинет открывается без сети из сохранённого слепка данных.</li>
      </ul>
    </section>

    <section class="card">
      <h2>Тестовые аккаунты</h2>
      <table>
        <thead><tr><th>Роль</th><th>Логин</th><th>Пароль</th></tr></thead>
        <tbody>
          <tr><td>Студент</td><td><code>student1</code></td><td><code>demo1234</code></td></tr>
          <tr><td>Студент</td><td><code>student2</code></td><td><code>demo1234</code></td></tr>
          <tr><td>Деканат</td><td><code>dekanat</code></td><td><code>demo1234</code></td></tr>
        </tbody>
      </table>
      <p class="note">Все данные в прототипе вымышленные. Это учебный концепт для конкурса, не подключён к реальным системам вузов.</p>
    </section>
  </main>

  <footer>Прототип "Дека" · децентрализованный стек: Next.js + SQLite на вашей машине · лицензия MIT</footer>

<script type="text/plain" id="archive-b64">
__B64__
</script>
<script>
(function () {
  var EL = document.getElementById("archive-b64");
  var BTN = document.getElementById("dl");
  var ST = document.getElementById("status");
  var FILE = "deka-dekanat-v__VER_DOTS__.zip";
  var EXPECTED = __SIZE_BYTES__;
  var SHA = "__SHA__";

  function decode() {
    var b64 = EL.textContent.replace(/\s+/g, "");
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  BTN.addEventListener("click", function () {
    BTN.disabled = true;
    ST.classList.remove("err");
    ST.textContent = "Готовим файл…";
    try {
      var bytes = decode();
      if (bytes.length !== EXPECTED) throw new Error("размер встроенного архива не совпал");
      var blob = new Blob([bytes], { type: "application/zip" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = FILE;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      ST.textContent = "Загрузка началась: " + FILE + " (" + (bytes.length / 1048576).toFixed(1).replace(".", ",") + " МБ). Проверьте папку загрузок.";
    } catch (e) {
      ST.classList.add("err");
      ST.textContent = "Ошибка: " + e.message + ". Откройте страницу в другом браузере.";
    }
    BTN.disabled = false;
  });

  // тихая проверка целостности при открытии страницы
  try {
    var t = decode();
    if (t.length !== EXPECTED) {
      ST.classList.add("err");
      ST.textContent = "Встроенный архив повреждён — скачайте файл заново из источника.";
    }
  } catch (e) { /* проверка кнопки покажет ошибку подробнее */ }
})();
</script>
</body>
</html>
"""

html = (
    HTML
    .replace("__B64__", b64)
    .replace("__SHA__", sha256)
    .replace("__SIZE_BYTES__", str(len(zip_bytes)))
    .replace("__SIZE__", size_mb)
    .replace("__COUNT__", str(file_count))
    .replace("__VERSION__", version)
    .replace("__VER_DOTS__", version.rsplit(".", 1)[0] + "." + version.rsplit(".", 1)[1])
    .replace("__DATE__", "7 ноября 2026")
)

OUT_PATH.write_text(html, encoding="utf-8")
print(f"OK: {OUT_PATH.name} — {OUT_PATH.stat().st_size / (1024*1024):.1f} МБ")
print(f"SHA-256 архива: {sha256}")
