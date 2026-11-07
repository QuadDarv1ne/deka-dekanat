import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent, greetingFor } from "@/lib/api-helpers";
import { getDaySlots, findNextClass, semesterWeek } from "@/lib/schedule";
import { mskNow, humanDate, minutesToHHMM } from "@/lib/time";

/** Сводка для главного экрана студента: только его группа и его данные. */
export async function GET() {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { student: true },
  });
  if (!user?.student) return NextResponse.json({ error: "Профиль студента не найден" }, { status: 404 });

  const { groupName, faculty } = user.student;
  const { date, weekday, minutes } = mskNow();
  const todayIso = date;

  const [todaySlots, nextClass, announcements, deadlineRows] = await Promise.all([
    getDaySlots(groupName, todayIso),
    findNextClass(groupName),
    db.announcement.findMany({
      where: {
        OR: [{ audience: "ALL" }, { audience: `GROUP:${groupName}` }, { audience: `FACULTY:${faculty}` }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.announcement.findMany({
      where: {
        deadline: { gte: new Date() },
        OR: [{ audience: "ALL" }, { audience: `GROUP:${groupName}` }, { audience: `FACULTY:${faculty}` }],
      },
      orderBy: { deadline: "asc" },
      take: 4,
    }),
  ]);

  const activeRequests = await db.serviceRequest.count({
    where: { userId: user.id, status: { in: ["NEW", "IN_PROGRESS"] } },
  });

  return NextResponse.json({
    greeting: greetingFor(minutes),
    today: {
      dateIso: todayIso,
      human: humanDate(todayIso, { withWeekday: true }),
      isWeekend: weekday === 7,
    },
    semesterWeek: semesterWeek(todayIso, user.student.entryYear),
    todaySlots: todaySlots.map((s) => ({
      ...s,
      start: minutesToHHMM(s.startMin),
      end: minutesToHHMM(s.endMin),
      isNow: s.status !== "cancelled" && minutes >= s.startMin && minutes < s.endMin,
      isPast: minutes >= s.endMin,
    })),
    nextClass: nextClass
      ? {
          dateIso: nextClass.dateIso,
          human: humanDate(nextClass.dateIso, { withWeekday: true }),
          start: minutesToHHMM(nextClass.slot.startMin),
          end: minutesToHHMM(nextClass.slot.endMin),
          subjectName: nextClass.slot.subjectName,
          kind: nextClass.slot.kind,
          room: nextClass.slot.room,
          building: nextClass.slot.building,
          teacherName: nextClass.slot.teacherName,
        }
      : null,
    announcements: announcements.slice(0, 4).map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      pinned: a.pinned,
      createdAt: a.createdAt,
    })),
    deadlines: deadlineRows.map((a) => ({
      id: a.id,
      title: a.title,
      deadline: a.deadline,
      category: a.category,
    })),
    activeRequests,
  });
}
