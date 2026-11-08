import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/api-helpers";
import { getDaysSlots, semesterWeek, type DaySlot } from "@/lib/schedule";
import { mskNow, humanDate, minutesToHHMM, weekStartIso, addDaysIso, WD_SHORT } from "@/lib/time";

/** Недельное расписание группы студента с переносами и отменами. ?week=N — смещение в неделях. */
export async function GET(req: Request) {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { student: true },
  });
  if (!user?.student) return NextResponse.json({ error: "Профиль студента не найден" }, { status: 404 });

  const url = new URL(req.url);
  const weekParam = Number(url.searchParams.get("week") ?? "0");
  const weekOffset = Number.isFinite(weekParam) ? Math.min(8, Math.max(-4, Math.trunc(weekParam))) : 0;

  const { date: todayIso } = mskNow();
  const mondayIso = weekOffset === 0 ? weekStartIso(todayIso) : addDaysIso(weekStartIso(todayIso), weekOffset * 7);

  const days: {
    dateIso: string;
    weekday: number;
    weekdayShort: string;
    human: string;
    isToday: boolean;
    isPast: boolean;
    slots: DaySlot[];
  }[] = [];

  // один батч-запрос на всю неделю вместо двух запросов на каждый день
  const dateIsos = Array.from({ length: 6 }, (_, i) => addDaysIso(mondayIso, i));
  const slotsByDate = await getDaysSlots(user.student.groupName, dateIsos);

  for (const dateIso of dateIsos) {
    const slots = slotsByDate.get(dateIso) ?? [];
    const wd = new Date(`${dateIso}T12:00:00.000Z`).getUTCDay();
    days.push({
      dateIso,
      weekday: wd === 0 ? 7 : wd,
      weekdayShort: WD_SHORT[(wd === 0 ? 7 : wd) - 1],
      human: humanDate(dateIso),
      isToday: dateIso === todayIso,
      isPast: dateIso < todayIso,
      slots: slots.map((s) => ({
        ...s,
        start: minutesToHHMM(s.startMin),
        end: minutesToHHMM(s.endMin),
      })),
    });
  }

  // изменения, затрагивающие эту неделю
  const changes = await db.scheduleChange.findMany({
    where: {
      groupName: user.student.groupName,
      OR: [{ date: { gte: mondayIso, lte: addDaysIso(mondayIso, 5) } }, { newDate: { gte: mondayIso, lte: addDaysIso(mondayIso, 5) } }],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    groupName: user.student.groupName,
    weekOffset,
    mondayIso,
    weekLabel:
      weekOffset === 0 ? "Эта неделя" : weekOffset === 1 ? "Следующая неделя" : weekOffset === -1 ? "Прошлая неделя" : `${humanDate(mondayIso)} — ${humanDate(addDaysIso(mondayIso, 5))}`,
    semesterWeek: semesterWeek(mondayIso, user.student.entryYear),
    days,
    changes: changes.map((c) => ({
      id: c.id,
      date: c.date,
      kind: c.kind,
      subject: c.subject,
      message: c.message,
      authorName: c.authorName,
    })),
  });
}
