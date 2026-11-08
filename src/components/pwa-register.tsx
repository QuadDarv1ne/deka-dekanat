"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Регистрация service worker и баннер обновления приложения.
 *
 * Регистрация — только в production-сборке: в dev-режиме (в том числе в
 * песочнице) SW не активируется, чтобы Turbopack-обновления не кэшировались.
 *
 * Обновление с подтверждением: новая версия воркера ждёт активации (см. public/sw.js),
 * поэтому мы показываем баннер «Доступна новая версия». По кнопке «Обновить»
 * шлём воркеру APPLY_UPDATE, дожидаемся смены контроллера и перезагружаем страницу
 * ровно один раз — незаполненная форма не пропадёт из-за внезапного обновления.
 */
export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const trackWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // воркер установился и ждёт — значит, на странице уже работает старая версия
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(installing);
            setDismissed(false);
          }
        });
      });
    };

    let timer: ReturnType<typeof setInterval> | undefined;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        trackWaiting(reg);
        // периодически проверяем, не появилась ли новая версия
        timer = setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch(() => {
        /* нет https/localhost — SW просто не работает, это норма */
      });

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waiting) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    waiting.postMessage("APPLY_UPDATE");
  }, [waiting]);

  if (!waiting || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-card p-3 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700 dark:text-teal-300">
        <RefreshCw className="h-4.5 w-4.5" />
      </span>
      <p className="flex-1 text-[12.5px] leading-snug">
        Доступна новая версия «Деки». Обновите, чтобы получить последние изменения.
      </p>
      <button
        type="button"
        onClick={applyUpdate}
        className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Обновить
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Позже"
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
