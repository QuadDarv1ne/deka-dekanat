import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";

/** Уведомления пользователя: список (GET) и отметка о прочтении (PATCH). */

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Требуется вход", 401);

  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.uid },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.notification.count({ where: { userId: session.uid, readAt: null } }),
  ]);

  return NextResponse.json({ items, unread });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Требуется вход", 401);

  let body: { ids?: string[]; all?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  if (body.all) {
    await db.notification.updateMany({
      where: { userId: session.uid, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (Array.isArray(body.ids) && body.ids.length) {
    const ids = body.ids.slice(0, 50).filter((x) => typeof x === "string");
    await db.notification.updateMany({
      where: { userId: session.uid, id: { in: ids }, readAt: null },
      data: { readAt: new Date() },
    });
  } else {
    return jsonError("Не переданы ids или all", 400);
  }

  const unread = await db.notification.count({ where: { userId: session.uid, readAt: null } });
  return NextResponse.json({ ok: true, unread });
}
