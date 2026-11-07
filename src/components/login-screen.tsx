"use client";

import { useState } from "react";
import { Loader2, Lock, LogIn, ShieldCheck, Sparkles, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { login: "student1", label: "Студент — Ковалёва А. С.", hint: "2 курс, ПИ-231, ИТ-факультет" },
  { login: "student2", label: "Студент — Соколов Д. А.", hint: "3 курс, ЭК-321, экономика" },
  { login: "dekanat", label: "Сотрудник деканата", hint: "Смирнова О. В." },
];
const DEMO_PASSWORD = "demo1234";

export function LoginScreen() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось войти");
        return;
      }
      // Полная перезагрузка: серверный компонент отдаст кабинет уже с сессией
      window.location.replace("/");
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  function fill(acc: string) {
    setLogin(acc);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Брендированная панель */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 px-6 py-8 text-white lg:w-[46%] lg:px-12 lg:py-0 lg:flex lg:flex-col lg:justify-center">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="lg:max-w-md">
          <div className="flex items-center gap-3"> 
            <img src="/icon.svg" alt="Логотип Дека" className="h-12 w-12 rounded-xl" />
            <div>
              <p className="text-xl font-bold leading-none">Дека</p>
              <p className="text-sm text-teal-100/90">цифровой деканат будущего</p>
            </div>
          </div>
          <h2 className="mt-8 text-3xl font-bold leading-tight text-balance lg:text-4xl">
            Вся учёба — <span className="text-amber-300">в одном окне</span>
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-teal-50/90">
            Расписание, оценки, справки и объявления больше не разбросаны по чатам и сайтам.
            А ИИ-ассистент Дека подскажет, что происходит в университете именно у вас.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-teal-50/85">
            {[
              "Пара за пару касаний: расписание и переносы",
              "Справка онлайн — и статус как у доставки",
              "Оценки и прогресс семестра наглядно",
              "Работает с телефона от 360 px",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Форма */}
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight">Вход в кабинет</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Учёба, документы и деканат — в одном месте.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="login">Логин</Label>
              <div className="relative">
                <User2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login"
                  className="pl-9"
                  placeholder="например, student1"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Войти
            </Button>
          </form>

          <div className="mt-7 rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Тестовые аккаунты (для жюри)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Пароль у всех: <span className="font-mono font-semibold">demo1234</span>. Нажмите на аккаунт, чтобы подставить.
            </p>
            <div className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.login}
                  type="button"
                  onClick={() => fill(a.login)}
                  className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span>
                    <span className="block text-[13px] font-medium">{a.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{a.hint}</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{a.login}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
              Все данные вымышленные. Пароли хранятся только в виде bcrypt-хеша, сессия — в httpOnly-cookie.
            </p>
          </div>
        </div>
      </div>

      <p className="px-6 pb-6 text-center text-[11px] leading-relaxed text-muted-foreground lg:absolute lg:bottom-3 lg:right-4 lg:px-0">
        Концепт для конкурса «Цифровой деканат будущего». Не является официальным сервисом вуза.
        Все ФИО, оценки и документы — вымышленные.
      </p>
    </div>
  );
}
