import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  href,
  linkLabel = "Все",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between">
      <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-[13px] font-medium text-primary hover:underline"
        >
          {linkLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export const REQUEST_STATUS: Record<
  string,
  { label: string; cls: string; step: number }
> = {
  NEW: {
    label: "Принята",
    cls: "bg-teal-600/10 text-teal-700 dark:text-teal-300 border-teal-600/20",
    step: 1,
  },
  IN_PROGRESS: {
    label: "В работе",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
    step: 2,
  },
  READY: {
    label: "Готова",
    cls: "bg-lime-600/10 text-lime-700 dark:text-lime-400 border-lime-600/25",
    step: 3,
  },
  DONE: {
    label: "Выдана",
    cls: "bg-muted text-muted-foreground border-border",
    step: 4,
  },
  REJECTED: {
    label: "Отклонена",
    cls: "bg-destructive/10 text-destructive border-destructive/25",
    step: 4,
  },
  CANCELLED: {
    label: "Отменена",
    cls: "bg-muted text-muted-foreground border-border",
    step: 4,
  },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = REQUEST_STATUS[status] ?? { label: status, cls: "bg-muted border-border" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        s.cls,
        className
      )}
    >
      {s.label}
    </span>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  text,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[13px] leading-snug text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Цветные категории объявлений */
export const ANNOUNCEMENT_CATEGORY: Record<string, { cls: string }> = {
  СЕССИЯ: { cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  СТИПЕНДИЯ: { cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  МЕРОПРИЯТИЕ: { cls: "bg-lime-600/10 text-lime-700 dark:text-lime-400" },
  РАСПИСАНИЕ: { cls: "bg-teal-600/10 text-teal-700 dark:text-teal-300" },
  ОБЩЕЕ: { cls: "bg-muted text-muted-foreground" },
}

export const KIND_STYLE: Record<string, { dot: string; text: string }> = {
  Лекция: { dot: "bg-teal-500", text: "text-teal-700 dark:text-teal-300" },
  Практика: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  Лаборатория: { dot: "bg-violet-500", text: "text-violet-700 dark:text-violet-300" },
  Электив: { dot: "bg-lime-500", text: "text-lime-700 dark:text-lime-400" },
  "Перенесённая пара": { dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-300" },
}
