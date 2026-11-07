"use client";

import { useState } from "react";
import { CalendarClock, CheckCheck, CircleDashed, Clock3, Loader2, ThumbsDown, User2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StatusBadge } from "@/components/shared";
import { useApi, apiSend } from "@/components/cabinet/use-api";
import { formatDateTimeSafe } from "@/lib/time";
import { cn } from "@/lib/utils";

type StaffRequest = {
  id: string;
  number: string;
  typeTitle: string;
  status: string;
  comment: string | null;
  staffComment: string | null;
  dueDate: string | null;
  createdAt: string;
  studentName: string;
  groupName: string;
  faculty: string;
  course: number | null;
  lastEvent: { status: string; comment: string | null; authorName: string; createdAt: string } | null;
};

type StaffRequestsData = {
  requests: StaffRequest[];
  counts: Record<string, number>;
};

const FILTERS = [
  { key: "ALL", label: "Все" },
  { key: "NEW", label: "Новые" },
  { key: "IN_PROGRESS", label: "В работе" },
  { key: "READY", label: "Готовы" },
  { key: "DONE", label: "Выданы" },
  { key: "REJECTED", label: "Отклонённые" },
  { key: "CANCELLED", label: "Отменённые" },
];

export function StaffRequests() {
  const [filter, setFilter] = useState("ALL");
  const { data, error, loading, reload } = useApi<StaffRequestsData>(`/api/staff/requests?status=${filter}`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<StaffRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function setStatus(id: string, status: string, comment?: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await apiSend("/api/staff/requests", "PATCH", { id, status, comment });
      setRejectFor(null);
      setRejectReason("");
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Не удалось обновить заявку");
    } finally {
      setBusyId(null);
    }
  }

  const newCount = data?.counts.NEW ?? 0;

  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Заявки студентов</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {newCount > 0 ? `${newCount} новых ждут реакции` : "Новых заявок нет — можно выдохнуть"}
        </p>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Фильтры */}
      <div className="-mx-4 overflow-x-auto px-4 thin-scrollbar">
        <div className="flex min-w-max gap-1.5">
          {FILTERS.map((f) => {
            const count = f.key === "ALL" ? data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : undefined : data?.counts[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  filter === f.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40"
                )}
              >
                {f.label}
                {count !== undefined && (
                  <span className={cn("rounded-full px-1.5 text-[10px] font-bold", filter === f.key ? "bg-white/20" : "bg-muted")}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {actionError && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : data && data.requests.length > 0 ? (
        <div className="space-y-3">
          {data.requests.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold leading-snug">{r.typeTitle}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User2 className="h-3.5 w-3.5" />
                      {r.studentName} · {r.groupName}
                    </span>
                    <span className="font-mono text-[11px]">{r.number}</span>
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {r.comment && (
                <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-[12px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">Комментарий студента:</span> {r.comment}
                </p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" /> подана {formatDateTimeSafe(r.createdAt)}
                </span>
                {r.dueDate && r.status !== "DONE" && r.status !== "REJECTED" && r.status !== "CANCELLED" && (
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <CalendarClock className="h-3.5 w-3.5" /> срок: {new Date(r.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                  </span>
                )}
              </div>

              {r.status !== "DONE" && r.status !== "REJECTED" && r.status !== "CANCELLED" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "NEW" && (
                    <Button size="sm" className="gap-1.5" onClick={() => setStatus(r.id, "IN_PROGRESS")} disabled={busyId === r.id}>
                      {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleDashed className="h-3.5 w-3.5" />}
                      В работу
                    </Button>
                  )}
                  {r.status === "IN_PROGRESS" && (
                    <Button size="sm" className="gap-1.5" onClick={() => setStatus(r.id, "READY")} disabled={busyId === r.id}>
                      {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                      Готова к выдаче
                    </Button>
                  )}
                  {r.status === "READY" && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStatus(r.id, "DONE")} disabled={busyId === r.id}>
                      {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                      Выдана
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => {
                      setRejectFor(r);
                      setRejectReason("");
                    }}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Отклонить
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !loading && <EmptyState icon={CheckCheck} title="Заявок в этой папке нет" text="Как только студенты подадут заявки, они появятся здесь." />
      )}

      {/* Диалог отклонения */}
      <Dialog open={Boolean(rejectFor)} onOpenChange={(open) => !open && setRejectFor(null)}>
        <DialogContent className="sm:max-w-md">
          {rejectFor && (
            <>
              <DialogHeader>
                <DialogTitle>Отклонить заявку?</DialogTitle>
                <DialogDescription>
                  {rejectFor.typeTitle} · {rejectFor.studentName} · <span className="font-mono">{rejectFor.number}</span>
                </DialogDescription>
              </DialogHeader>
              <div>
                <label htmlFor="reject-reason" className="mb-1.5 block text-[13px] font-medium">
                  Причина (студент увидит её в кабинете)
                </label>
                <Textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Например: не хватает подтверждающего документа, приложите копию договора"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectFor(null)}>
                  Назад
                </Button>
                <Button variant="destructive" onClick={() => setStatus(rejectFor.id, "REJECTED", rejectReason)} disabled={rejectReason.trim().length < 3}>
                  Отклонить
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
