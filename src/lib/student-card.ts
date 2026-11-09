/**
 * Электронный студенческий: ссылка проверки и разбор кода.
 * QR содержит только случайный токен — без ФИО, группы и номера зачётки.
 */

export function cardVerifyPath(token: string): string {
  return `/verify/card/${encodeURIComponent(token)}`;
}

export function cardVerifyUrl(token: string): string {
  const path = cardVerifyPath(token);
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  return `${base}${path}`;
}

/** Достаёт 32-символьный hex-токен из ссылки, QR-текста или ручного ввода. */
export function normalizeCardToken(input: string): string | null {
  const match = input.trim().match(/[0-9a-f]{32}/i);
  return match ? match[0].toLocaleLowerCase("en-US") : null;
}
