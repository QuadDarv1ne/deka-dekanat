import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-helpers";
import { auditEntry, AUDIT } from "@/lib/audit";
import { getDaySlots } from "@/lib/schedule";
import { mskNow, humanDate, addDaysIso, minutesToHHMM } from "@/lib/time";

/**
 * Изменения расписания: просмотр дня группы (GET) и создание переноса/отмены (POST).
 * Все студенты группы сразу получают уведомление.
 */

/** Время начала пары по умолчанию, если при переносе его не указали (09:00). */
const DEFAULT_PAIR_START_MIN = 540;

export async function GET(req: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const { date: todayIso } = mskNow();
  const date = url.searchParams.get("date") ?? todayIso;
  const group = url.searchParams.get("group") ?? "";

  const [groups, recent] = await Promise.all([
    db.studentProfile.findMany({ select: { groupName: true }, distinct: ["groupName"], orderBy: { groupName: "asc" } }),
    db.scheduleChange.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  const groupName = group || groups[0]?.groupName || "";
  const slots = groupName && date ? await getDaySlots(groupName, date) : [];

  return NextResponse.json({
    todayIso,
    groups: groups.map((g) => g.groupName),
    groupName,
    date,
    humanDate: humanDate(date, { withWeekday: true }),
    slots: slots.map((s) => ({
      id: s.id,
      start: minutesToHHMM(s.startMin),
      startMin: s.startMin,
      end: minutesToHHMM(s.endMin),
      subjectName: s.subjectName,
      kind: s.kind,
      room: s.room,
      building: s.building,
      teacherName: s.teacherName,
      status: s.status,
    })),
    recent: recent.map((c) => ({
      id: c.id,
      groupName: c.groupName,
      date: c.date,
      kind: c.kind,
      subject: c.subject,
      message: c.message,
      authorName: c.authorName,
      createdAt: c.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  let body: {
    groupName?: string;
    date?: string;
    subject?: string;
    kind?: string;
    newDate?: string;
    newStartMin?: number | string | null;
    newRoom?: string;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const groupName = String(body.groupName ?? "").trim();
  const date = String(body.date ?? "").slice(0, 10);
  const subject = String(body.subject ?? "").trim();
  const kind = String(body.kind ?? "");
  const reason = String(body.reason ?? "").trim().slice(0, 300);
  const newDate = body.newDate ? String(body.newDate).slice(0, 10) : null;
  // null/""/undefined — время не задано; иначе число. Number(null) === 0,
  // поэтому проверяем на пустоту явно, иначе пара уезжала бы на 00:00.
  const rawStartMin =
    body.newStartMin === undefined || body.newStartMin === null || body.newStartMin === ""
      ? null
      : Number(body.newStartMin);
  const newStartMin = rawStartMin !== null && Number.isFinite(rawStartMin) ? rawStartMin : null;
  const newRoom = body.newRoom ? String(body.newRoom).trim().slice(0, 60) : null;

  if (!groupName || !date || !subject) {
    return NextResponse.json({ error: "Укажите группу, дату и предмет" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Дата должна быть в формате ГГГГ-ММ-ДД" }, { status: 400 });
  }
  if (!["CANCELLED", "MOVED", "ROOM"].includes(kind)) {
    return NextResponse.json({ error: "Тип изменения: отмена, перенос или замена аудитории" }, { status: 400 });
  }
  if (date < mskNow().date) {
    return NextResponse.json({ error: "Нельзя менять расписание прошедшего дня" }, { status: 400 });
  }
  if (kind === "MOVED") {
    if (!newDate) return NextResponse.json({ error: "Укажите дату, на которую переносится пара" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return NextResponse.json({ error: "Новая дата должна быть в формате ГГГГ-ММ-ДД" }, { status: 400 });
    }
    if (newDate < date) {
      return NextResponse.json({ error: "Нельзя перенести пару на более раннюю дату" }, { status: 400 });
    }
  }
  if (newStartMin !== null && (newStartMin < 0 || newStartMin > 1439)) {
    return NextResponse.json({ error: "Некорректное время начала пары" }, { status: 400 });
  }

  let message = "";
  if (kind === "CANCELLED") {
    message = `Занятие "${subject}" ${humanDate(date, { withWeekday: true })} отменено.`;
  } else if (kind === "MOVED") {
    if (!newDate) return NextResponse.json({ error: "Укажите дату, на которую переносится пара" }, { status: 400 });
    const t = minutesToHHMM(newStartMin ?? DEFAULT_PAIR_START_MIN);
    message = `Занятие "${subject}" ${humanDate(date, { short: true })} перенесено на ${humanDate(newDate, { short: true })}, ${t}${newRoom ? `, ауд. ${newRoom}` : ""}.`;
  } else {
    if (!newRoom) return NextResponse.json({ error: "Укажите новую аудиторию" }, { status: 400 });
    message = `Занятие "${subject}" ${humanDate(date, { short: true })} пройдёт в ауд. ${newRoom}.`;
  }
  if (reason) message += ` Причина: ${reason}.`;

  const created = await db.scheduleChange.create({
    data: {
      groupName,
      date,
      kind,
      subject,
      message,
      newDate: kind === "MOVED" ? newDate : null,
      newStartMin: kind === "MOVED" ? newStartMin : null,
      newRoom: kind === "ROOM" || kind === "MOVED" ? newRoom : null,
      authorName: session.name,
    },
  });

  const students = await db.studentProfile.findMany({ where: { groupName }, select: { userId: true } });
  if (students.length) {
    await db.notification.createMany({
      data: students.map((s) => ({
        userId: s.userId,
        kind: "SCHEDULE",
        title: "Расписание изменено",
        body: message,
      })),
    });
  }

  await db.auditLog.create({
    data: auditEntry(
      { id: session.uid, name: session.name, role: session.role },
      AUDIT.scheduleChanged,
      created.id,
      { groupName, date, kind, subject, newDate, newStartMin, newRoom }
    ),
  });

  return NextResponse.json({ ok: true, change: created, notified: students.length });
}
