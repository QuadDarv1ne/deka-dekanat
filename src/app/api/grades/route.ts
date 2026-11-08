import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/api-helpers";
import { summarizeGrades, gpaOf, groupRank } from "@/lib/grades";
import { mskNow, humanDate, minutesToHHMM, semesterFor } from "@/lib/time";

/** Успеваемость текущего семестра студента: только свои записи. */
export async function GET() {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { student: true },
  });
  if (!user?.student) return NextResponse.json({ error: "Профиль студента не найден" }, { status: 404 });

  const { date: todayIso } = mskNow();
  const semester = semesterFor(todayIso);
  const semesterStart = new Date(`${semester.startIso}T00:00:00.000Z`);

  const [grades, exams, rank] = await Promise.all([
    db.grade.findMany({
      where: { userId: user.id, date: { gte: semesterStart } },
      orderBy: { date: "desc" },
    }),
    db.examItem.findMany({
      where: { groupName: user.student.groupName, date: { gte: todayIso } },
      orderBy: { date: "asc" },
    }),
    groupRank(user.id, user.student.groupName),
  ]);

  const subjects = summarizeGrades(grades);
  const gpa = gpaOf(subjects);

  const summary = {
    gpa,
    subjectsCount: subjects.length,
    riskCount: subjects.filter((s) => s.projected === "risk").length,
    excellentCount: subjects.filter((s) => s.projected === "otl").length,
    averagePercent: subjects.length
      ? Math.round(subjects.reduce((a, s) => a + s.percent, 0) / subjects.length)
      : 0,
  };

  return NextResponse.json({
    summary,
    rank,
    semesterStartIso: semester.startIso,
    semesterLabel: semester.label,
    sessionLabel: semester.sessionLabel,
    subjects: subjects.map((s) => ({
      ...s,
      marks: s.marks.map((m) => ({ ...m, date: m.date.toISOString() })),
      entries: s.entries.map((e) => ({ ...e, date: e.date.toISOString() })),
    })),
    exams: exams.map((e) => ({
      id: e.id,
      subjectName: e.subjectName,
      kind: e.kind,
      date: e.date,
      humanDate: humanDate(e.date, { withWeekday: true }),
      time: minutesToHHMM(e.startMin),
      room: e.room,
      teacherName: e.teacherName,
      daysLeft: Math.max(0, Math.round((new Date(`${e.date}T12:00:00.000Z`).getTime() - new Date(`${todayIso}T12:00:00.000Z`).getTime()) / 86400000)),
    })),
  });
}
