import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, IdCard, LogIn, ShieldAlert, ShieldX } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditEntry, AUDIT } from "@/lib/audit";
import { normalizeCardToken } from "@/lib/student-card";
import { formatDateSafe } from "@/lib/time";

/**
 * Проверка электронного студенческого по QR-ссылке.
 * В отличие от проверки справки, карточка содержит персональные данные,
 * поэтому страница доступна только вошедшему сотруднику университета.
 */

export const metadata: Metadata = {
  title: "Проверка студенческого — Дека",
  description: "Проверка электронного студенческого сотрудником университета.",
};

export const dynamic = "force-dynamic";

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2 last:border-0">
      <dt className="shrink-0 text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[13px] font-medium leading-snug">{value}</dd>
    </div>
  );
}

export default async function StudentCardVerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = normalizeCardToken(raw);
  const session = await getSession();
  const isStaff = session?.role === "STAFF";

  const profile =
    token && isStaff
      ? await db.studentProfile.findUnique({
          where: { cardToken: token },
          include: { user: { select: { name: true, login: true, role: true } } },
        })
      : null;

  if (profile && profile.user.role === "STUDENT") {
    await db.auditLog.create({
      data: auditEntry(
        { id: session!.uid, name: session!.name, role: session!.role },
        AUDIT.studentCardVerify,
        profile.id,
        { groupName: profile.groupName, faculty: profile.faculty }
      ),
    });
  }

  const valid = Boolean(profile && profile.user.role === "STUDENT");
  const malformed = !token;

  return (
    <main className="flex min-h-dvh flex-col items-center bg-[#f6f5ef] px-4 py-8 sm:py-14 dark:bg-[#12181d]">
      <div className="w-full max-w-lg">
        <header className="text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">Университет Дека</p>
          <h1 className="mt-1.5 text-[19px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Электронный студенческий
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
            QR-код содержит случайную ссылку. Персональные данные видны только сотруднику после входа.
          </p>
        </header>

        <section className="mt-6" aria-live="polite">
          {!isStaff ? (
            <div className="overflow-hidden rounded-3xl border border-amber-500/25 bg-white shadow-sm dark:bg-card">
              <div className="flex items-center gap-3 bg-amber-500/10 px-5 py-4">
                <LogIn className="h-8 w-8 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
                <div>
                  <p className="text-[15.5px] font-bold text-amber-800 dark:text-amber-300">Нужен вход сотрудника</p>
                  <p className="text-[12px] leading-snug text-amber-800/80 dark:text-amber-300/80">
                    Войдите в кабинет деканата, чтобы проверить студенческий. Студентам и гостям карточка не показывается.
                  </p>
                </div>
              </div>
              <div className="px-5 py-4">
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Перейти к входу
                </Link>
              </div>
            </div>
          ) : valid && profile ? (
            <div className="overflow-hidden rounded-3xl border border-lime-600/25 bg-white shadow-sm dark:bg-card">
              <div className="flex items-center gap-3 bg-lime-600/10 px-5 py-4">
                <BadgeCheck className="h-8 w-8 shrink-0 text-lime-700 dark:text-lime-400" aria-hidden />
                <div>
                  <p className="text-[15.5px] font-bold text-lime-800 dark:text-lime-300">Студенческий действителен</p>
                  <p className="text-[12px] leading-snug text-lime-800/80 dark:text-lime-300/80">
                    Карточка выпущена системой деканата
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-b px-5 py-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-sm font-bold text-white">
                  {profile.user.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold leading-tight">{profile.user.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">логин: {profile.user.login}</p>
                </div>
                <IdCard className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              </div>
              <dl className="px-5 py-2">
                <DetailRow label="Факультет" value={profile.faculty} />
                <DetailRow label="Направление" value={profile.program} />
                <DetailRow label="Курс" value={`${profile.course} курс`} />
                <DetailRow label="Группа" value={profile.groupName} />
                <DetailRow label="Зачётная книжка" value={<span className="font-mono">{profile.recordBook}</span>} />
                <DetailRow label="Форма обучения" value={profile.studyForm} />
                <DetailRow label="Статус" value={profile.status} />
                <DetailRow label="Карточка выпущена" value={profile.cardIssuedAt ? formatDateSafe(profile.cardIssuedAt.toISOString()) : "—"} />
                <DetailRow label="Проверил" value={session?.name ?? "—"} />
              </dl>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-destructive/25 bg-white shadow-sm dark:bg-card">
              <div className="flex items-center gap-3 bg-destructive/10 px-5 py-4">
                {malformed ? (
                  <ShieldAlert className="h-8 w-8 shrink-0 text-destructive" aria-hidden />
                ) : (
                  <ShieldX className="h-8 w-8 shrink-0 text-destructive" aria-hidden />
                )}
                <div>
                  <p className="text-[15.5px] font-bold text-destructive">
                    {malformed ? "Ссылка повреждена" : "Студенческий не найден"}
                  </p>
                  <p className="text-[12px] leading-snug text-destructive/80 dark:text-destructive/70">
                    {malformed
                      ? "QR-код не содержит корректный код карточки. Попросите студента открыть QR заново."
                      : "Карточка не выпущена или код не совпадает с записью в системе."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-6 space-y-1.5 text-center">
          <p className="text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
            Проверка фиксируется в журнале действий деканата. Прототип конкурса, все данные вымышленные.
          </p>
          <Link href="/" className="inline-block text-[12px] font-medium text-primary hover:underline">
            Перейти в кабинет «Дека»
          </Link>
        </footer>
      </div>
    </main>
  );
}
