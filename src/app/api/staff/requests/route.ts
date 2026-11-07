import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-helpers";

/**
 * Очередь заявок для сотрудника деканата.
 * GET — все заявки со студентами; PATCH — смена статуса выбранной заявки.
 * Студент при смене статуса получает уведомление.
 */

const ALLOWED: Record<string, { title: string; notify: (n: string, t: string) => { title: string; body: string } }> = {
  IN_PROGRESS: {
    title: "Заявка в работе",
    notify: (n, t) => ({ title: "Заявка принята в работу", body: `${t} (${n}): деканат приступил к оформлению.` }),
  },
  READY: {
    title: "Справка готова",
    notify: (n, t) => ({ title: "Документ готов к выдаче", body: `${t} (${n}) готов. Заберите в деканате или покажите QR-код из кабинета.` }),
  },
  DONE: {
    title: "Заявка закрыта",
    notify: (n, t) => ({ title: "Документ выдан", body: `${t} (${n}): выдача подтверждена. Хороших дней!` }),
  },
  REJECTED: {
    title: "Заявка отклонена",
    notify: (n, t) => ({ title: "Заявка отклонена", body: `${t} (${n}): деканат отклонил заявку. Причина — в карточке заявки.` }),
  },
};

function randomDocCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `DEKA-${part(4)}-${part(4)}`;
}

export async function GET(req: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const requests = await db.serviceRequest.findMany({
    where: status && status !== "ALL" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { include: { student: true } },
      history: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      number: r.number,
      typeCode: r.typeCode,
      typeTitle: r.typeTitle,
      status: r.status,
      comment: r.comment,
      staffComment: r.staffComment,
      dueDate: r.dueDate,
      createdAt: r.createdAt,
      studentName: r.user.name,
      groupName: r.user.student?.groupName ?? "—",
      faculty: r.user.student?.faculty ?? "—",
      course: r.user.student?.course ?? null,
      lastEvent: r.history[0]
        ? { status: r.history[0].status, comment: r.history[0].comment, authorName: r.history[0].authorName, createdAt: r.history[0].createdAt }
        : null,
    })),
    counts: await (async () => {
      const grouped = await db.serviceRequest.groupBy({ by: ["status"], _count: { _all: true } });
      const out: Record<string, number> = {};
      for (const g of grouped) out[g.status] = g._count._all;
      return out;
    })(),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  let body: { id?: string; status?: string; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  const comment = String(body.comment ?? "").trim().slice(0, 500);

  if (!id) return NextResponse.json({ error: "Не указана заявка" }, { status: 400 });
  const action = ALLOWED[status];
  if (!action) return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });
  if (status === "REJECTED" && comment.length < 3) {
    return NextResponse.json({ error: "При отклонении обязательно укажите причину" }, { status: 400 });
  }

  const request = await db.serviceRequest.findUnique({
    where: { id },
    include: { user: { include: { student: true } } },
  });
  if (!request) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });

  const [updated] = await db.$transaction([
    db.serviceRequest.update({
      where: { id },
      data: {
        status,
        staffComment: comment || request.staffComment,
        readyAt: status === "READY" ? new Date() : request.readyAt,
        docCode: status === "READY" ? request.docCode ?? randomDocCode() : request.docCode,
      },
    }),
    db.requestEvent.create({
      data: { requestId: id, status, comment: comment || null, authorName: session.name },
    }),
    db.notification.create({
      data: {
        userId: request.userId,
        kind: "REQUEST_STATUS",
        ...action.notify(request.number, request.typeTitle),
      },
    }),
  ]);

  return NextResponse.json({ ok: true, request: { id: updated.id, status: updated.status, docCode: updated.docCode } });
}
