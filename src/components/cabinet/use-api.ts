"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Хук загрузки JSON из API + децентрализованный офлайн-режим.
 *
 * Каждый успешный ответ сохраняется в localStorage устройства пользователя
 * (только его собственные данные). Если сервер недоступен — нет сети, сервер
 * лежит, — секция показывает последний сохранённый слепок: кабинет продолжает
 * работать даже без связи с "центром". Действия (отправка форм) по-прежнему
 * требуют сети и честно просят её дождаться.
 */

const CACHE_PREFIX = "deka-cache:";

// ── Глобальный стор "данные показаны из резервной копии" (для баннера оболочки)
type FallbackSnapshot = { active: boolean; since: number | null };
let fallbackSnapshot: FallbackSnapshot = { active: false, since: null };
const fallbackUrls = new Map<string, number>();
const fallbackListeners = new Set<() => void>();

function emitFallback() {
  fallbackListeners.forEach((l) => l());
}
function enterFallback(url: string) {
  fallbackUrls.set(url, Date.now());
  let since = Date.now();
  fallbackUrls.forEach((t) => { if (t < since) since = t; });
  fallbackSnapshot = { active: true, since };
  emitFallback();
}
function exitFallbackUrl(url: string) {
  if (fallbackUrls.delete(url) && fallbackUrls.size === 0) {
    fallbackSnapshot = { active: false, since: null };
    emitFallback();
  }
}
export function subscribeFallback(cb: () => void) {
  fallbackListeners.add(cb);
  return () => {
    fallbackListeners.delete(cb);
  };
}
export function getFallbackSnapshot(): FallbackSnapshot {
  return fallbackSnapshot;
}
/**
 * На сервере офлайн-режима нет — гидратация не ломается.
 * ВАЖНО: useSyncExternalStore требует кешированный снапшот — один и тот же
 * объект на каждый вызов. Новый объект в return ломает React бесконечным
 * циклом рендера ("getServerSnapshot should be cached"), поэтому это
 * константа уровня модуля.
 */
const SERVER_FALLBACK_SNAPSHOT: FallbackSnapshot = { active: false, since: null };
export function getServerFallbackSnapshot(): FallbackSnapshot {
  return SERVER_FALLBACK_SNAPSHOT;
}

/** Читает сохранённый слепок ответа для URL. */
function readCache<T>(url: string): { t: number; data: T } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; data: T };
    if (parsed && typeof parsed.t === "number" && parsed.data) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function useApi<T>(url: string | null) {
  const [state, setState] = useState<{ url: string | null; data: T | null; error: string | null; cachedAt: number | null }>({
    url,
    data: null,
    error: null,
    cachedAt: null,
  });
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!url) return;
    const mine = ++seq.current;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? `Ошибка запроса (${res.status})`);
        // успех — обновляем слепок данных на устройстве
        try {
          localStorage.setItem(CACHE_PREFIX + url, JSON.stringify({ t: Date.now(), data: json }));
        } catch {
          // переполнение квоты — некритично, офлайн-режим просто будет неактуален
        }
        if (!cancelled && seq.current === mine) {
          exitFallbackUrl(url);
          setState({ url, data: json as T, error: null, cachedAt: null });
        }
      } catch (e) {
        // сеть недоступна (fetch бросил TypeError) или сервер упал (5xx) —
        // показываем сохранённый слепок вместо ошибки
        const serverDown = e instanceof TypeError || (e instanceof Error && /^Ошибка запроса \(5\d\d\)/.test(e.message));
        const cached = serverDown ? readCache<T>(url) : null;
        if (!cancelled && seq.current === mine && cached) {
          enterFallback(url);
          setState({ url, data: cached.data, error: null, cachedAt: cached.t });
        } else if (!cancelled && seq.current === mine) {
          const message = e instanceof Error ? e.message : "Ошибка сети";
          setState((s) => ({ url, data: s.url === url ? s.data : null, error: message, cachedAt: null }));
        }
      }
    })();
    return () => {
      cancelled = true;
      exitFallbackUrl(url);
    };
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const fresh = state.url === url;
  const data = fresh ? state.data : null;
  const error = fresh ? state.error : null;
  const cachedAt = fresh ? state.cachedAt : null;
  const loading = Boolean(url) && data === null && error === null;
  return { data, error, loading, reload, cachedAt };
}

/** POST/PATCH-запрос с JSON-телом; возвращает данные или бросает ошибку с текстом API. */
export async function apiSend<T = unknown>(url: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Нет соединения — действие требует сети. Данные на экране сохранены.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Ошибка (${res.status})`);
  return json as T;
}
