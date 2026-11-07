"use client";

import { CalendarDays, ChevronRight, ClipboardList, FileText, QrCode, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared";
import { NextClassCard } from "@/components/cabinet/next-class-card";
import { useApi } from "@/components/cabinet/use-api";
import { relativeDay } from "@/lib/time";
import { ANNOUNCEMENT_CATEGORY } from "@/components/shared";

type HomeData = {
  greeting: string;
  today: { dateIso: string; human: string; isWeekend: boolean };
  semesterWeek: { week: number; total: number };
  todaySlots: {
    id: string;
    start: string;
    end: string;
    subjectName: string;
    kind: string;
    room: string;
    building: string | null;
    teacherName: string;
    status: "normal" | "cancelled" | "moved" | "room-changed";
    note?: string;
    isNow: boolean;
    isPast: boolean;
  }[];
  nextClass: {
    dateIso: string;
    human: string;
    startMin: number;
    endMin: number;
    start: string;
    end: string;
    subjectName: string;
    kind: string;
    room: string;
    building: string | null;
    teacherName: string;
  } | null;
  announcements: { id: string; title: string; category: string; pinned: boolean; createdAt: string }[];
  deadlines: { id: string; title: string; deadline: string; category: string }[];
  activeRequests: number;
};

export function StudentHome({
  student,
  userName,
  onNavigate,
  onOpenAssistant,
  onOpenNotifications,
}: {
  student: { groupName: string };
  userName: string;
  onNavigate: (section: string) => void;
  onOpenAssistant: () => void;
  onOpenNotifications: () => void;
}) {
  const { data, error, loading } = useApi<HomeData>("/api/home");
  const firstName = userName.split(" ")[0];

  return (
    <div className="animate-fade-up space-y-5">
      {/* Приветствие */}
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {data ? `${data.greeting}, ${firstName}!` : `Привет, ${firstName}!`}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {data ? `${data.today.human} · ${data.semesterWeek.week}-я неделя семестра из ${data.semesterWeek.total} · группа ${student.groupName}` : "Загружаем ваши данные…"}
        </p>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Ближайшая пара */}
      {loading ? (
        <Skeleton className="h-44 w-full rounded-3xl" />
      ) : (
        <NextClassCard
          data={data?.nextClass ?? null}
          onOpenSchedule={() => onNavigate("schedule")}
        />
      )}

      {/* Быстрые действия */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { key: "requests", label: "Заказать справку", icon: FileText, cls: "bg-teal-600/10 text-teal-700 dark:text-teal-300" },
          { key: "qr", label: "QR-студенческий", icon: QrCode, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
          { key: "schedule", label: "Расписание", icon: CalendarDays, cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
          { key: "assistant", label: "Спросить Деку", icon: Sparkles, cls: "bg-lime-600/10 text-lime-700 dark:text-lime-400" },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => (a.key === "assistant" ? onOpenAssistant() : a.key === "qr" ? onNavigate("profile") : onNavigate(a.key))}
              className="flex min-h-20 flex-col items-start justify-between gap-2 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${a.cls}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[12.5px] font-semibold leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Пары сегодня */}
      <section aria-labelledby="today-heading">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 id="today-heading" className="text-[15px] font-bold tracking-tight">
            Пары сегодня
          </h2>
          <button type="button" onClick={() => onNavigate("schedule")} className="flex items-center gap-0.5 text-[13px] font-medium text-primary hover:underline">
            Вся неделя
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : data && data.todaySlots.length > 0 ? (
          <div className="space-y-2">
            {data.todaySlots.map((s) => (
              <Card key={s.id} className={s.status === "cancelled" ? "border-dashed opacity-70" : undefined}>
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div className={`w-12 shrink-0 text-center ${s.isPast ? "opacity-50" : ""}`}>
                    <p className="text-[15px] font-bold leading-none">{s.start}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{s.end}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13.5px] font-semibold ${s.isPast ? "opacity-50" : ""}`}>{s.subjectName}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {s.kind} · {s.room}
                      {s.building ? ` · ${s.building}` : ""} · {s.teacherName}
                    </p>
                    {s.note && <p className="mt-1 text-[11.5px] font-medium text-amber-700 dark:text-amber-400">{s.note}</p>}
                  </div>
                  {s.status === "cancelled" ? (
                    <Badge variant="outline" className="shrink-0 border-destructive/30 text-destructive">
                      Отменена
                    </Badge>
                  ) : s.isNow ? (
                    <Badge className="shrink-0 bg-teal-600">Сейчас</Badge>
                  ) : s.status === "moved" ? (
                    <Badge variant="outline" className="shrink-0 border-sky-500/40 text-sky-700 dark:text-sky-300">
                      Перенесённая
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title={data?.today.isWeekend ? "Сегодня выходной" : "Сегодня пар нет"}
            text="Можно выдохнуть. Расписание на другие дни — по кнопке &quot;Вся неделя&quot;."
          />
        )}
      </section>

      {/* Дедлайны */}
      {data && data.deadlines.length > 0 && (
        <section aria-labelledby="deadlines-heading">
          <h2 id="deadlines-heading" className="mb-2.5 text-[15px] font-bold tracking-tight">
            Ближайшие дедлайны
          </h2>
          <div className="space-y-2">
            {data.deadlines.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={onOpenNotifications}
                className="flex w-full items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3.5 text-left transition-colors hover:bg-amber-500/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <ClipboardList className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{d.title}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    до {relativeDay(new Date(d.deadline).toISOString().slice(0, 10))}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Объявления */}
      <section aria-labelledby="news-heading">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 id="news-heading" className="text-[15px] font-bold tracking-tight">
            Объявления деканата
          </h2>
          <button type="button" onClick={onOpenNotifications} className="text-[13px] font-medium text-primary hover:underline">
            Все в уведомлениях
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-2">
            {data?.announcements.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={onOpenNotifications}
                className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">
                    {a.pinned && <span className="mr-1.5 text-amber-600 dark:text-amber-400">Важно ·</span>}
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {relativeDay(a.createdAt.slice(0, 10))}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ANNOUNCEMENT_CATEGORY[a.category]?.cls ?? "bg-muted text-muted-foreground"}`}>
                  {a.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Заявки в работе */}
      {data && data.activeRequests > 0 && (
        <button
          type="button"
          onClick={() => onNavigate("requests")}
          className="flex w-full items-center gap-3 rounded-2xl bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FileText className="h-5 w-5" />
          </span>
          <span className="flex-1 text-[13.5px] font-semibold text-primary">
            {data.activeRequests === 1 ? "1 заявка в работе" : `${data.activeRequests} заявки в работе`}
            <span className="block text-[12px] font-normal text-muted-foreground">Проверить статусы</span>
          </span>
          <ChevronRight className="h-4 w-4 text-primary" />
        </button>
      )}
    </div>
  );
}
