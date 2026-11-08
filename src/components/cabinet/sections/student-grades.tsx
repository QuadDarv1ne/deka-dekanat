"use client";

import { useState } from "react";
import { Award, ChevronDown, GraduationCap, ListChecks, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared";
import { useApi } from "@/components/cabinet/use-api";
import { cn } from "@/lib/utils";
import { formatDateSafe } from "@/lib/time";

type Subject = {
  subjectName: string;
  teacherName: string;
  points: number;
  pointsMax: number;
  percent: number;
  projected: "otl" | "hor" | "udov" | "risk";
  marks: { title: string; mark: string; date: string }[];
  entries: {
    id: string;
    kind: string;
    title: string;
    score: number | null;
    maxScore: number | null;
    mark: string | null;
    date: string;
    comment: string | null;
  }[];
};

type GradesData = {
  summary: {
    gpa: number | null;
    subjectsCount: number;
    riskCount: number;
    excellentCount: number;
    averagePercent: number;
  };
  rank: { rank: number; total: number; points: number } | null;
  semesterLabel: string;
  sessionLabel: string;
  subjects: Subject[];
  exams: {
    id: string;
    subjectName: string;
    kind: string;
    date: string;
    humanDate: string;
    time: string;
    room: string;
    teacherName: string;
    daysLeft: number;
  }[];
};

const PROJECTED: Record<Subject["projected"], { label: string; cls: string; bar: string }> = {
  otl: { label: "Отлично", cls: "bg-lime-600/10 text-lime-700 dark:text-lime-400", bar: "bg-lime-600" },
  hor: { label: "Хорошо", cls: "bg-teal-600/10 text-teal-700 dark:text-teal-300", bar: "bg-teal-600" },
  udov: { label: "Удовл.", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400", bar: "bg-amber-500" },
  risk: { label: "Риск", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300", bar: "bg-rose-500" },
};

function markBadge(mark: string): string {
  if (mark === "5") return "bg-lime-600/15 text-lime-700 dark:text-lime-400";
  if (mark === "4") return "bg-teal-600/15 text-teal-700 dark:text-teal-300";
  if (mark === "3") return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
  if (mark === "2" || mark === "Незачёт") return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  return "bg-muted text-muted-foreground";
}

export function StudentGrades() {
  const { data, error, loading } = useApi<GradesData>("/api/grades");
  const [openSubject, setOpenSubject] = useState<string | null>(null);

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Успеваемость</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {data ? `${data.semesterLabel ?? "Текущий семестр"}, балльно-рейтинговая система` : "Текущий семестр, балльно-рейтинговая система"}
        </p>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Сводка */}
      {loading ? (
        <Skeleton className="h-28 w-full rounded-2xl" />
      ) : data ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-2xl border bg-card p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Award className="h-3.5 w-3.5" /> Средний балл
            </p>
            <p className="mt-1.5 text-2xl font-bold leading-none">{data.summary.gpa ?? "—"}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">из 5.0 возможных</p>
          </div>
          <div className="rounded-2xl border bg-card p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Средний рейтинг
            </p>
            <p className="mt-1.5 text-2xl font-bold leading-none">{data.summary.averagePercent}%</p>
            <p className="mt-1 text-[11px] text-muted-foreground">накопленных баллов</p>
          </div>
          <div className="rounded-2xl border bg-card p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" /> В группе
            </p>
            <p className="mt-1.5 text-2xl font-bold leading-none">
              {data.rank ? `${data.rank.rank}` : "—"}
              {data.rank && <span className="text-sm font-medium text-muted-foreground"> / {data.rank.total}</span>}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">место по баллам</p>
          </div>
          <div className="rounded-2xl border bg-card p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" /> Дисциплин
            </p>
            <p className="mt-1.5 text-2xl font-bold leading-none">{data.summary.subjectsCount}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {data.summary.excellentCount} в зоне "отлично"{data.summary.riskCount ? `, ${data.summary.riskCount} с риском` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {/* Дисциплины */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : data && data.subjects.length > 0 ? (
        <section aria-label="Дисциплины" className="space-y-2">
          {data.subjects.map((s) => {
            const proj = PROJECTED[s.projected];
            const open = openSubject === s.subjectName;
            return (
              <div key={s.subjectName} className="overflow-hidden rounded-2xl border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenSubject(open ? null : s.subjectName)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                  aria-expanded={open}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[14px] font-semibold">{s.subjectName}</p>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold", proj.cls)}>{proj.label}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{s.teacherName}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full transition-all", proj.bar)} style={{ width: `${Math.min(100, s.percent)}%` }} />
                      </div>
                      <span className="w-16 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">
                        {s.points}/{s.pointsMax} б.
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                </button>

                {open && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Контрольные точки</p>
                    <ul className="mt-2 space-y-1.5">
                      {s.entries.map((e) => (
                        <li key={e.id} className="flex items-center gap-2.5 text-[12.5px]">
                          <span className="text-muted-foreground">{formatDateSafe(e.date)}</span>
                          <span className="min-w-0 flex-1 truncate">
                            {e.title}
                            {e.comment && <span className="ml-1.5 text-[11px] italic text-muted-foreground">"{e.comment}"</span>}
                          </span>
                          {e.mark ? (
                            <Badge className={cn("border-0", markBadge(e.mark))}>{e.mark}</Badge>
                          ) : (
                            <span className="shrink-0 text-[11.5px] font-semibold tabular-nums">
                              {e.score}/{e.maxScore}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        !loading && (
          <EmptyState icon={GraduationCap} title="Оценок пока нет" text="Как только преподаватели выставят баллы, они появятся здесь." />
        )
      )}

      {/* Сессия */}
      {data && data.exams.length > 0 && (
        <section aria-labelledby="session-heading">
          <h2 id="session-heading" className="mb-2.5 text-[15px] font-bold tracking-tight">
            {data.sessionLabel ?? "Сессия"}
          </h2>
          <div className="space-y-2">
            {data.exams.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3.5">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-lg font-bold leading-none">{e.daysLeft}</p>
                  <p className="text-[10px] text-muted-foreground">дней</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{e.subjectName}</p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {e.kind} · {e.humanDate}, {e.time} · ауд. {e.room} · {e.teacherName}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {e.kind === "Экзамен" ? "Экзамен" : e.kind === "Зачёт" ? "Зачёт" : "Консультация"}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
