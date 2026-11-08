import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, FileSearch, ScanLine, ShieldX } from "lucide-react";
import { db } from "@/lib/db";
import { docValidUntilIso, formatDateSafe } from "@/lib/time";

/**
 * Публичная проверка подлинности справки (без входа в систему).
 * QR-код на печатной справке ведёт сюда: /verify?doc=НОМЕР.КОД
 * Код проверки — такой же "ключ", как на госсервисах: без него
 * по номеру документ показать нельзя (защита от перебора номера).
 */

export const metadata: Metadata = {
  title: "Проверка подлинности документа — Дека",
  description: "Публичная проверка электронной справки университета Дека по номеру и коду проверки.",
};

export const dynamic = "force-dynamic";

type VerifyResult =
  | {
      kind: "valid";
      request: { number: string; typeTitle: string; status: string; readyAt: Date | null; createdAt: Date };
      student: { name: string; groupName: string; faculty: string; course: number };
    }
  | { kind: "notfound" }
  | { kind: "malformed" };

async function checkDoc(raw: string | undefined): Promise<VerifyResult> {
  const value = (raw ?? "").trim();
  if (!value) return { kind: "malformed" };

  const dot = value.indexOf(".");
  if (dot < 1 || dot === value.length - 1) return { kind: "malformed" };
  const number = value.slice(0, dot).trim().toUpperCase();
  const code = value.slice(dot + 1).trim().toUpperCase();
  // грубая защита от мусорных строк и сверхдлинного ввода:
  // номер — буквы/цифры/дефис, код — формат DEKA-XXXX-XXXX (как выдаёт деканат)
  if (!/^[-А-ЯA-Z0-9]{3,32}$/.test(number)) return { kind: "notfound" };
  if (!/^DEKA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return { kind: "notfound" };

  const request = await db.serviceRequest.findUnique({
    where: { number },
    include: { user: { include: { student: true } } },
  });
  if (!request || !request.docCode || request.docCode.toUpperCase() !== code) return { kind: "notfound" };
  if (request.status !== "READY" && request.status !== "DONE") return { kind: "notfound" };

  return {
    kind: "valid",
    request: {
      number: request.number,
      typeTitle: request.typeTitle,
      status: request.status,
      readyAt: request.readyAt,
      createdAt: request.createdAt,
    },
    student: {
      name: request.user.name,
      groupName: request.user.student?.groupName ?? "—",
      faculty: request.user.student?.faculty ?? "—",
      course: request.user.student?.course ?? 0,
    },
  };
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2 last:border-0">
      <dt className="shrink-0 text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[13px] font-medium leading-snug">{value}</dd>
    </div>
  );
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ doc?: string; number?: string; code?: string }> }) {
  const params = await searchParams;
  // QR передаёт doc=НОМЕР.КОД; ручная форма — number и code отдельно. Приводим к одному виду.
  const doc = params.doc ?? (params.number || params.code ? `${params.number ?? ""}.${params.code ?? ""}` : undefined);
  const result = await checkDoc(doc);
  const hasQuery = Boolean((doc ?? "").trim());

  const issuedAt = result.kind === "valid" ? result.request.readyAt ?? result.request.createdAt : null;
  const validUntil = issuedAt ? formatDateSafe(docValidUntilIso(issuedAt)) : null;
  const manualNumber = typeof doc === "string" && doc.includes(".") ? doc.split(".")[0] : "";

  return (
    <main className="flex min-h-dvh flex-col items-center bg-[#f6f5ef] px-4 py-8 sm:py-14 dark:bg-[#12181d]">
      <div className="w-full max-w-lg">
        {/* Шапка */}
        <header className="text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">Университет Дека</p>
          <h1 className="mt-1.5 text-[19px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Проверка подлинности документа
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
            Отсканируйте QR-код со справки или введите номер документа и код проверки вручную.
          </p>
        </header>

        {/* Результат */}
        <section className="mt-6" aria-live="polite">
          {result.kind === "valid" ? (
            <div className="overflow-hidden rounded-3xl border border-lime-600/25 bg-white shadow-sm dark:bg-card">
              <div className="flex items-center gap-3 bg-lime-600/10 px-5 py-4">
                <BadgeCheck className="h-8 w-8 shrink-0 text-lime-700 dark:text-lime-400" aria-hidden />
                <div>
                  <p className="text-[15.5px] font-bold text-lime-800 dark:text-lime-300">Документ подлинный</p>
                  <p className="text-[12px] leading-snug text-lime-800/80 dark:text-lime-300/80">
                    Реквизиты совпадают с записью в системе деканата
                  </p>
                </div>
              </div>
              <dl className="px-5 py-2">
                <DetailRow label="Документ" value={result.request.typeTitle} />
                <DetailRow label="Номер" value={<span className="font-mono">{result.request.number}</span>} />
                <DetailRow label="Студент" value={result.student.name} />
                <DetailRow
                  label="Обучение"
                  value={`${result.student.faculty}, ${result.student.course} курс, группа ${result.student.groupName}`}
                />
                <DetailRow label="Дата выдачи" value={formatDateSafe(issuedAt)} />
                <DetailRow label="Действует до" value={validUntil ?? "—"} />
                <DetailRow
                  label="Статус"
                  value={result.request.status === "DONE" ? "Выдан на руки" : "Готов к выдаче в деканате"}
                />
              </dl>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-destructive/25 bg-white shadow-sm dark:bg-card">
              <div className="flex items-center gap-3 bg-destructive/10 px-5 py-4">
                {hasQuery ? (
                  <ShieldX className="h-8 w-8 shrink-0 text-destructive" aria-hidden />
                ) : (
                  <FileSearch className="h-8 w-8 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div>
                  <p className="text-[15.5px] font-bold text-destructive">
                    {hasQuery ? "Документ не найден" : "Введите реквизиты документа"}
                  </p>
                  <p className="text-[12px] leading-snug text-destructive/80 dark:text-destructive/70">
                    {hasQuery
                      ? "Номер или код проверки не совпадают с записями системы. Если вы сомневаетесь в подлинности — обратитесь в деканат."
                      : "Отсканируйте QR-код со справки или заполните поля ниже."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Ручной ввод, если QR не сканируется */}
        <section className="mt-5 rounded-3xl border bg-white p-5 shadow-sm dark:bg-card" aria-labelledby="manual-heading">
          <h2 id="manual-heading" className="flex items-center gap-2 text-[13.5px] font-bold tracking-tight">
            <ScanLine className="h-4 w-4 text-primary" aria-hidden />
            Проверить вручную
          </h2>
          <form method="GET" action="/verify" className="mt-3 space-y-2.5">
            <div>
              <label htmlFor="doc-number" className="mb-1 block text-[12px] font-medium text-muted-foreground">
                Номер документа
              </label>
              <input
                id="doc-number"
                name="number"
                defaultValue={manualNumber}
                placeholder="СП-2026-0118"
                autoComplete="off"
                className="w-full rounded-xl border bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="doc-code" className="mb-1 block text-[12px] font-medium text-muted-foreground">
                Код проверки (под QR-кодом на справке)
              </label>
              <input
                id="doc-code"
                name="code"
                placeholder="DEKA-7Q2K-11AF"
                autoComplete="off"
                className="w-full rounded-xl border bg-background px-3 py-2 font-mono text-[13px] uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Проверить документ
            </button>
          </form>
        </section>

        <footer className="mt-6 space-y-1.5 text-center">
          <p className="text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
            Проверка выполняется без входа в систему: видны только реквизиты справки, личный кабинет недоступен.
          </p>
          <p className="text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
            Прототип конкурса "Цифровой деканат будущего". Все данные вымышленные.
          </p>
          <Link href="/" className="inline-block text-[12px] font-medium text-primary hover:underline">
            Перейти в кабинет "Дека"
          </Link>
        </footer>
      </div>
    </main>
  );
}
