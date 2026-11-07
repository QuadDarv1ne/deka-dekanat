"use client";

import { useState } from "react";
import { CalendarX2, Loader2, MoveRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi, apiSend } from "@/components/cabinet/use-api";
import { formatDateTimeSafe } from "@/lib/time";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  start: string;
  startMin: number;
  end: string;
  subjectName: string;
  kind: string;
  room: string;
  building: string | null;
  teacherName: string;
  status: string;
};

type StaffScheduleData = {
  todayIso: string;
  groups: string[];
  groupName: string;
  date: string;
  humanDate: string;
  slots: Slot[];
  recent: {
    id: string;
    groupName: string;
    date: string;
    kind: string;
    subject: string;
    message: string;
    authorName: string;
    createdAt: string;
  }[];
};

const PAIR_TIMES = [
  { label: "09:00", value: 540 },
  { label: "10:40", value: 640 },
  { label: "12:40", value: 760 },
  { label: "14:20", value: 860 },
  { label: "16:00", value: 960 },
];

export function StaffSchedule() {
  const [group, setGroup] = useState("");
  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [kind, setKind] = useState<"CANCELLED" | "MOVED" | "ROOM">("CANCELLED");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("540");
  const [newRoom, setNewRoom] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const query = `/api/staff/schedule?${new URLSearchParams({ ...(group ? { group } : {}), ...(date ? { date } : {}) }).toString()}`;
  const { data, error, loading, reload } = useApi<StaffScheduleData>(query);

  const currentGroup = data?.groupName ?? "";
  const currentDate = data?.date ?? "";
  const selectedSlot = data?.slots.find((s) => s.id === slotId) ?? null;
  const actionable = (data?.slots ?? []).filter((s) => s.status !== "cancelled");

  async function submit() {
    setSubmitting(true);
    setFormError(null);
    setSuccess(null);
    try {
      const slot = data?.slots.find((s) => s.id === slotId);
      const res = await apiSend<{ change: { message: string }; notified: number }>("/api/staff/schedule", "POST", {
        groupName: currentGroup,
        date: currentDate,
        subject: slot?.subjectName,
        kind,
        newDate: kind === "MOVED" ? newDate : undefined,
        newStartMin: kind === "MOVED" ? Number(newTime) : undefined,
        newRoom: kind === "ROOM" ? newRoom : kind === "MOVED" && newRoom ? newRoom : undefined,
        reason: reason || undefined,
      });
      setSuccess(`${res.change.message} Уведомлено студентов: ${res.notified}.`);
      setSlotId("");
      setReason("");
      setNewRoom("");
      setNewDate("");
      reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Не удалось сохранить изменение");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = Boolean(slotId) && !submitting && (kind !== "MOVED" || newDate) && (kind !== "ROOM" || newRoom.trim().length >= 1);

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Переносы и отмены</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Изменение сразу попадает в расписание группы и уходит студентам уведомлением</p>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Выбор группы и даты */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Группа</Label>
            <Select
              value={currentGroup}
              onValueChange={(v) => {
                setGroup(v);
                setSlotId("");
              }}
            >
              <SelectTrigger className="mt-1.5" aria-label="Выбрать группу">
                <SelectValue placeholder="Загрузка…" />
              </SelectTrigger>
              <SelectContent>
                {data?.groups.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="staff-date">Дата</Label>
            <div className="flex gap-2">
              <Input id="staff-date" type="date" value={currentDate} min={data?.todayIso} onChange={(e) => { setDate(e.target.value); setSlotId(""); }} className="mt-1.5" />
              <Button variant="outline" size="icon" className="mt-1.5 h-10 w-10 shrink-0" onClick={() => { setDate(data?.todayIso ?? ""); setSlotId(""); }} aria-label="Сегодня">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Пары дня */}
        <div className="mt-3.5">
          <Label>Занятие</Label>
          {loading ? (
            <Skeleton className="mt-1.5 h-10 w-full rounded-xl" />
          ) : actionable.length > 0 ? (
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              {actionable.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlotId(s.id === slotId ? "" : s.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-colors",
                    slotId === s.id ? "border-primary bg-primary/5" : "bg-background hover:border-primary/40"
                  )}
                >
                  <p className="text-[12.5px] font-semibold leading-tight">
                    {s.start} · {s.subjectName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {s.kind} · ауд. {s.room}
                    {s.building ? ` (${s.building})` : ""} · {s.teacherName}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 rounded-xl bg-muted px-3 py-2.5 text-[12.5px] text-muted-foreground">
              {data && data.slots.length === 0 ? "В этот день у группы нет занятий" : "Все занятия этого дня уже отменены"}
            </p>
          )}
        </div>

        {/* Тип изменения */}
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Что сделать</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger className="mt-1.5" aria-label="Тип изменения">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CANCELLED">Отменить занятие</SelectItem>
                <SelectItem value="MOVED">Перенести на другой день</SelectItem>
                <SelectItem value="ROOM">Заменить аудиторию</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {kind === "MOVED" && (
            <>
              <div>
                <Label htmlFor="move-date">Новая дата</Label>
                <Input id="move-date" type="date" value={newDate} min={currentDate} onChange={(e) => setNewDate(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Время</Label>
                <Select value={newTime} onValueChange={setNewTime}>
                  <SelectTrigger className="mt-1.5" aria-label="Время пары">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAIR_TIMES.map((t) => (
                      <SelectItem key={t.value} value={String(t.value)}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="move-room">Аудитория (если меняется)</Label>
                <Input id="move-room" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="напр. Б-201" className="mt-1.5" />
              </div>
            </>
          )}
          {kind === "ROOM" && (
            <div>
              <Label htmlFor="room-new">Новая аудитория</Label>
              <Input id="room-new" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="напр. В-306" className="mt-1.5" />
            </div>
          )}
        </div>

        <div className="mt-3.5">
          <Label htmlFor="staff-reason">Причина (попадёт в уведомление)</Label>
          <Input id="staff-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="напр. преподаватель на конференции" className="mt-1.5" />
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3">
          <p className="text-[11.5px] text-muted-foreground">
            {selectedSlot ? `Изменение: «${selectedSlot.subjectName}», ${data?.humanDate}` : "Выберите занятие из списка выше"}
          </p>
          <Button onClick={submit} disabled={!canSubmit} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : kind === "CANCELLED" ? <CalendarX2 className="h-4 w-4" /> : <MoveRight className="h-4 w-4" />}
            Применить
          </Button>
        </div>

        {formError && <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">{formError}</p>}
        {success && <p className="mt-2 rounded-lg bg-lime-600/10 px-3 py-2 text-[12.5px] font-medium text-lime-800 dark:text-lime-300">{success}</p>}
      </div>

      {/* Недавние изменения */}
      <section aria-labelledby="recent-changes">
        <h2 id="recent-changes" className="mb-2.5 text-[15px] font-bold tracking-tight">
          Последние изменения
        </h2>
        {data && data.recent.length > 0 ? (
          <div className="space-y-2">
            {data.recent.map((c) => (
              <div key={c.id} className="rounded-2xl border bg-card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12.5px] leading-snug">{c.message}</p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {c.kind === "CANCELLED" ? "отмена" : c.kind === "MOVED" ? "перенос" : "аудитория"}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  {c.groupName} · {c.authorName} · {formatDateTimeSafe(c.createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed bg-card/50 px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            Изменений ещё не было
          </p>
        )}
      </section>
    </div>
  );
}
