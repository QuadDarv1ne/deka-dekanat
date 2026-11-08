import type { ScheduleChange, ScheduleSlot } from "@prisma/client";
import { db } from "@/lib/db";
import { mskNow, addDaysIso } from "@/lib/time";

/**
 * Расписание с учётом переносов и отмен.
 * Правила применения изменений к конкретной дате:
 *  — CANCELLED (date == D): пара с этим предметом в этот день отменяется;
 *  — MOVED (date == D, есть newDate): исходная пара в этот день исчезает;
 *  — MOVED (date == D, нет newDate): меняется только аудитория пары;
 *  — ROOM (date == D): меняется только аудитория пары;
 *  — MOVED/перенос "в этот день" (newDate == D): появляется дополнительная пара.
 */

export type DaySlot = {
  id: string
  startMin: number
  endMin: number
  subjectName: string
  kind: string
  room: string
  building: string | null
  teacherName: string
  status: "normal" | "cancelled" | "moved" | "room-changed"
  note?: string
}

export const isoWeekday = (dateIso: string) => {
  const wd = new Date(`${dateIso}T12:00:00.000Z`).getUTCDay()
  return wd === 0 ? 7 : wd
}

/**
 * Применение изменений к одному дню — чистая функция без запросов к БД.
 * Вынесена отдельно, чтобы неделю можно было посчитать одним-двумя запросами
 * вместо N+1 (по два запроса на каждый день).
 */
function computeDaySlots(
  dateIso: string,
  weekday: number,
  allSlots: ScheduleSlot[],
  changes: ScheduleChange[],
): DaySlot[] {
  const slots = allSlots.filter((s) => s.weekday === weekday)

  const removed = new Set<string>() // id исходных слотов, которые трогать не надо
  const result: DaySlot[] = []

  // замена только аудитории: либо явный ROOM, либо MOVED без новой даты
  const isRoomChange = (ch: ScheduleChange) => ch.kind === "ROOM" || (ch.kind === "MOVED" && !ch.newDate)
  const matchSlot = (s: ScheduleSlot, subject: string) => s.subjectName.startsWith(subject)

  for (const ch of changes) {
    if (ch.date === dateIso) {
      if (ch.kind === "CANCELLED") {
        for (const s of slots) {
          if (matchSlot(s, ch.subject) && !removed.has(s.id)) {
            removed.add(s.id)
            result.push({
              ...s,
              status: "cancelled",
              note: ch.message,
            })
          }
        }
      } else if (ch.kind === "MOVED" && ch.newDate) {
        // перенос на другую дату: исходная пара в этот день не проводится
        for (const s of slots) {
          if (matchSlot(s, ch.subject) && !removed.has(s.id)) {
            removed.add(s.id)
          }
        }
      }
    }
    if (ch.newDate === dateIso && ch.kind === "MOVED") {
      // данные исходной пары (преподаватель, вид занятия, аудитория) берём из её дня, а не из текущего
      const originWd = ch.date ? isoWeekday(ch.date) : weekday
      const origin = allSlots.find((s) => s.weekday === originWd && matchSlot(s, ch.subject))
      result.push({
        id: `moved-${ch.id}`,
        startMin: ch.newStartMin ?? 540,
        endMin: (ch.newStartMin ?? 540) + 90,
        subjectName: ch.subject,
        kind: origin?.kind ?? "Перенесённая пара",
        room: ch.newRoom ?? origin?.room ?? "—",
        building: ch.newRoom ? null : origin?.building ?? null,
        teacherName: origin?.teacherName ?? ch.authorName,
        status: "moved",
        note: ch.message,
      })
    }
  }

  for (const s of slots) {
    if (removed.has(s.id)) continue
    // замена аудитории без переноса времени
    const roomChange = changes.find(
      (ch) => ch.date === dateIso && isRoomChange(ch) && ch.newRoom && matchSlot(s, ch.subject)
    )
    if (roomChange) {
      result.push({
        ...s,
        room: roomChange.newRoom ?? s.room,
        status: "room-changed",
        note: roomChange.message,
      })
      continue
    }
    result.push({ ...s, status: "normal" })
  }

  return result.sort((a, b) => a.startMin - b.startMin)
}

/** Слоты недели для набора дат: два запроса к БД на весь диапазон. */
export async function getDaysSlots(
  groupName: string,
  dateIsos: string[]
): Promise<Map<string, DaySlot[]>> {
  const dates = [...new Set(dateIsos)]
  const out = new Map<string, DaySlot[]>()
  if (!dates.length) return out

  const weekdaysByDate = new Map(dates.map((d) => [d, isoWeekday(d)] as const))

  const changes = await db.scheduleChange.findMany({
    where: { groupName, OR: [{ date: { in: dates } }, { newDate: { in: dates } }] },
    orderBy: { createdAt: "desc" },
  })

  // Слоты нужных дней недели: сами дни + дни, откуда перенесены пары в эти дни.
  // Исходная пара нужна, чтобы взять настоящего преподавателя и вид занятия.
  const weekdays = new Set<number>(weekdaysByDate.values())
  for (const ch of changes) {
    if (ch.kind === "MOVED" && ch.date && ch.newDate && weekdaysByDate.has(ch.newDate)) {
      weekdays.add(isoWeekday(ch.date))
    }
  }

  const allSlots = await db.scheduleSlot.findMany({
    where: { groupName, weekday: { in: [...weekdays] } },
    orderBy: { startMin: "asc" },
  })

  for (const dateIso of dates) {
    const dayChanges = changes.filter((ch) => ch.date === dateIso || ch.newDate === dateIso)
    out.set(dateIso, computeDaySlots(dateIso, weekdaysByDate.get(dateIso)!, allSlots, dayChanges))
  }
  return out
}

export async function getDaySlots(groupName: string, dateIso: string): Promise<DaySlot[]> {
  const byDate = await getDaysSlots(groupName, [dateIso])
  return byDate.get(dateIso) ?? []
}

/** Ближайшая предстоящая пара: ищем вперёд до 10 дней (один батч-запрос на диапазон). */
export async function findNextClass(
  groupName: string
): Promise<{ dateIso: string; slot: DaySlot } | null> {
  const { date: todayIso, minutes } = mskNow()
  const dates = Array.from({ length: 10 }, (_, i) => addDaysIso(todayIso, i))
  const byDate = await getDaysSlots(groupName, dates)
  for (let i = 0; i < dates.length; i++) {
    for (const s of byDate.get(dates[i]) ?? []) {
      if (s.status === "cancelled") continue
      if (i > 0 || s.startMin > minutes) {
        return { dateIso: dates[i], slot: s }
      }
    }
  }
  return null
}

/** Номер учебной недели семестра (старт — 1 сентября текущего учебного года). */
export function semesterWeek(todayIso: string, acYear: number): { week: number; total: number } {
  void acYear // считаем от текущего учебного года, параметр оставлен для совместимости
  const y = Number(todayIso.slice(0, 4))
  const academicYear = Number(todayIso.slice(5, 7)) >= 8 ? y : y - 1
  const start = new Date(`${academicYear}-09-01T12:00:00.000Z`)
  const today = new Date(`${todayIso}T12:00:00.000Z`)
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000)
  const week = days < 0 ? 1 : Math.max(1, Math.min(16, Math.floor(days / 7) + 1))
  return { week, total: 16 }
}
