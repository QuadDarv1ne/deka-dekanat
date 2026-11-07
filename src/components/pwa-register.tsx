"use client";

import { useEffect } from "react";

/**
 * Регистрация service worker только в production-сборке.
 * В dev-режиме (в том числе в песочнице) SW не активируется,
 * чтобы Turbopack-обновления не кэшировались и не ломали hot reload.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* нет https/localhost — SW просто не работает, это норма */
    });
  }, []);

  return null;
}
