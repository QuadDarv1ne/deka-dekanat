/**
 * Работа со временем. Университет живёт по московскому времени (UTC+3,
 * перехода на летнее время нет с 2014 года), поэтому вся логика «сегодня/
 * завтра/пара в 9:00» считается в MSK независимо от часового пояса сервера.
 */

export const MSK_OFFSET_MIN = 180

/** Момент «сейчас» и московские календарные величины одним вызовом. */
export function mskNow(): {
  now: Date // настоящий момент (для таймеров)
  date: string // YYYY-MM-DD по МСК
  weekday: number // 1..7, 1 = понедельник
  minutes: number // минут с 00:00 по МСК
} {
  const now = new Date()
  const shifted = new Date(now.getTime() + MSK_OFFSET_MIN * 60000)
  const wd = shifted.getUTCDay() === 0 ? 7 : shifted.getUTCDay()
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes()
  return { now, date: shifted.toISOString().slice(0, 10), weekday: wd, minutes }
}

export function mskTodayIso(): string {
  return mskNow().date
}

/** Date (момент UTC) для московской даты YYYY-MM-DD и минут от полуночи. */
export function mskMoment(dateIso: string, minutes: number): Date {
  return new Date(new Date(`${dateIso}T00:00:00.000Z`).getTime() + (minutes - MSK_OFFSET_MIN) * 60000)
}

export function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Понедельник недели, к которой относится дата (ISO). */
export function weekStartIso(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00.000Z`)
  const wd = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  return addDaysIso(dateIso, 1 - wd)
}

export const WD_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const WD_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']

export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** «4 ноября, вторник» из ISO-даты (по МСК). */
export function humanDate(dateIso: string, opts?: { short?: boolean; withWeekday?: boolean }): string {
  const d = new Date(`${dateIso}T12:00:00.000Z`)
  const months = opts?.short
    ? ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    : ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  const base = `${d.getUTCDate()} ${months[d.getUTCMonth()]}`
  if (!opts?.withWeekday) return base
  const wd = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  return `${base}, ${WD_FULL[wd - 1]}`
}

/** «сегодня / завтра / послезавтра / 5 ноября» */
export function relativeDay(dateIso: string): string {
  const today = mskTodayIso()
  if (dateIso === today) return 'сегодня'
  if (dateIso === addDaysIso(today, 1)) return 'завтра'
  if (dateIso === addDaysIso(today, 2)) return 'послезавтра'
  return humanDate(dateIso)
}

/** «через 15 мин / идёт сейчас / через 2 ч 5 мин» */
export function relativeTimeTo(minutesOfDay: number): string {
  const { minutes } = mskNow()
  const diff = minutesOfDay - minutes
  if (diff <= 0 && diff > -90) return 'идёт сейчас'
  if (diff > 0) {
    if (diff < 60) return `через ${diff} мин`
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return `через ${h} ч${m ? ` ${m} мин` : ''}`
  }
  return 'уже прошло'
}

export function formatDateSafe(d: Date | string | null | undefined): string {
  if (!d) return ''
  const iso = typeof d === 'string' ? d : d.toISOString()
  return humanDate(iso.slice(0, 10))
}

export function formatDateTimeSafe(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  const shifted = new Date(date.getTime() + MSK_OFFSET_MIN * 60000)
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  const hh = String(shifted.getUTCHours()).padStart(2, '0')
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${shifted.getUTCDate()} ${months[shifted.getUTCMonth()]}, ${hh}:${mm}`
}
