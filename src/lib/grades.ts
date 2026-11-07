import { db } from "@/lib/db";

/**
 * Успеваемость: балльно-рейтинговая система.
 *  — «балльные» записи: maxScore >= 10 (модули, крупные контрольные на 100-балльной шкале);
 *  — «оценочные» записи: mark от «2» до «5» (коллоквиумы, КР, проекты) — из них считается средний балл;
 *  — зачёт/незачёт в средний балл не входят.
 */

export type SubjectSummary = {
  subjectName: string
  teacherName: string
  points: number // накоплено баллов (модули и крупные работы)
  pointsMax: number
  percent: number
  marks: { title: string; mark: string; date: Date }[]
  projected: "otl" | "hor" | "udov" | "risk"
  entries: {
    id: string
    kind: string
    title: string
    score: number | null
    maxScore: number | null
    mark: string | null
    date: Date
    comment: string | null
  }[]
}

const MARK_VALUE: Record<string, number> = { "5": 5, "4": 4, "3": 3, "2": 2 }

export function isNumericMark(mark: string | null | undefined): boolean {
  return !!mark && mark in MARK_VALUE
}

export function summarizeGrades(
  grades: {
    id: string
    subjectName: string
    teacherName: string
    kind: string
    title: string
    score: number | null
    maxScore: number | null
    mark: string | null
    date: Date
    comment: string | null
  }[]
): SubjectSummary[] {
  const bySubject = new Map<string, SubjectSummary>()
  for (const g of grades) {
    let s = bySubject.get(g.subjectName)
    if (!s) {
      s = {
        subjectName: g.subjectName,
        teacherName: g.teacherName,
        points: 0,
        pointsMax: 0,
        percent: 0,
        marks: [],
        projected: "udov",
        entries: [],
      }
      bySubject.set(g.subjectName, s)
    }
    s.entries.push(g)
    if ((g.maxScore ?? 0) >= 10 && g.score != null) {
      s.points += g.score
      s.pointsMax += g.maxScore ?? 0
    }
    if (isNumericMark(g.mark) && g.mark) {
      s.marks.push({ title: g.title, mark: g.mark, date: g.date })
    }
  }
  for (const s of bySubject.values()) {
    s.percent = s.pointsMax > 0 ? Math.round((s.points / s.pointsMax) * 100) : 0
    s.projected =
      s.percent >= 85 ? "otl" : s.percent >= 70 ? "hor" : s.percent >= 55 ? "udov" : "risk"
    s.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
  return [...bySubject.values()].sort((a, b) => b.percent - a.percent)
}

export function gpaOf(subjects: SubjectSummary[]): number | null {
  const values: number[] = []
  for (const s of subjects) {
    for (const m of s.marks) values.push(MARK_VALUE[m.mark] ?? 0)
  }
  if (!values.length) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
}

/** Рейтинг студента в группе по накопленным баллам. Возвращает место и размер группы. */
export async function groupRank(userId: string, groupName: string): Promise<{ rank: number; total: number; points: number } | null> {
  const mates = await db.studentProfile.findMany({
    where: { groupName },
    select: { userId: true },
  })
  if (!mates.length) return null
  const ids = mates.map((m) => m.userId)
  const grades = await db.grade.findMany({
    where: { userId: { in: ids }, maxScore: { gte: 10 }, score: { not: null } },
    select: { userId: true, score: true },
  })
  const totals = new Map<string, number>()
  for (const g of grades) {
    totals.set(g.userId, (totals.get(g.userId) ?? 0) + (g.score ?? 0))
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const idx = sorted.findIndex(([uid]) => uid === userId)
  if (idx === -1) return null
  return { rank: idx + 1, total: sorted.length, points: sorted[idx][1] }
}
