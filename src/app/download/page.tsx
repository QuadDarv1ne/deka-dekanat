import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileArchive, Github, Home, ShieldCheck } from "lucide-react";
import fs from "node:fs";
import path from "node:path";

/**
 * Публичная страница скачивания прототипа (без входа в систему).
 * Архивы лежат в public/ и раздаются как статика: /deka-dekanat-v<версия>.zip.
 * Версия и размеры читаются при сборке — страницу не нужно править вручную.
 */

export const metadata: Metadata = {
  title: "Скачать прототип — Дека",
  description: "Скачайте полный рабочий проект «Дека — цифровой деканат будущего»: исходный код, Docker, инструкция запуска.",
};

// ── Версия и параметры архивов (на момент сборки) ────────────────────────────
function projectVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "1.0.0";
  } catch {
    return "1.0.0";
  }
}

const VERSION = projectVersion();
const ZIP_NAME = `deka-dekanat-v${VERSION}.zip`;
const TGZ_NAME = `deka-dekanat-v${VERSION}.tar.gz`;

function archiveSize(name: string): number | null {
  try {
    return fs.statSync(path.join(process.cwd(), "public", name)).size;
  } catch {
    return null;
  }
}

const zipSize = archiveSize(ZIP_NAME);
const tgzSize = archiveSize(TGZ_NAME);

function mb(bytes: number | null): string {
  if (bytes == null) return "";
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}

const FEATURES: Array<{ title: string; text: string }> = [
  { title: "Кабинет студента", text: "расписание, оценки и сессия, заявки и услуги деканата, уведомления." },
  { title: "Кабинет деканата", text: "студенты, заявки, расписание и изменения, объявления." },
  { title: "ИИ-ассистент", text: "работает офлайн по данным базы, подключается к любому OpenAI-совместимому провайдеру или локальной модели Ollama." },
  { title: "QR-проверка справок", text: "печатная справка с кодом, публичная страница проверки подлинности /verify." },
  { title: "Суверенитет данных", text: "SQLite на вашей машине, полный бэкап/восстановление базы одной кнопкой и из CLI." },
  { title: "Офлайн-режим и PWA", text: "кабинет открывается без сети из сохранённого слепка данных." },
];

const ACCOUNTS: Array<[string, string]> = [
  ["Студент", "student1"],
  ["Студент", "student2"],
  ["Деканат", "dekanat"],
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Шапка */}
      <div className="w-full bg-gradient-to-br from-teal-700 to-teal-900 px-4 pb-14 pt-10 text-center text-white">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/50 bg-white/10 text-3xl font-bold">
          Д
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Дека — цифровой деканат будущего</h1>
        <p className="mt-1 text-sm text-teal-100 sm:text-base">
          Полноценный рабочий прототип: кабинет студента и кабинет деканата в одном приложении
        </p>
        <span className="mt-3 inline-block rounded-full border border-white/40 bg-white/10 px-3.5 py-1 text-xs">
          Версия {VERSION}
        </span>
      </div>

      <main className="mx-auto -mt-8 max-w-2xl px-4 pb-12">
        {/* Скачивание */}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-teal-900/10 sm:p-6">
          <a
            href={`/${ZIP_NAME}`}
            download
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-teal-700 px-6 py-4 text-lg font-semibold text-white transition hover:bg-teal-800"
          >
            <Download className="h-5 w-5" />
            Скачать проект — {ZIP_NAME}
          </a>
          <a
            href={`/${TGZ_NAME}`}
            download
            className="mt-2.5 flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-teal-700 bg-white px-6 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
          >
            <FileArchive className="h-4 w-4" />
            То же самое в tar.gz{tgzSize ? ` · ${mb(tgzSize)}` : ""}
          </a>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-800">ZIP{zipSize ? ` · ${mb(zipSize)}` : ""}</span>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-800">лицензия MIT</span>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-800">работает без зарубежных сервисов</span>
          </div>
          <p className="mt-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            Архив — полный исходный код репозитория: приложение, схема БД, демо-данные, Docker и
            docker-compose, install.sh для VPS одной командой, GitHub Actions (CI + релиз), README
            и DEPLOY.md. Секретов и персональных данных внутри нет — всё генерируется при установке.
          </p>
        </section>

        {/* Как запустить */}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-3 text-base font-bold text-teal-800">Как запустить</h2>
          <ol className="list-none space-y-2 text-sm">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">1</span>
              <span>Распаковать архив и открыть папку в терминале.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">2</span>
              <div>
                <span>Запуск в режиме разработки (нужны Node.js 20+):</span>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 px-3.5 py-2.5 font-mono text-xs text-slate-100">npm install{"\n"}npm run dev        # → http://localhost:3000</pre>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">3</span>
              <div>
                <span>Или сервер целиком одной командой (Ubuntu + Docker):</span>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 px-3.5 py-2.5 font-mono text-xs text-slate-100">bash install.sh   # сам поставит Docker, секреты и запустит сайт</pre>
              </div>
            </li>
          </ol>
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            База создаётся автоматически: при первом запуске схема применяется и наполняется демо-данными.
          </p>
        </section>

        {/* Что внутри */}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-3 text-base font-bold text-teal-800">Что внутри</h2>
          <ul className="space-y-2 text-sm">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-teal-700" />
                <span>
                  <b>{f.title}</b> — {f.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Тестовые аккаунты */}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-3 text-base font-bold text-teal-800">Тестовые аккаунты</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2 font-semibold">Роль</th>
                <th className="py-2 pr-2 font-semibold">Логин</th>
                <th className="py-2 font-semibold">Пароль</th>
              </tr>
            </thead>
            <tbody>
              {ACCOUNTS.map(([role, login]) => (
                <tr key={login} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{role}</td>
                  <td className="py-2 pr-2">
                    <code className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-xs text-teal-800">{login}</code>
                  </td>
                  <td className="py-2">
                    <code className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-xs text-teal-800">demo1234</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            Все данные в прототипе вымышленные. Это учебный концепт для конкурса, не подключён к реальным системам вузов.
          </p>
        </section>

        <div className="flex flex-col items-center gap-2.5 pb-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
          >
            <Home className="h-4 w-4" />
            Открыть прототип в браузере
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Github className="h-3.5 w-3.5" />
            Децентрализованный стек: Next.js + SQLite на вашей машине · лицензия MIT
          </span>
        </div>
      </main>
    </div>
  );
}
