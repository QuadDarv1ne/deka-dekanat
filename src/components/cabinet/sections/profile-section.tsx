"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  BadgeCheck,
  CalendarRange,
  DatabaseBackup,
  Download,
  GraduationCap,
  IdCard,
  Info,
  LogOut,
  Mail,
  Phone,
  QrCode,
  ShieldCheck,
  TriangleAlert,
  Upload,
  User2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/components/cabinet/use-api";
import { QRCodeSVG } from "@/components/cabinet/qr-code";
import type { CabinetUser } from "@/components/cabinet/cabinet-app";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { mskTodayIso } from "@/lib/time";

type GradesLite = {
  summary: { gpa: number | null; averagePercent: number; subjectsCount: number; excellentCount: number; riskCount: number };
  rank: { rank: number; total: number } | null;
};

export function ProfileSection({
  user,
  onUnreadChange,
}: {
  user: CabinetUser;
  onUnreadChange: (n: number) => void;
}) {
  const { data: grades } = useApi<GradesLite>(user.student ? "/api/grades" : null);
  const [qrOpen, setQrOpen] = useState(false);
  const [today, setToday] = useState<string>(mskTodayIso());
  const { resolvedTheme, setTheme } = useTheme();

  // ── Суверенитет данных деканата: полный бэкап и восстановление ──
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    name: string;
    body: { format?: string; version?: number; data?: Record<string, unknown> };
  } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onRestoreFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // позволяет выбрать тот же файл повторно
    if (!file) return;
    setRestoreMsg(null);
    file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text) as { format?: string; data?: { users?: unknown[] } };
        if (parsed.format !== "deka-backup") throw new Error("Это не резервная копия \"Дека\" (формат deka-backup)");
        if (!Array.isArray(parsed.data?.users) || parsed.data.users.length === 0)
          throw new Error("В файле нет пользователей — файл повреждён");
        setPendingRestore({ name: file.name, body: parsed });
      })
      .catch((err) => setRestoreMsg({ ok: false, text: err instanceof Error ? err.message : "Не удалось прочитать файл" }));
  }

  async function confirmRestore() {
    if (!pendingRestore) return;
    setRestoring(true);
    setRestoreMsg(null);
    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pendingRestore.body, confirm: "REPLACE" }),
      });
      const out = (await res.json()) as { ok?: boolean; error?: string; restored?: Record<string, number> };
      if (!res.ok || !out.ok) throw new Error(out.error || "Восстановление не удалось");
      const r = out.restored ?? {};
      setRestoreMsg({
        ok: true,
        text: `Готово: восстановлено пользователей ${r.users ?? 0}, заявок ${r.serviceRequests ?? 0}, оценок ${r.grades ?? 0}, событий ${r.requestEvents ?? 0}. Обновляю кабинет…`,
      });
      setPendingRestore(null);
      setTimeout(() => window.location.reload(), 1400);
    } catch (err) {
      setRestoreMsg({ ok: false, text: err instanceof Error ? err.message : "Восстановление не удалось" });
    } finally {
      setRestoring(false);
    }
  }

  // дата на клиенте может отличаться от серверной у полуночи — обновляем после монтирования
  useEffect(() => {
    const t = setTimeout(() => setToday(mskTodayIso()), 0);
    return () => clearTimeout(t);
  }, []);

  // прогресс семестра: 1 сентября текущего учебного года — 16 учебных недель
  const semesterProgress = (() => {
    if (!user.student) return 0;
    const iso = today || mskTodayIso();
    const year = Number(iso.slice(0, 4));
    // учебный год начинается 1 сентября: до августа относимся к предыдущему
    const academicYear = Number(iso.slice(5, 7)) >= 8 ? year : year - 1;
    const start = new Date(`${academicYear}-09-01T12:00:00.000Z`);
    const now = new Date(`${iso}T12:00:00.000Z`);
    const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
    return Math.min(100, Math.max(3, Math.round((days / (16 * 7)) * 100)));
  })();

  const isStaff = user.role === "STAFF";

  const qrPayload = isStaff
    ? `DEKA-STAFF|${user.login}|${user.name}`
    : `DEKA-STUDENT|${user.student?.recordBook ?? user.login}|${user.name}|${user.student?.groupName ?? ""}`;

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Профиль</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Данные аккаунта, электронный студенческий и учебный прогресс</p>
      </div>

      {/* Карточка профиля */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-lg font-bold text-white">
            {user.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[15px] font-bold leading-tight">
              {user.name}
              <BadgeCheck className="h-4 w-4 shrink-0 text-teal-600" aria-label="Подтверждённый аккаунт" />
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {isStaff ? "Сотрудник деканата" : user.student ? `${user.student.program}, ${user.student.course} курс` : ""}
            </p>
            <p className="mt-0.5 font-mono text-[11.5px] text-muted-foreground/80">логин: {user.login}</p>
          </div>
          {!isStaff && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQrOpen(true)}>
              <QrCode className="h-4 w-4" />
              QR
            </Button>
          )}
        </div>

        {!isStaff && user.student && (
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t pt-3.5 text-[12.5px] sm:grid-cols-2">
            {[
              { label: "Факультет", value: user.student.faculty },
              { label: "Направление", value: user.student.program },
              { label: "Курс", value: `${user.student.course} курс` },
              { label: "Учебная группа", value: user.student.groupName },
              { label: "Форма обучения", value: user.student.studyForm },
              { label: "Номер зачётной книжки", value: user.student.recordBook },
              { label: "Год поступления", value: `${user.student.entryYear}/${user.student.entryYear + 1}` },
              { label: "Статус", value: user.student.status },
              { label: "Куратор", value: user.student.curatorName ?? "—" },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-2 sm:block">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium sm:mt-0.5">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Прогресс-дашборд (только студент) */}
      {!isStaff && (
        <section aria-labelledby="progress-heading" className="rounded-2xl border bg-card p-4">
          <h2 id="progress-heading" className="text-[15px] font-bold tracking-tight">
            Учебный прогресс
          </h2>
          <div className="mt-3 space-y-4">
            <div>
              <div className="flex items-baseline justify-between text-[12.5px]">
                <span className="flex items-center gap-1.5 font-medium">
                  <CalendarRange className="h-4 w-4 text-primary" /> Семестр
                </span>
                <span className="font-semibold tabular-nums">{semesterProgress}%</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-700" style={{ width: `${semesterProgress}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">16 учебных недель с 1 сентября до зимней сессии</p>
            </div>

            {grades ? (
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <p className="text-xl font-bold leading-none">{grades.summary.gpa ?? "—"}</p>
                  <p className="mt-1 text-[10.5px] text-muted-foreground">средний балл</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <p className="text-xl font-bold leading-none">{grades.rank ? grades.rank.rank : "—"}</p>
                  <p className="mt-1 text-[10.5px] text-muted-foreground">{grades.rank ? `из ${grades.rank.total} в группе` : "в группе"}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <p className="text-xl font-bold leading-none">{grades.summary.averagePercent}%</p>
                  <p className="mt-1 text-[10.5px] text-muted-foreground">по дисциплинам</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Электронная карта */}
      {!isStaff && (
        <section aria-labelledby="card-heading" className="rounded-2xl border bg-card p-4">
          <h2 id="card-heading" className="text-[15px] font-bold tracking-tight">
            Электронный студенческий
          </h2>
          <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
            Покажите QR-код на проходной, в библиотеке или на экзамене — вместо пластикового бейджа.
          </p>
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="mt-3 flex w-full items-center gap-4 rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-4 text-left text-white transition-transform active:scale-[0.99]"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <QrCode className="h-8 w-8" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold leading-tight">{user.name}</span>
              <span className="mt-0.5 block text-[12px] text-teal-100/90">
                {user.student ? `${user.student.groupName} · ${user.student.recordBook}` : ""}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10.5px] font-semibold text-amber-200">
                <IdCard className="h-3 w-3" /> Действителен весь учебный год
              </span>
            </span>
          </button>
        </section>
      )}

      {/* Суверенитет данных деканата (только сотрудник) */}
      {isStaff && (
        <section aria-labelledby="sovereignty-heading" className="rounded-2xl border bg-card p-4">
          <h2 id="sovereignty-heading" className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
            <DatabaseBackup className="h-4.5 w-4.5 text-teal-600" /> Суверенитет данных деканата
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
            Вся база прототипа — один файл. "Полный бэкап" скачивает её целиком: пользователи, расписание,
            заявки с историей, оценки, объявления. Пароли — только в виде bcrypt-хешей. Перенос на другой
            сервер: поднять приложение на новой машине и восстановить этот файл здесь — данные, связи и
            история статусов сохранятся.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => (window.location.href = "/api/backup")}
              title="Скачает всю базу одним JSON-файлом"
            >
              <DatabaseBackup className="h-4 w-4" />
              Полный бэкап (JSON)
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => restoreInputRef.current?.click()} disabled={restoring}>
              <Upload className="h-4 w-4" />
              Восстановить из файла
            </Button>
            <input ref={restoreInputRef} type="file" accept=".json,application/json" className="hidden" onChange={onRestoreFile} />
          </div>
          {restoreMsg && (
            <p className={`mt-2 text-[12px] leading-snug ${restoreMsg.ok ? "text-teal-700 dark:text-teal-400" : "text-destructive"}`}>
              {restoreMsg.text}
            </p>
          )}
        </section>
      )}

      {/* Безопасность */}
      <section aria-labelledby="security-heading" className="rounded-2xl border bg-card p-4">
        <h2 id="security-heading" className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
          <ShieldCheck className="h-4.5 w-4.5 text-teal-600" /> Как защищены ваши данные
        </h2>
        <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-snug text-muted-foreground">
          <li>• Пароль хранится только в виде bcrypt-хеша — даже администратор не видит его.</li>
          <li>• Сессия — подписанный JWT в httpOnly-cookie: JavaScript браузера не может его украсть.</li>
          <li>• Вы видите только свои данные: каждый запрос к API проверяет вашу сессию и роль.</li>
          <li>• Секрет подписи хранится в переменных окружения сервера и не попадает в браузер.</li>
          <li>• Данные принадлежат вам: в любой момент их можно выгрузить одним JSON-файлом и унести с собой.</li>
          <li>• Автономный режим хранит слепок ваших данных только в вашем браузере, на вашем устройстве — он не отправляется никуда и стирается вместе с ним.</li>
          <li>• Полная копия базы доступна только деканату; пароли в ней — исключительно bcrypt-хеши, восстановить исходный пароль из копии нельзя.</li>
        </ul>
      </section>

      {/* О прототипе + настройки */}
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
          <Info className="h-4.5 w-4.5 text-primary" /> О прототипе
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          "Дека" — концепт цифрового деканата будущего, собранный командой для конкурса с помощью ИИ-ассистентов.
          Это не официальный сервис университета: все ФИО, группы, оценки и документы вымышлены.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!isStaff && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => (window.location.href = "/api/export")}
              title="Скачает все ваши данные одним файлом"
            >
              <Download className="h-4 w-4" />
              Мои данные (JSON)
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {resolvedTheme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => (window.location.href = "mailto:deka@example.edu")}>
            <Mail className="h-4 w-4" /> Написать разработчикам
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => (window.location.href = "tel:+70000000000")} tabIndex={-1}>
            <Phone className="h-4 w-4" /> Деканат
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 text-destructive hover:text-destructive", "lg:hidden")}
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.replace("/");
            }}
          >
            <LogOut className="h-4 w-4" /> Выйти
          </Button>
        </div>
      </section>

      {/* Подтверждение восстановления базы из файла */}
      <Dialog open={!!pendingRestore} onOpenChange={(open) => !open && setPendingRestore(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4.5 w-4.5 text-amber-500" />
              Заменить все данные?
            </DialogTitle>
            <DialogDescription>
              Файл "{pendingRestore?.name}" заменит содержимое всей базы: пользователей, расписание, заявки,
              оценки и объявления. Текущие данные будут удалены, отменить это нельзя. На случай ошибки сначала
              скачайте свежий полный бэкап.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setPendingRestore(null)} disabled={restoring}>
              Отмена
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmRestore} disabled={restoring}>
              {restoring ? "Восстанавливаю…" : "Да, заменить данные"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR студенческого */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User2 className="h-4.5 w-4.5 text-primary" />
              {isStaff ? "Карточка сотрудника" : "Электронный студенческий"}
            </DialogTitle>
            <DialogDescription>{user.name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pb-2">
            <div className="rounded-2xl border bg-white p-3">
              <QRCodeSVG value={qrPayload} size={180} fileName={`deka-qr-${user.login}.png`} />
            </div>
            <p className="text-center text-[12px] leading-snug text-muted-foreground">
              {isStaff
                ? "Код для входа в учебные корпуса и доступа к рабочим системам."
                : `${user.student?.faculty ?? ""} · ${user.student?.groupName ?? ""} · ${user.student?.recordBook ?? ""}`}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
