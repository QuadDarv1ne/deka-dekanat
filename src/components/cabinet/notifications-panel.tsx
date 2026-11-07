"use client";

import { useEffect, useState } from "react";
import { AlarmClock, Bell, CalendarDays, CheckCheck, FileText, Info, Megaphone } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared";
import { useApi, apiSend } from "@/components/cabinet/use-api";
import { formatDateTimeSafe } from "@/lib/time";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const KIND_META: Record<string, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  REQUEST_STATUS: { icon: FileText, cls: "bg-teal-600/10 text-teal-700 dark:text-teal-300" },
  DEADLINE: { icon: AlarmClock, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  SCHEDULE: { icon: CalendarDays, cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  ANNOUNCEMENT: { icon: Megaphone, cls: "bg-lime-600/10 text-lime-700 dark:text-lime-400" },
  SYSTEM: { icon: Info, cls: "bg-muted text-muted-foreground" },
};

/** Куда ведёт уведомление внутри SPA (из "link" старого формата). */
function linkToSection(link: string | null): string | null {
  if (!link) return null;
  if (link.startsWith("/schedule")) return "schedule";
  if (link.startsWith("/requests")) return "requests";
  if (link.startsWith("/grades")) return "grades";
  if (link.startsWith("/notifications")) return null;
  return null;
}

export function NotificationsPanel({
  open,
  onOpenChange,
  onUnreadChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadChange: (n: number) => void;
  onNavigate: (section: string) => void;
}) {
  const { data, error, loading, reload } = useApi<{ items: NotificationItem[]; unread: number }>(open ? "/api/notifications" : null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (open && data) onUnreadChange(data.unread);
  }, [data, open, onUnreadChange]);

  async function markAll() {
    setMarking(true);
    try {
      const res = await apiSend<{ unread: number }>("/api/notifications", "PATCH", { all: true });
      onUnreadChange(res.unread);
      reload();
    } finally {
      setMarking(false);
    }
  }

  async function markOne(item: NotificationItem) {
    if (item.readAt) return;
    try {
      const res = await apiSend<{ unread: number }>("/api/notifications", "PATCH", { ids: [item.id] });
      onUnreadChange(res.unread);
      reload();
    } catch {
      /* не критично */
    }
  }

  const items = data?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b px-4 py-3.5">
          <SheetTitle className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-base">
            <span className="flex min-w-0 items-center gap-2">
              <Bell className="h-4.5 w-4.5 shrink-0 text-primary" />
              Уведомления
              {data && data.unread > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{data.unread} новых</span>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto gap-1.5 px-2 text-xs text-muted-foreground"
              onClick={markAll}
              disabled={marking || !items.some((i) => !i.readAt)}
            >
              <CheckCheck className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Прочитать все</span>
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto thin-scrollbar px-3 py-3">
          {loading && (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          )}
          {error && <p className="px-2 text-sm text-destructive">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <EmptyState icon={Bell} title="Уведомлений пока нет" text="Здесь появятся статусы заявок, изменения расписания и напоминания." />
          )}
          <div className="space-y-2">
            {items.map((item) => {
              const meta = KIND_META[item.kind] ?? KIND_META.SYSTEM;
              const Icon = meta.icon;
              const target = linkToSection(item.link);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    void markOne(item);
                    if (target) onNavigate(target);
                  }}
                  className={cn(
                    "flex w-full gap-3 rounded-2xl border p-3 text-left transition-colors",
                    item.readAt ? "bg-card" : "border-primary/25 bg-primary/5"
                  )}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.cls)}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-[13px] font-semibold">{item.title}</span>
                      {!item.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Непрочитано" />}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{item.body}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground/80">
                      {formatDateTimeSafe(item.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
