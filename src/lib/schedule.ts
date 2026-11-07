import { db } from "@/lib/db";
import { mskNow } from "@/lib/time";

/**
 * Расписание с учётом переносов и отмен.
 * Правила применения изменений к конкретной дате:
 *  — CANCELLED (date == D): пара с этим предметом в этот день отменяется;
 *  — MOVED (date == D): исходная пара в этот день исчезает;
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

export async function getDaySlots(groupName: string, dateIso: string): Promise<DaySlot[]> {
  const d = new Date(`${dateIso}T12:00:00.000Z`)
  const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay()

  const [slots, changes] = await Promise.all([
    db.scheduleSlot.findMany({
      where: { groupName, weekday },
      orderBy: { startMin: "asc" },
    }),
    db.scheduleChange.findMany({
      where: { groupName, OR: [{ date: dateIso }, { newDate: dateIso }] },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const removed = new Set<string>() // id исходных слотов, которые трогать не надо
  const result: DaySlot[] = []

  for (const ch of changes) {
    if (ch.date === dateIso) {
      if (ch.kind === "CANCELLED") {
        for (const s of slots) {
          if (s.subjectName.startsWith(ch.subject) && !removed.has(s.id)) {
            removed.add(s.id)
            result.push({
              ...s,
              status: "cancelled",
              note: ch.message,
            })
          }
        }
      } else if (ch.kind === "MOVED") {
        for (const s of slots) {
          if (s.subjectName.startsWith(ch.subject) && !removed.has(s.id)) {
            removed.add(s.id)
            // исходная пара в этот день не проводится — место переноса придёт через newDate
          }
        }
      }
    }
    if (ch.newDate === dateIso && ch.kind === "MOVED") {
      result.push({
        id: `moved-${ch.id}`,
        startMin: ch.newStartMin ?? 540,
        endMin: (ch.newStartMin ?? 540) + 90,
        subjectName: ch.subject,
        kind: "Перенесённая пара",
        room: ch.newRoom ?? "—",
        building: null,
        teacherName: ch.authorName,
        status: "moved",
        note: ch.message,
      })
    }
  }

  for (const s of slots) {
    if (removed.has(s.id)) continue
    // замена аудитории без переноса времени
    const roomChange = changes.find(
      (ch) => ch.date === dateIso && ch.kind === "MOVED" && !ch.newDate && ch.newRoom && s.subjectName.startsWith(ch.subject)
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

/** Ближайшая предстоящая пара: ищем вперёд до 10 дней. */
export async function findNextClass(
  groupName: string
): Promise<{ dateIso: string; slot: DaySlot } | null> {
  const { date: todayIso, minutes } = mskNow()
  for (let i = 0; i < 10; i++) {
    const d = new Date(`${todayIso}T12:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const slots = await getDaySlots(groupName, iso)
    for (const s of slots) {
      if (s.status === "cancelled") continue
      if (i > 0 || s.startMin > minutes) {
        return { dateIso: iso, slot: s }
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
