import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-helpers";
import { mskNow } from "@/lib/time";

/**
 * Полная резервная копия базы прототипа "Дека" одним JSON-файлом.
 *
 * Принцип децентрализации: институт владеет своими данными целиком —
 * деканат в любой момент скачивает всё (пользователи, расписание, заявки,
 * история статусов, объявления) и переносит на другой сервер восстановлением
 * через /api/restore. Зависимость от конкретной инсталляции отсутствует.
 *
 * Доступ: только сотрудники деканата (студент получает 403).
 * Пароли в копии присутствуют только в виде bcrypt-хешей.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  const [users, studentProfiles, requestTypes, scheduleSlots, scheduleChanges, grades, examItems, announcements, serviceRequests, requestEvents, notifications, assistantMessages] =
    await Promise.all([
      db.user.findMany({ orderBy: { createdAt: "asc" } }),
      db.studentProfile.findMany(),
      db.requestType.findMany({ orderBy: { sortOrder: "asc" } }),
      db.scheduleSlot.findMany({ orderBy: [{ groupName: "asc" }, { weekday: "asc" }, { startMin: "asc" }] }),
      db.scheduleChange.findMany({ orderBy: { date: "asc" } }),
      db.grade.findMany({ orderBy: { date: "asc" } }),
      db.examItem.findMany({ orderBy: { date: "asc" } }),
      db.announcement.findMany({ orderBy: { createdAt: "asc" } }),
      db.serviceRequest.findMany({ orderBy: { createdAt: "asc" } }),
      db.requestEvent.findMany({ orderBy: { createdAt: "asc" } }),
      db.notification.findMany({ orderBy: { createdAt: "asc" } }),
      db.assistantMessage.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

  const counts = {
    users: users.length,
    studentProfiles: studentProfiles.length,
    requestTypes: requestTypes.length,
    scheduleSlots: scheduleSlots.length,
    scheduleChanges: scheduleChanges.length,
    grades: grades.length,
    examItems: examItems.length,
    announcements: announcements.length,
    serviceRequests: serviceRequests.length,
    requestEvents: requestEvents.length,
    notifications: notifications.length,
    assistantMessages: assistantMessages.length,
  };

  const payload = {
    format: "deka-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    counts,
    notice:
      "Полная резервная копия базы прототипа \"Дека\". Все записи вымышленные (прототип для конкурса). " +
      "Пароли хранятся только в виде bcrypt-хешей. Восстановление: POST /api/restore (кабинет деканата → Профиль → \"Восстановить из файла\").",
    data: {
      users,
      studentProfiles,
      requestTypes,
      scheduleSlots,
      scheduleChanges,
      grades,
      examItems,
      announcements,
      serviceRequests,
      requestEvents,
      notifications,
      assistantMessages,
    },
  };

  const todayIso = mskNow().date;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="deka-backup-${todayIso}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
