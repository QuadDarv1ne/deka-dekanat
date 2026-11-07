"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Loader2, MapPin, User2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, KIND_STYLE } from "@/components/shared";
import { useApi } from "@/components/cabinet/use-api";
import { buildIcs } from "@/lib/ics";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  dateIso: string;
  startMin: number;
  endMin: number;
  start: string;
  end: string;
  subjectName: string;
  kind: string;
  room: string;
  building: string | null;
  teacherName: string;
  status: "normal" | "cancelled" | "moved" | "room-changed";
  note?: string;
};

type WeekData = {
  groupName: string;
  weekOffset: number;
  mondayIso: string;
  weekLabel: string;
  semesterWeek: { week: number; total: number };
  days: {
    dateIso: string;
    weekday: number;
    weekdayShort: string;
    human: string;
    isToday: boolean;
    isPast: boolean;
    slots: Slot[];
  }[];
  changes: { id: string; date: string; kind: string; subject: string; message: string; authorName: string }[];
};

export function StudentSchedule() {
  const [week, setWeek] = useState(0);
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const { data, error, loading } = useApi<WeekData>(`/api/schedule?week=${week}`);

  // по умолчанию открываем сегодня
  const todayIdx = data?.days.findIndex((d) => d.isToday) ?? -1;
  const activeIdx = dayIdx ?? (todayIdx >= 0 ? todayIdx : 0);
  const activeDay = data?.days[activeIdx];

  /** Скачивает .ics на текущую и все будущие видимые недели (0…8). */
  async function exportIcs() {
    if (exporting) return;
    setExporting(true);
    try {
      const weeks = await Promise.all(
        Array.from({ length: 9 }, (_, i) =>
          fetch(`/api/schedule?week=${i}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );
      const valid = weeks.filter(Boolean) as WeekData[];
      if (!valid.length) throw new Error("empty");
      const lessons = valid.reduce((n, w) => n + w.days.reduce((m, d) => m + d.slots.filter((s) => s.status !== "cancelled").length, 0), 0);
      const ics = buildIcs({ calName: `Дека · расписание ${valid[0]?.groupName ?? ""}`.trim(), weeks: valid });
      const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "deka-raspisanie.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Календарь скачан: ${lessons} пар на ${valid.length} недель`);
    } catch {
      toast.error("Не удалось сформировать календарь. Попробуйте ещё раз.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Расписание</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {data ? `Группа ${data.groupName} · ${data.semesterWeek.week}-я неделя семестра` : "Загружаем…"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-[12.5px]"
            onClick={() => void exportIcs()}
            disabled={exporting}
            aria-label="Скачать расписание в календарь (ICS)"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            <span className="hidden sm:inline">В календарь</span>
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeek((w) => Math.max(-4, w - 1))} aria-label="Прошлая неделя">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[7.5rem] text-center text-[13px] font-semibold">{data?.weekLabel ?? "…"}</span>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeek((w) => Math.min(8, w + 1))} aria-label="Следующая неделя">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Изменения недели */}
      {data && data.changes.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
          <p className="text-[13px] font-bold text-amber-800 dark:text-amber-300">Изменения на этой неделе</p>
          <ul className="mt-1.5 space-y-1">
            {data.changes.slice(0, 3).map((c) => (
              <li key={c.id} className="text-[12.5px] leading-snug text-amber-800/90 dark:text-amber-200/90">
                {c.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Переключатель дней */}
      <div className="-mx-4 overflow-x-auto px-4 thin-scrollbar">
        <div className="flex min-w-max gap-1.5 pb-1">
          {(data?.days ?? Array.from({ length: 6 }, (_, i) => null)).map((_, i) => {
            const d = data?.days[i];
            const hasCancelled = d?.slots.some((s) => s.status === "cancelled");
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDayIdx(i)}
                className={cn(
                  "relative min-w-14 rounded-2xl border px-3 py-2 text-center transition-colors",
                  i === activeIdx ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
                  d?.isPast && i !== activeIdx && "opacity-55"
                )}
              >
                <span className="block text-[11px] font-medium opacity-80">{d?.weekdayShort ?? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][i]}</span>
                <span className="block text-[15px] font-bold leading-tight">{d ? d.dateIso.slice(8, 10) : "–"}</span>
                {d?.isToday && (
                  <span className={cn("absolute left-1/2 top-1 h-1 w-1 -translate-x-1/2 rounded-full", i === activeIdx ? "bg-primary-foreground" : "bg-primary")} />
                )}
                {hasCancelled && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" title="Есть отмены" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Пары выбранного дня */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : activeDay && activeDay.slots.length > 0 ? (
        <div className="space-y-2">
          {activeDay.slots.map((s) => {
            const kind = KIND_STYLE[s.kind] ?? { dot: "bg-teal-500", text: "text-teal-700 dark:text-teal-300" };
            const cancelled = s.status === "cancelled";
            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-2xl border bg-card p-4",
                  cancelled && "border-dashed opacity-70",
                  s.status === "moved" && "border-sky-500/35"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="w-12 shrink-0 text-center">
                      <p className="text-[15px] font-bold leading-none">{s.start}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{s.end}</p>
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-[14px] font-semibold leading-snug", cancelled && "line-through decoration-destructive/60")}>
                        {s.subjectName}
                      </p>
                      <p className={cn("mt-1 flex items-center gap-1.5 text-[12px] font-medium", kind.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", kind.dot)} />
                        {s.kind}
                      </p>
                      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {s.room}
                          {s.building ? ` · ${s.building}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <User2 className="h-3.5 w-3.5" />
                          {s.teacherName}
                        </span>
                      </p>
                    </div>
                  </div>
                  {cancelled && (
                    <Badge variant="outline" className="shrink-0 border-destructive/30 text-destructive">
                      Отменена
                    </Badge>
                  )}
                  {s.status === "moved" && (
                    <Badge variant="outline" className="shrink-0 border-sky-500/40 text-sky-700 dark:text-sky-300">
                      Перенесённая
                    </Badge>
                  )}
                  {s.status === "room-changed" && (
                    <Badge variant="outline" className="shrink-0 border-violet-500/40 text-violet-700 dark:text-violet-300">
                      Другая аудитория
                    </Badge>
                  )}
                </div>
                {s.note && (
                  <p className="mt-2.5 rounded-xl bg-amber-500/10 px-3 py-2 text-[12px] font-medium leading-snug text-amber-800 dark:text-amber-300">
                    {s.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title={activeDay ? "Занятий нет" : "Выберите день"}
          text={activeDay ? "В этот день пар не запланировано — отличная возможность позаниматься в библиотеке." : undefined}
        />
      )}
    </div>
  );
}
