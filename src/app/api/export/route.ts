import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/api-helpers";
import { mskNow } from "@/lib/time";

/**
 * Экспорт личных данных студента одним JSON-файлом.
 * Принцип децентрализации: данные принадлежат студенту, а не системе —
 * он в любой момент может их забрать и унести с собой (data portability).
 * Доступ только по своей сессии: чужой профиль выгрузить нельзя.
 */
export async function GET() {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { student: true },
  });
  if (!user?.student) {
    return NextResponse.json({ error: "Профиль студента не найден" }, { status: 404 });
  }

  const group = user.student.groupName;
  const [grades, exams, requests, notifications, assistantMessages, slots, changes] = await Promise.all([
    db.grade.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    db.examItem.findMany({ where: { groupName: group }, orderBy: { date: "asc" } }),
    db.serviceRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { history: { orderBy: { createdAt: "asc" } } },
    }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.assistantMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    db.scheduleSlot.findMany({ where: { groupName: group }, orderBy: [{ weekday: "asc" }, { startMin: "asc" }] }),
    db.scheduleChange.findMany({ where: { groupName: group }, orderBy: { date: "asc" } }),
  ]);

  const payload = {
    format: "deka-personal-data",
    version: 1,
    exportedAt: new Date().toISOString(),
    notice:
      "Выгрузка личных данных из кабинета \"Дека\". Все записи вымышленные (прототип для конкурса), реальные персональные данные отсутствуют.",
    profile: {
      name: user.name,
      login: user.login,
      faculty: user.student.faculty,
      program: user.student.program,
      course: user.student.course,
      groupName: group,
      studyForm: user.student.studyForm,
      recordBook: user.student.recordBook,
      entryYear: user.student.entryYear,
      status: user.student.status,
      curatorName: user.student.curatorName,
    },
    grades: grades.map((g) => ({
      subject: g.subjectName,
      teacher: g.teacherName,
      kind: g.kind,
      title: g.title,
      score: g.score,
      maxScore: g.maxScore,
      mark: g.mark,
      weight: g.weight,
      date: g.date,
    })),
    exams: exams.map((e) => ({
      subject: e.subjectName,
      kind: e.kind,
      date: e.date,
      startMin: e.startMin,
      room: e.room,
      teacher: e.teacherName,
    })),
    schedule: slots.map((s) => ({
      weekday: s.weekday,
      startMin: s.startMin,
      endMin: s.endMin,
      subject: s.subjectName,
      kind: s.kind,
      room: s.room,
      building: s.building,
      teacher: s.teacherName,
    })),
    scheduleChanges: changes.map((c) => ({
      date: c.date,
      kind: c.kind,
      subject: c.subject,
      message: c.message,
      author: c.authorName,
    })),
    requests: requests.map((r) => ({
      number: r.number,
      type: r.typeTitle,
      status: r.status,
      comment: r.comment,
      staffComment: r.staffComment,
      createdAt: r.createdAt,
      readyAt: r.readyAt,
      history: r.history.map((ev) => ({ status: ev.status, comment: ev.comment, author: ev.authorName, at: ev.createdAt })),
    })),
    notifications: notifications.map((n) => ({
      kind: n.kind,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      createdAt: n.createdAt,
    })),
    assistantMessages: assistantMessages.map((m) => ({ role: m.role, content: m.content, at: m.createdAt })),
  };

  const todayIso = mskNow().date;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="deka-my-data-${todayIso}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
