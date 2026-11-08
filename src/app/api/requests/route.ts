import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/api-helpers";
import { mskNow } from "@/lib/time";
import { canTransition } from "@/lib/request-policy";
import { auditEntry, AUDIT } from "@/lib/audit";

/** Заявки студента: список типов и своих заявок (GET), подача новой (POST). */

export async function GET() {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  const [types, requests, student] = await Promise.all([
    db.requestType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.serviceRequest.findMany({
      where: { userId: session.uid },
      orderBy: { createdAt: "desc" },
      include: { history: { orderBy: { createdAt: "asc" } } },
    }),
    db.studentProfile.findUnique({ where: { userId: session.uid } }),
  ]);

  // Данные для печатной версии справки (только свои — изоляция по session.uid)
  const profile = student
    ? {
        fullName: session.name,
        faculty: student.faculty,
        program: student.program,
        course: student.course,
        groupName: student.groupName,
        recordBook: student.recordBook,
        studyForm: student.studyForm,
        status: student.status,
      }
    : null;

  return NextResponse.json({
    profile,
    types,
    requests: requests.map((r) => ({
      id: r.id,
      number: r.number,
      typeCode: r.typeCode,
      typeTitle: r.typeTitle,
      status: r.status,
      version: r.version,
      comment: r.comment,
      staffComment: r.staffComment,
      dueDate: r.dueDate,
      readyAt: r.readyAt,
      docCode: r.docCode,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      history: r.history.map((h) => ({
        id: h.id,
        status: h.status,
        comment: h.comment,
        authorName: h.authorName,
        createdAt: h.createdAt,
      })),
    })),
  });
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[randomInt(alphabet.length)];
  return s;
}

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  let body: { typeCode?: string; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const typeCode = String(body.typeCode ?? "").trim();
  const comment = String(body.comment ?? "").trim().slice(0, 500);
  if (!typeCode) return NextResponse.json({ error: "Выберите тип заявки" }, { status: 400 });

  const type = await db.requestType.findFirst({ where: { code: typeCode, isActive: true } });
  if (!type) return NextResponse.json({ error: "Такой тип заявки не найден" }, { status: 404 });

  if (type.needsComment && comment.length < 5) {
    return NextResponse.json(
      { error: "Для этого заявления нужно описать подробности (минимум 5 символов)" },
      { status: 400 }
    );
  }

  // номер заявки: СП-2026-XXXX (справки) / ЗВ-2026-XXXX (заявления)
  const { date: todayIso } = mskNow();
  const year = todayIso.slice(0, 4);
  const prefix = type.code.startsWith("SPR") ? "СП" : "ЗВ";

  let number = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${prefix}-${year}-${randomCode()}`;
    const exists = await db.serviceRequest.findUnique({ where: { number: candidate } });
    if (!exists) {
      number = candidate;
      break;
    }
  }
  if (!number) return NextResponse.json({ error: "Не удалось сформировать номер заявки, попробуйте ещё раз" }, { status: 500 });

  const dueDate = new Date(Date.now() + Math.max(1, type.processingDays) * 86400000);

  const created = await db.$transaction(async (tx) => {
    const req = await tx.serviceRequest.create({
      data: {
        number,
        userId: session.uid,
        typeCode: type.code,
        typeTitle: type.title,
        status: "NEW",
        comment: comment || null,
        dueDate,
        history: {
          create: { status: "NEW", authorName: session.name, comment: comment || null },
        },
      },
      include: { history: true },
    });
    // аудит в той же транзакции, что и создание заявки
    await tx.auditLog.create({
      data: auditEntry(
        { id: session.uid, name: session.name, role: session.role },
        AUDIT.requestCreated,
        req.id,
        { number: req.number, typeCode: type.code }
      ),
    });
    return req;
  });

  return NextResponse.json({
    ok: true,
    request: {
      id: created.id,
      number: created.number,
      typeTitle: created.typeTitle,
      status: created.status,
      createdAt: created.createdAt,
      dueDate: created.dueDate,
      history: created.history,
    },
  });
}

/**
 * Отмена заявки студентом.
 * Правило перехода вынесено в общую политику (src/lib/request-policy.ts):
 * студент может отменить только свою неготовую заявку (NEW/IN_PROGRESS).
 * Изоляция: ищем заявку строго по id И userId.
 * Оптимистичная блокировка: если заявку успели изменить параллельно,
 * условное обновление по version не сработает и вернём 409.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Не указана заявка" }, { status: 400 });

  const request = await db.serviceRequest.findFirst({ where: { id, userId: session.uid } });
  if (!request) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });

  if (!canTransition(session.role, request.status, "CANCELLED")) {
    return NextResponse.json(
      { error: "Отменить можно только заявку, которая ещё не готова — напишите в деканат, если нужна помощь" },
      { status: 400 }
    );
  }

  const result = await db.$transaction(async (tx) => {
    // compare-and-swap по version: если заявку изменили параллельно, count = 0
    const swapped = await tx.serviceRequest.updateMany({
      where: { id: request.id, version: request.version, status: request.status },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    if (swapped.count === 0) return null;

    await tx.requestEvent.create({
      data: { requestId: request.id, status: "CANCELLED", authorName: session.name, comment: "Заявка отменена студентом" },
    });
    await tx.auditLog.create({
      data: auditEntry(
        { id: session.uid, name: session.name, role: session.role },
        AUDIT.requestCancelled,
        request.id,
        { number: request.number, from: request.status }
      ),
    });
    return tx.serviceRequest.findUnique({
      where: { id: request.id },
      include: { history: { orderBy: { createdAt: "asc" } } },
    });
  });

  if (!result) {
    return NextResponse.json(
      { error: "Заявка уже изменилась — обновите страницу и попробуйте снова" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    request: {
      id: result.id,
      number: result.number,
      status: result.status,
      history: result.history.map((h) => ({
        id: h.id,
        status: h.status,
        comment: h.comment,
        authorName: h.authorName,
        createdAt: h.createdAt,
      })),
    },
  });
}
