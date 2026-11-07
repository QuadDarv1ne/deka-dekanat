"use client";

import { useSyncExternalStore } from "react";
import {
  Bell,
  CalendarDays,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Megaphone,
  Moon,
  Sparkles,
  Sun,
  Users2,
  User,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { subscribeFallback, getFallbackSnapshot, getServerFallbackSnapshot } from "@/components/cabinet/use-api";

export type CabinetUserInfo = {
  id: string;
  login: string;
  name: string;
  role: "STUDENT" | "STAFF";
  avatarColor: string;
};

export type StudentSection = "home" | "schedule" | "grades" | "requests" | "profile";
export type StaffSection = "requests" | "announcements" | "schedule" | "students" | "profile";

const AVATAR_BG: Record<string, string> = {
  teal: "bg-teal-600",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  lime: "bg-lime-600",
};

const STUDENT_NAV: { key: StudentSection; label: string; icon: LucideIcon }[] = [
  { key: "home", label: "Главная", icon: Home },
  { key: "schedule", label: "Расписание", icon: CalendarDays },
  { key: "grades", label: "Оценки", icon: GraduationCap },
  { key: "requests", label: "Заявки", icon: FileText },
  { key: "profile", label: "Профиль", icon: User },
];

const STAFF_NAV: { key: StaffSection; label: string; icon: LucideIcon }[] = [
  { key: "requests", label: "Заявки", icon: FileText },
  { key: "announcements", label: "Объявления", icon: Megaphone },
  { key: "schedule", label: "Переносы", icon: CalendarDays },
  { key: "students", label: "Студенты", icon: Users2 },
  { key: "profile", label: "Профиль", icon: User },
];

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
}

/** Внешний "сторож" статуса сети: подписка на события online/offline. */
function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

type ShellProps = {
  user: CabinetUserInfo;
  section: string;
  onNavigate: (key: string) => void;
  unread: number;
  onOpenNotifications: () => void;
  onLogout: () => void;
  loggingOut: boolean;
  children: React.ReactNode;
};

export function CabinetShell({ user, section, onNavigate, unread, onOpenNotifications, onLogout, loggingOut, children }: ShellProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isStaff = user.role === "STAFF";
  const nav = isStaff ? STAFF_NAV : STUDENT_NAV;
  const avatarCls = AVATAR_BG[user.avatarColor] ?? "bg-teal-600";
  // Статус сети через useSyncExternalStore: сервер всегда считает, что мы онлайн,
  // поэтому гидратация не ломается, даже если страница открылась без сети.
  // (снапшоты-примитивы стабильны сами по себе)
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  // "Данные показаны из сохранённого слепка" — сервер недоступен, но кабинет работает.
  // Серверный снапшот — стабильная константа из use-api (иначе React уходит в бесконечный рендер).
  const fallback = useSyncExternalStore(subscribeFallback, getFallbackSnapshot, getServerFallbackSnapshot);
  const offlineMode = !online || fallback.active;
  const fallbackTime = fallback.since
    ? new Date(fallback.since).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : null;

  const navItem = (item: (typeof nav)[number], compact = false) => {
    const active = section === item.key;
    const Icon = item.icon;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => onNavigate(item.key)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-xl transition-colors min-h-11",
          compact
            ? "flex-col gap-0.5 px-1 py-1.5 text-[11px] font-medium"
            : "w-full px-3 py-2.5 text-sm font-medium",
          compact
            ? active
              ? "text-primary"
              : "text-muted-foreground"
            : active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className={cn(compact ? "h-5 w-5" : "h-[18px] w-[18px]")} strokeWidth={active ? 2.2 : 1.8} />
        <span className={cn(compact ? "truncate" : "")}>{item.label}</span>
        {compact && item.key === "profile" && unread > 0 && (
          <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-rose-500" aria-hidden />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen">
      {/* ── Десктоп: боковая панель ─────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-sidebar px-4 py-5 lg:flex">
        <button type="button" onClick={() => onNavigate(isStaff ? "requests" : "home")} className="mb-6 flex items-center gap-2.5 px-2 text-left">
          { }
          <img src="/icon.svg" alt="Логотип Дека" className="h-9 w-9" />
          <span>
            <span className="block text-lg font-bold leading-none">Дека</span>
            <span className="block text-[11px] text-muted-foreground">цифровой деканат</span>
          </span>
        </button>

        <nav className="flex flex-col gap-1" aria-label="Основная навигация">
          {nav.map((item) => navItem(item))}
          {!isStaff && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11"
            >
              <Bell className="h-[18px] w-[18px]" />
              Уведомления
              {unread > 0 && (
                <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>
              )}
            </button>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2.5">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", avatarCls)}>
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{isStaff ? "Сотрудник деканата" : "Студент"}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Переключить тему"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={onLogout}
              disabled={loggingOut}
              aria-label="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <p className="px-2 text-[10px] leading-snug text-muted-foreground/70">
            Концепт для конкурса "Цифровой деканат будущего". Не официальный сервис вуза. Данные вымышленные.
          </p>
        </div>
      </aside>

      {/* ── Мобильная шапка ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <button type="button" onClick={() => onNavigate(isStaff ? "requests" : "home")} className="flex items-center gap-2">
          { }
          <img src="/icon.svg" alt="Логотип Дека" className="h-8 w-8" />
          <span className="text-base font-bold">Дека</span>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Переключить тему"
          >
            {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label={`Уведомления${unread ? `, ${unread} новых` : ""}`}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className={cn(
              "ml-0.5 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white",
              avatarCls,
              section === "profile" && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            aria-label="Профиль"
          >
            {initials(user.name)}
          </button>
        </div>
      </header>

      {/* ── Баннер автономного режима ────────────────────────── */}
      {offlineMode && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-[12px] font-semibold text-white">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          {fallback.active
            ? `Автономный режим — показан сохранённый слепок данных${fallbackTime ? ` (от ${fallbackTime})` : ""}. Отправка заявок и чат требуют сети.`
            : "Нет соединения — разделы покажут последний сохранённый слепок данных. Отправка заявок и чат требуют сети."}
        </div>
      )}

      {/* ── Контент ─────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 lg:max-w-5xl lg:pl-6 lg:pr-6 lg:pb-10 lg:pt-7 xl:px-8 lg:ml-64">
        {children}
      </main>

      {/* ── Мобильная нижняя навигация ──────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md lg:hidden"
        aria-label="Нижняя навигация"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5 pb-safe">
          {nav.map((item) => (
            <div key={item.key} className="relative flex-1">
              {navItem(item, true)}
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
