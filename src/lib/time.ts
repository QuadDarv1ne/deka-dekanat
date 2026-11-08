/**
 * Работа со временем. Университет живёт по московскому времени (UTC+3,
 * перехода на летнее время нет с 2014 года), поэтому вся логика "сегодня/
 * завтра/пара в 9:00" считается в MSK независимо от часового пояса сервера.
 */

export const MSK_OFFSET_MIN = 180

/** Момент "сейчас" и московские календарные величины одним вызовом. */
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

/** "4 ноября, вторник" из ISO-даты (по МСК). */
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

/** "сегодня / завтра / послезавтра / 5 ноября" */
export function relativeDay(dateIso: string): string {
  const today = mskTodayIso()
  if (dateIso === today) return 'сегодня'
  if (dateIso === addDaysIso(today, 1)) return 'завтра'
  if (dateIso === addDaysIso(today, 2)) return 'послезавтра'
  return humanDate(dateIso)
}

/** "через 15 мин / идёт сейчас / через 2 ч 5 мин" */
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

/** Календарная дата (YYYY-MM-DD) момента времени по московскому времени. */
export function mskDateIso(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() + MSK_OFFSET_MIN * 60000).toISOString().slice(0, 10)
}

/**
 * Текущий семестр по московской дате.
 * Осенний: 1 сентября — декабрь (январь — ещё зимняя сессия),
 * весенний: 1 февраля — июнь, август — каникулы перед новым учебным годом.
 */
export function semesterFor(dateIso: string): {
  kind: 'autumn' | 'spring' | 'summer'
  label: string
  startIso: string
  endIso: string
  sessionLabel: string
} {
  const year = Number(dateIso.slice(0, 4))
  const month = Number(dateIso.slice(5, 7))

  if (month === 1) {
    return {
      kind: 'autumn',
      label: 'Осенний семестр',
      startIso: `${year - 1}-09-01`,
      endIso: `${year - 1}-12-31`,
      sessionLabel: 'Зимняя сессия',
    }
  }
  if (month >= 2 && month <= 7) {
    return {
      kind: 'spring',
      label: 'Весенний семестр',
      startIso: `${year}-02-01`,
      endIso: `${year}-06-30`,
      sessionLabel: 'Летняя сессия',
    }
  }
  if (month === 8) {
    return {
      kind: 'summer',
      label: 'Летние каникулы',
      startIso: `${year}-09-01`,
      endIso: `${year}-12-31`,
      sessionLabel: 'Сессия',
    }
  }
  return {
    kind: 'autumn',
    label: 'Осенний семестр',
    startIso: `${year}-09-01`,
    endIso: `${year}-12-31`,
    sessionLabel: 'Зимняя сессия',
  }
}

/** Сколько календарных дней действует выданная справка. */
export const DOC_VALID_DAYS = 30

/**
 * Последний день действия документа: дата выдачи (по МСК) + 30 календарных дней.
 * Считаем именно календарные дни, а не "момент + 30 суток": иначе выдача
 * поздно вечером сдвигала бы срок на день вперёд.
 */
export function docValidUntilIso(issuedAt: Date | string | null | undefined): string {
  if (!issuedAt) return ''
  const issuedIso = mskDateIso(issuedAt)
  return issuedIso ? addDaysIso(issuedIso, DOC_VALID_DAYS) : ''
}

export function formatDateSafe(d: Date | string | null | undefined): string {
  if (!d) return ''
  const iso = mskDateIso(d)
  return iso ? humanDate(iso) : ''
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
