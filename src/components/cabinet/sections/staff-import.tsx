"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/components/cabinet/use-api";
import { cn } from "@/lib/utils";

type ImportKind = "grades" | "schedule";

type ImportPreview = {
  kind: ImportKind;
  headers: string[];
  rows: Record<string, unknown>[];
  preview: string[][];
  total: number;
  valid: number;
  issues: { row: number; message: string }[];
};

type ImportResult = { created: number; updated: number; notified: number };

const TABS: { key: ImportKind; label: string; hint: string }[] = [
  { key: "grades", label: "Оценки", hint: "Контрольные точки: модули, коллоквиумы, лабораторные" },
  { key: "schedule", label: "Расписание", hint: "Пары группы по дням недели: время, аудитория, преподаватель" },
];

export function StaffImport() {
  const [kind, setKind] = useState<ImportKind>("grades");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tab = TABS.find((item) => item.key === kind)!;

  function reset() {
    setFileName(null);
    setPreview(null);
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    setPreview(null);
    setFileName(file.name);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const res = await fetch("/api/staff/import", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as ImportPreview & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Не удалось прочитать файл");
      setPreview(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось прочитать файл");
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  }

  async function confirm() {
    if (!preview) return;
    setCommitting(true);
    setError(null);
    try {
      const data = await apiSend<ImportResult>("/api/staff/import/commit", "POST", {
        kind,
        rows: preview.rows,
      });
      setResult(data);
      setPreview(null);
      setFileName(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить импорт");
    } finally {
      setCommitting(false);
    }
  }

  const hasIssues = Boolean(preview?.issues.length);
  const canConfirm = Boolean(preview && preview.valid > 0 && !hasIssues && !committing);

  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Импорт учебных данных</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          CSV или XLSX: сначала предпросмотр и проверка, запись — только после подтверждения
        </p>
      </div>

      {/* Тип импорта */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setKind(item.key);
              reset();
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              kind === item.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[13.5px] font-semibold">{tab.label}</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{tab.hint}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={`/api/staff/import/template?kind=${kind}`}>
              <Download className="h-4 w-4" />
              Шаблон CSV
            </a>
          </Button>
        </div>

        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onFile}
            aria-label="Файл импорта"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed bg-background/60 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
            <span className="text-[13px] font-semibold">{busy ? "Читаем таблицу…" : fileName ?? "Выбрать CSV или XLSX"}</span>
            <span className="text-[11px] text-muted-foreground">до 1 МБ и 200 строк; первый лист книги Excel</span>
          </button>
        </div>

        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Оценки сопоставляются по логину студента. Расписание — по группе, дню недели и времени начала: существующая пара обновится.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/5 p-3.5">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-destructive" />
          <p className="text-[12.5px] leading-snug text-destructive">{error}</p>
        </div>
      )}

      {result && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-lime-600/25 bg-lime-600/5 p-3.5" role="status">
          <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-lime-700 dark:text-lime-400" />
          <div>
            <p className="text-[13px] font-semibold text-lime-800 dark:text-lime-300">Импорт завершён</p>
            <p className="mt-0.5 text-[12px] leading-snug text-lime-800/80 dark:text-lime-300/80">
              Создано: {result.created}, обновлено: {result.updated}, уведомлений: {result.notified}.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 shrink-0" onClick={() => setResult(null)} aria-label="Закрыть">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {preview && (
        <section className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-bold tracking-tight">Предпросмотр</h2>
              <p className="text-[11.5px] text-muted-foreground">
                {preview.total} строк · корректных {preview.valid}
                {hasIssues ? ` · ошибок ${preview.issues.length}` : ""}
                {preview.valid > preview.preview.length ? ` · показаны первые ${preview.preview.length}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} disabled={committing}>
                Другой файл
              </Button>
              <Button size="sm" onClick={confirm} disabled={!canConfirm} className="gap-1.5">
                {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Подтвердить импорт
              </Button>
            </div>
          </div>

          {hasIssues && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Исправьте ошибки в файле — импорт заблокирован
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[11.5px] leading-snug text-amber-900/90 dark:text-amber-200/90">
                {preview.issues.slice(0, 50).map((issue, index) => (
                  <li key={`${issue.row}-${index}`}>
                    {issue.row > 0 ? `Строка ${issue.row}: ` : ""}
                    {issue.message}
                  </li>
                ))}
                {preview.issues.length > 50 && <li>…и ещё {preview.issues.length - 50}</li>}
              </ul>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="overflow-x-auto thin-scrollbar">
              <table className="w-full min-w-[720px] border-collapse text-left text-[11.5px]">
                <thead>
                  <tr className="border-b bg-muted/60">
                    {preview.headers.map((header) => (
                      <th key={header} className="whitespace-nowrap px-2.5 py-2 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row, index) => (
                    <tr key={index} className="border-b last:border-0">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="max-w-[220px] truncate px-2.5 py-1.5" title={cell}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Ничего не записано, пока вы не нажмёте «Подтвердить импорт». Запись выполняется одной транзакцией.
          </p>
        </section>
      )}
    </div>
  );
}
