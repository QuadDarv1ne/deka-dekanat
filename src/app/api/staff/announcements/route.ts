import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-helpers";
import { mskMoment } from "@/lib/time";

/**
 * Объявления деканата: список (GET) и публикация (POST).
 * При публикации создаются персональные уведомления всем адресатам.
 */

const CATEGORIES = ["ОБЩЕЕ", "СЕССИЯ", "СТИПЕНДИЯ", "МЕРОПРИЯТИЕ", "РАСПИСАНИЕ"];

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  const [announcements, groups] = await Promise.all([
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.studentProfile.findMany({ select: { groupName: true }, distinct: ["groupName"], orderBy: { groupName: "asc" } }),
  ]);

  return NextResponse.json({ announcements, groups: groups.map((g) => g.groupName), categories: CATEGORIES });
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  let body: {
    title?: string;
    body?: string;
    category?: string;
    audience?: string;
    pinned?: boolean;
    deadline?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim().slice(0, 120);
  const text = String(body.body ?? "").trim().slice(0, 2000);
  const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "ОБЩЕЕ";
  const pinned = Boolean(body.pinned);
  // дедлайн — конец указанного дня по московскому времени (23:59 МСК), а не по UTC
  const deadline = body.deadline ? mskMoment(String(body.deadline).slice(0, 10), 23 * 60 + 59) : null;

  let audience = "ALL";
  if (typeof body.audience === "string" && body.audience.startsWith("GROUP:")) {
    audience = `GROUP:${body.audience.slice(6).trim()}`;
  }

  if (title.length < 5) return NextResponse.json({ error: "Заголовок: минимум 5 символов" }, { status: 400 });
  if (text.length < 10) return NextResponse.json({ error: "Текст объявления: минимум 10 символов" }, { status: 400 });
  if (deadline && Number.isNaN(deadline.getTime())) {
    return NextResponse.json({ error: "Некорректная дата дедлайна" }, { status: 400 });
  }

  // адресаты: ALL — все студенты, GROUP:<группа> — студенты конкретной группы
  let recipientIds: string[] = [];
  if (audience === "ALL") {
    const students = await db.user.findMany({ where: { role: "STUDENT" }, select: { id: true } });
    recipientIds = students.map((s) => s.id);
  } else {
    const group = audience.slice(6);
    const profiles = await db.studentProfile.findMany({ where: { groupName: group }, select: { userId: true } });
    recipientIds = profiles.map((p) => p.userId);
  }

  const created = await db.announcement.create({
    data: { title, body: text, category, audience, pinned, deadline, authorName: session.name },
  });

  if (recipientIds.length) {
    await db.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        kind: "ANNOUNCEMENT",
        title: pinned ? `Важно: ${title}` : `Новое объявление: ${title}`,
        body: text.slice(0, 180),
      })),
    });
  }

  return NextResponse.json({ ok: true, announcement: created, notified: recipientIds.length });
}
