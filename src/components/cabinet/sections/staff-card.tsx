"use client";

import { useState } from "react";
import { BadgeCheck, IdCard, Loader2, ScanLine, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiSend } from "@/components/cabinet/use-api";
import { formatDateSafe } from "@/lib/time";

type CardResult = {
  student: {
    name: string;
    login: string;
    faculty: string;
    program: string;
    course: number;
    groupName: string;
    recordBook: string;
    studyForm: string;
    status: string;
    entryYear: number;
    curatorName: string | null;
    cardIssuedAt: string | null;
  };
  verifiedBy: string;
};

export function StaffCard() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CardResult | null>(null);

  async function verify() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiSend<CardResult>("/api/staff/card/verify", "POST", { code });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось проверить студенческий");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Проверка студенческого</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Отсканируйте QR студента или вставьте ссылку — карточка откроется после проверки
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <Label htmlFor="card-code">Ссылка из QR-кода или код карточки</Label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <Input
            id="card-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="https://…/verify/card/… или 32-символьный код"
            autoComplete="off"
            className="font-mono text-[12.5px]"
          />
          <Button onClick={verify} disabled={busy || code.trim().length < 8} className="shrink-0 gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            Проверить
          </Button>
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
          Проверка доступна сотрудникам деканата и фиксируется в журнале действий. Токен из QR не содержит ФИО студента.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/5 p-3.5">
          <ShieldX className="mt-0.5 h-4.5 w-4.5 shrink-0 text-destructive" />
          <p className="text-[12.5px] leading-snug text-destructive">{error}</p>
        </div>
      )}

      {result && (
        <section className="overflow-hidden rounded-2xl border bg-card" aria-live="polite">
          <div className="flex items-center gap-3 bg-lime-600/10 px-4 py-3">
            <BadgeCheck className="h-7 w-7 shrink-0 text-lime-700 dark:text-lime-400" />
            <div>
              <p className="text-[14px] font-bold text-lime-800 dark:text-lime-300">Студенческий действителен</p>
              <p className="text-[11.5px] text-lime-800/80 dark:text-lime-300/80">Проверил: {result.verifiedBy}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-[13px] font-bold text-white">
              {result.student.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold leading-tight">{result.student.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">логин: {result.student.login}</p>
            </div>
            <IdCard className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
          <dl className="grid gap-x-5 gap-y-1.5 px-4 py-3 text-[12px] sm:grid-cols-2">
            {[
              ["Факультет", result.student.faculty],
              ["Направление", result.student.program],
              ["Курс", `${result.student.course} курс`],
              ["Группа", result.student.groupName],
              ["Зачётка", result.student.recordBook],
              ["Форма обучения", result.student.studyForm],
              ["Статус", result.student.status],
              ["Куратор", result.student.curatorName ?? "—"],
              ["Карточка выпущена", result.student.cardIssuedAt ? formatDateSafe(result.student.cardIssuedAt) : "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1.5 last:border-0 sm:block">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium sm:text-left">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
