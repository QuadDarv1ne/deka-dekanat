"use client";

import { useMemo, useState } from "react";
import { FileText, Search, User2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared";
import { useApi } from "@/components/cabinet/use-api";

type StaffStudent = {
  id: string;
  userId: string;
  name: string;
  login: string;
  avatarColor: string;
  faculty: string;
  program: string;
  course: number;
  groupName: string;
  recordBook: string;
  studyForm: string;
  status: string;
  marksCount: number;
  activeRequests: number;
};

export function StaffStudents() {
  const { data, error, loading } = useApi<{ students: StaffStudent[] }>("/api/staff/students");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = data?.students ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((s) =>
      [s.name, s.groupName, s.login, s.program].some((f) => f.toLowerCase().includes(needle))
    );
  }, [data, q]);

  return (
    <div className="animate-fade-up space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Студенты</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {data ? `${data.students.length} человек в базе деканата` : "Загружаем…"}
        </p>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по ФИО, группе, логину…" className="pl-9" aria-label="Поиск студента" />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-2xl border bg-card p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-[13px] font-bold text-white">
                  {s.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold leading-tight">{s.name}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {s.groupName} · {s.course} курс · {s.studyForm}
                  </p>
                </div>
                {s.activeRequests > 0 && (
                  <Badge className="shrink-0 bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20">
                    <FileText className="mr-1 h-3 w-3" />
                    {s.activeRequests}
                  </Badge>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User2 className="h-3 w-3" />
                  {s.login}
                </span>
                <span>зачётка {s.recordBook}</span>
                <span>оценок: {s.marksCount}</span>
                <span className="ml-auto font-medium text-lime-700 dark:text-lime-400">{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && <EmptyState icon={User2} title="Никого не найдено" text="Попробуйте изменить запрос: ФИО, группа или логин." />
      )}
    </div>
  );
}
