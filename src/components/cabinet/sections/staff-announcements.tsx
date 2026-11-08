"use client";

import { useState } from "react";
import { Loader2, Megaphone, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ANNOUNCEMENT_CATEGORY } from "@/components/shared";
import { useApi, apiSend } from "@/components/cabinet/use-api";
import { formatDateTimeSafe, formatDateSafe, mskTodayIso } from "@/lib/time";

type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  audience: string;
  authorName: string;
  pinned: boolean;
  deadline: string | null;
  createdAt: string;
};

type Meta = { announcements: Announcement[]; groups: string[]; categories: string[] };

export function StaffAnnouncements() {
  const { data, error, loading, reload } = useApi<Meta>("/api/staff/announcements");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("ОБЩЕЕ");
  const [audience, setAudience] = useState("ALL");
  const [pinned, setPinned] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setFormError(null);
    setSuccess(null);
    try {
      const res = await apiSend<{ notified: number }>("/api/staff/announcements", "POST", {
        title,
        body,
        category,
        audience,
        pinned,
        deadline: deadline || null,
      });
      setSuccess(`Опубликовано. Уведомление отправлено: ${res.notified} студентам.`);
      setTitle("");
      setBody("");
      setPinned(false);
      setDeadline("");
      reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Не удалось опубликовать");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = title.trim().length >= 5 && body.trim().length >= 10 && !submitting;

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Объявления</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Публикация новостей — студенты сразу получают уведомление</p>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Форма */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="space-y-3.5">
          <div>
            <Label htmlFor="ann-title">Заголовок</Label>
            <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Например: Перенос консультации по матанализу" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="ann-body">Текст</Label>
            <Textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} placeholder="Что случилось, что делать студенту, к какому сроку" className="mt-1.5" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Категория</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(data?.categories ?? ["ОБЩЕЕ"]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Кому</Label>
              <Select
                value={audience}
                onValueChange={setAudience}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все студенты</SelectItem>
                  {data?.groups.map((g) => (
                    <SelectItem key={g} value={`GROUP:${g}`}>
                      Группа {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ann-deadline">Дедлайн (необязательно)</Label>
              <Input id="ann-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1.5" min={mskTodayIso()} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[13px] font-medium" htmlFor="ann-pinned">
              <Switch id="ann-pinned" checked={pinned} onCheckedChange={setPinned} />
              Закрепить наверху ("Важно")
            </label>
            <Button onClick={submit} disabled={!canSubmit} className="gap-1.5">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Megaphone className="h-4 w-4" />
              Опубликовать
            </Button>
          </div>
          {formError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">{formError}</p>}
          {success && <p className="rounded-lg bg-lime-600/10 px-3 py-2 text-[12.5px] font-medium text-lime-800 dark:text-lime-300">{success}</p>}
        </div>
      </div>

      {/* Лента */}
      <section aria-labelledby="ann-list-heading">
        <h2 id="ann-list-heading" className="mb-2.5 text-[15px] font-bold tracking-tight">
          Опубликованные
        </h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        ) : data && data.announcements.length > 0 ? (
          <div className="space-y-2">
            {data.announcements.map((a) => (
              <div key={a.id} className="rounded-2xl border bg-card p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold leading-snug">
                    {a.pinned && <Pin className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-amber-600" />}
                    {a.title}
                  </p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ANNOUNCEMENT_CATEGORY[a.category]?.cls ?? "bg-muted text-muted-foreground"}`}>
                    {a.category}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">{a.body}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                  {a.authorName} · {formatDateTimeSafe(a.createdAt)}
                  {a.audience !== "ALL" && <span className="ml-1.5">· для {a.audience.replace("GROUP:", "группы ")}</span>}
                  {a.deadline && <span className="ml-1.5">· дедлайн {formatDateSafe(a.deadline)}</span>}
                </p>
              </div>
            ))}
          </div>
        ) : (
          !loading && <EmptyState icon={Megaphone} title="Пока ничего не опубликовано" text="Первая публикация появится в этом списке." />
        )}
      </section>
    </div>
  );
}
