import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-helpers";
import { auditEntry, AUDIT } from "@/lib/audit";
import { normalizeCardToken } from "@/lib/student-card";

/**
 * Проверка электронного студенческого сотрудником.
 * Токен берётся из QR-ссылки или вводится вручную; в журнал пишется факт
 * проверки, но не сам токен.
 */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const token = normalizeCardToken(String(body.code ?? ""));
  if (!token) {
    return NextResponse.json({ error: "Вставьте ссылку из QR-кода или 32-символьный код" }, { status: 400 });
  }

  const profile = await db.studentProfile.findUnique({
    where: { cardToken: token },
    include: { user: { select: { name: true, login: true, role: true } } },
  });
  if (!profile || profile.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Студенческий не найден" }, { status: 404 });
  }

  await db.auditLog.create({
    data: auditEntry(
      { id: auth.session.uid, name: auth.session.name, role: auth.session.role },
      AUDIT.studentCardVerify,
      profile.id,
      { groupName: profile.groupName, faculty: profile.faculty }
    ),
  });

  return NextResponse.json({
    student: {
      name: profile.user.name,
      login: profile.user.login,
      faculty: profile.faculty,
      program: profile.program,
      course: profile.course,
      groupName: profile.groupName,
      recordBook: profile.recordBook,
      studyForm: profile.studyForm,
      status: profile.status,
      entryYear: profile.entryYear,
      curatorName: profile.curatorName,
      cardIssuedAt: profile.cardIssuedAt,
    },
    verifiedBy: auth.session.name,
  });
}
