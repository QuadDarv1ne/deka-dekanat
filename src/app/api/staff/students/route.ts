import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-helpers";

/** Список студентов для деканата: профиль + успеваемость + активные заявки. */
export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  const profiles = await db.studentProfile.findMany({
    include: { user: { select: { id: true, name: true, login: true, avatarColor: true } } },
    orderBy: [{ groupName: "asc" }, { course: "desc" }, { user: { name: "asc" } }],
  });

  const gradeAgg = await db.grade.groupBy({
    by: ["userId"],
    _count: { _all: true },
    where: { mark: { not: null } },
  });

  const requestAgg = await db.serviceRequest.groupBy({
    by: ["userId"],
    _count: { _all: true },
    where: { status: { in: ["NEW", "IN_PROGRESS"] } },
  });

  const gradeMap = new Map(gradeAgg.map((g) => [g.userId, g._count._all]));
  const reqMap = new Map(requestAgg.map((r) => [r.userId, r._count._all]));

  return NextResponse.json({
    students: profiles.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      login: p.user.login,
      avatarColor: p.user.avatarColor,
      faculty: p.faculty,
      program: p.program,
      course: p.course,
      groupName: p.groupName,
      recordBook: p.recordBook,
      studyForm: p.studyForm,
      status: p.status,
      marksCount: gradeMap.get(p.userId) ?? 0,
      activeRequests: reqMap.get(p.userId) ?? 0,
    })),
  });
}
