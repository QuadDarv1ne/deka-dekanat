/**
 * Ссылка на публичную проверку подлинности справки.
 * Единый формат для QR-кода на печатной форме и диалога выдачи в кабинете:
 * /verify?doc=НОМЕР.КОД (страница разбирает строку по первой точке).
 */

/** Относительный путь — безопасен для серверного рендера. */
export function docVerifyPath(number: string, docCode: string): string {
  return `/verify?doc=${encodeURIComponent(`${number}.${docCode}`)}`
}

/**
 * Абсолютная ссылка для QR-кода. QR сканируют телефоном, поэтому нужен полный
 * адрес с доменом; в браузере берём текущий origin, на сервере — базу из env.
 */
export function docVerifyUrl(number: string, docCode: string): string {
  const path = docVerifyPath(number, docCode)
  if (typeof window !== "undefined") return `${window.location.origin}${path}`
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "")
  return `${base}${path}`
}
