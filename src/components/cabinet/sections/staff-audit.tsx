"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  IdCard,
  Megaphone,
  ScrollText,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared";
import { useApi } from "@/components/cabinet/use-api";
import { formatDateTimeSafe } from "@/lib/time";
import { cn } from "@/lib/utils";

type AuditEntry = {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityId: string;
  metadata: string;
  createdAt: string;
};

const ACTION_META: Record<string, { label: string; icon: LucideIcon; group: string; cls: string }> = {
  "request.created": { label: "Заявка создана", icon: FilePlus2, group: "requests", cls: "bg-teal-600/10 text-teal-700 dark:text-teal-300" },
  "request.status_changed": { label: "Статус заявки", icon: FileText, group: "requests", cls: "bg-teal-600/10 text-teal-700 dark:text-teal-300" },
  "request.cancelled": { label: "Заявка отменена", icon: XCircle, group: "requests", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  "schedule.change": { label: "Изменение расписания", icon: CalendarDays, group: "schedule", cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  "announcement.published": { label: "Объявление", icon: Megaphone, group: "announcements", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  "academic_import.complete": { label: "Импорт учебных данных", icon: FileSpreadsheet, group: "import", cls: "bg-lime-600/10 text-lime-700 dark:text-lime-400" },
  "student_card.verify": { label: "Проверка студенческого", icon: IdCard, group: "cards", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  "student_card.issue": { label: "Выпуск студенческого", icon: IdCard, group: "cards", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
};

const FILTERS = [
  { key: "ALL", label: "Все" },
  { key: "requests", label: "Заявки" },
  { key: "schedule", label: "Расписание" },
  { key: "import", label: "Импорт" },
  { key: "cards", label: "Студенческие" },
  { key: "announcements", label: "Объявления" },
];

function describe(entry: AuditEntry): string | null {
  try {
    const meta = JSON.parse(entry.metadata) as Record<string, unknown>;
    if (entry.action === "request.status_changed") {
      return `№${String(meta.number ?? "—")}: ${String(meta.from ?? "—")} → ${String(meta.to ?? "—")}`;
    }
    if (entry.action === "schedule.change") {
      const kind: Record<string, string> = { CANCELLED: "отмена", MOVED: "перенос", ROOM: "замена аудитории" };
      return `${String(meta.groupName ?? "—")}, ${String(meta.date ?? "—")}: ${kind[String(meta.kind)] ?? String(meta.kind ?? "изменение")}`;
    }
    if (entry.action === "academic_import.complete") {
      const kind = meta.kind === "schedule" ? "расписание" : "оценки";
      return `${kind}: ${String(meta.count ?? 0)} строк, создано ${String(meta.created ?? 0)}, обновлено ${String(meta.updated ?? 0)}`;
    }
    if (entry.action === "student_card.verify") {
      return [meta.groupName, meta.faculty].filter(Boolean).join(", ") || null;
    }
    if (entry.action === "announcement.published") {
      return String(meta.title ?? "") || null;
    }
    if (entry.action === "request.created") {
      return `№${String(meta.number ?? "—")}: ${String(meta.typeTitle ?? "заявка")}`;
    }
  } catch {
    // старые записи могут содержать не-JSON metadata
  }
  return null;
}

export function StaffAudit() {
  const { data, error, loading } = useApi<{ entries: AuditEntry[] }>("/api/staff/audit");
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("ru-RU");
    return (data?.entries ?? []).filter((entry) => {
      const meta = ACTION_META[entry.action];
      if (filter !== "ALL" && meta?.group !== filter) return false;
      if (!needle) return true;
      return [entry.actorName, entry.entityId, meta?.label ?? entry.action, describe(entry) ?? ""]
        .join(" ")
        .toLocaleLowerCase("ru-RU")
        .includes(needle);
    });
  }, [data, filter, q]);

  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Журнал действий</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Значимые изменения деканата и проверки документов — в одной ленте
        </p>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по сотруднику, номеру или действию…"
          className="pl-9"
          aria-label="Поиск по журналу"
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4 thin-scrollbar">
        <div className="flex min-w-max gap-1.5">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                filter === item.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const meta = ACTION_META[entry.action] ?? {
              label: entry.action,
              icon: ScrollText,
              group: "other",
              cls: "bg-muted text-muted-foreground",
            };
            const Icon = meta.icon;
            const detail = describe(entry);
            return (
              <div key={entry.id} className="flex gap-3 rounded-2xl border bg-card p-3.5">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.cls)}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-[13px] font-semibold leading-tight">{meta.label}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTimeSafe(entry.createdAt)}</p>
                  </div>
                  {detail && <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{detail}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground/80">
                    <span>{entry.actorName}</span>
                    <span aria-hidden>·</span>
                    <span>{entry.actorRole === "STAFF" ? "сотрудник" : entry.actorRole === "STUDENT" ? "студент" : entry.actorRole}</span>
                    <span aria-hidden>·</span>
                    <span className="font-mono">{entry.entityId.slice(0, 8)}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={ScrollText} title="Записей нет" text="Здесь появятся изменения заявок, расписания, импорта и проверки студенческих." />
      )}
    </div>
  );
}
