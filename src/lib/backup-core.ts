import type { Prisma } from "@prisma/client";

/**
 * Общее ядро полного бэкапа/восстановления "Дека" (формат deka-backup).
 *
 * Используется двумя способами восстановления:
 *  - POST /api/restore — из кабинета деканата (приложение работает);
 *  - scripts/restore-cli.ts (`npm run db:restore`) — из командной строки,
 *    когда приложение не поднимается (после сбоя, перед откатом версии).
 *
 * Принцип децентрализации: инсталляция "Дека" взаимозаменяема — перенос
 * на любую другую машину = поднять приложение + восстановить файл копии.
 */

export type BackupRow = Record<string, unknown>;

/** Порядок таблиц: удаление — дети первыми, создание — родители первыми. */
export const BACKUP_DATE_KEYS: Record<string, string[]> = {
  users: ["createdAt", "updatedAt"],
  studentProfiles: [],
  requestTypes: [],
  scheduleSlots: [],
  scheduleChanges: ["createdAt"],
  grades: ["date"],
  examItems: [],
  announcements: ["deadline", "createdAt"],
  serviceRequests: ["dueDate", "readyAt", "createdAt", "updatedAt"],
  requestEvents: ["createdAt"],
  notifications: ["readAt", "createdAt"],
  assistantMessages: ["createdAt"],
};

/** ISO-строки из JSON → объекты Date там, где в схеме DateTime. */
export function withDates(row: BackupRow, keys: string[]): BackupRow {
  const out: BackupRow = { ...row };
  for (const k of keys) {
    if (typeof out[k] === "string") out[k] = new Date(out[k] as string);
  }
  return out;
}

/**
 * Проверка файла копии ДО транзакции. Возвращает текст ошибки или null,
 * если структура и связи целы — транзакция не должна рваться на середине.
 */
export function validateBackupData(d: Record<string, unknown>): string | null {
  for (const table of Object.keys(BACKUP_DATE_KEYS)) {
    if (!Array.isArray(d[table])) {
      return `В файле нет таблицы ${table} — файл повреждён или усечён`;
    }
    const rows = d[table] as BackupRow[];
    if (rows.some((r) => !r || typeof r !== "object" || typeof r.id !== "string" || !r.id)) {
      return `В таблице ${table} есть строки без id — файл повреждён`;
    }
  }

  const users = d.users as BackupRow[];
  if (users.length === 0) {
    return "В копии нет ни одного пользователя — восстановление отклонено";
  }

  const userIds = new Set(users.map((r) => r.id as string));
  const requestIds = new Set((d.serviceRequests as BackupRow[]).map((r) => r.id as string));

  for (const p of d.studentProfiles as BackupRow[]) {
    if (!userIds.has(p.userId as string)) return `профиль студента ${p.id} ссылается на несуществующего пользователя`;
  }
  for (const g of d.grades as BackupRow[]) {
    if (!userIds.has(g.userId as string)) return `оценка ${g.id} ссылается на несуществующего пользователя`;
  }
  for (const r of d.serviceRequests as BackupRow[]) {
    if (!userIds.has(r.userId as string)) return `заявка ${r.number} ссылается на несуществующего пользователя`;
  }
  for (const e of d.requestEvents as BackupRow[]) {
    if (!requestIds.has(e.requestId as string)) return `событие ${e.id} ссылается на несуществующую заявку`;
  }
  for (const n of d.notifications as BackupRow[]) {
    if (!userIds.has(n.userId as string)) return `уведомление ${n.id} ссылается на несуществующего пользователя`;
  }
  for (const m of d.assistantMessages as BackupRow[]) {
    if (!userIds.has(m.userId as string)) return `сообщение ассистента ${m.id} ссылается на несуществующего пользователя`;
  }
  return null;
}

/** Короткая сводка по таблицам копии — для подтверждения перед заменой. */
export function backupCounts(d: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const table of Object.keys(BACKUP_DATE_KEYS)) {
    out[table] = Array.isArray(d[table]) ? (d[table] as BackupRow[]).length : 0;
  }
  return out;
}

/**
 * Полная замена содержимого базы содержимым копии внутри транзакции.
 * Перед вызовом файл должен пройти validateBackupData.
 */
export async function restoreBackupInto(
  tx: Prisma.TransactionClient,
  d: Record<string, unknown>
): Promise<Record<string, number>> {
  const row = (table: string) => (d[table] as BackupRow[]).map((r) => withDates(r, BACKUP_DATE_KEYS[table]));

  // 1) Полная очистка (порядок важен из-за связей — как в scripts/seed.ts)
  await tx.assistantMessage.deleteMany();
  await tx.notification.deleteMany();
  await tx.requestEvent.deleteMany();
  await tx.serviceRequest.deleteMany();
  await tx.requestType.deleteMany();
  await tx.grade.deleteMany();
  await tx.examItem.deleteMany();
  await tx.scheduleChange.deleteMany();
  await tx.scheduleSlot.deleteMany();
  await tx.announcement.deleteMany();
  await tx.studentProfile.deleteMany();
  await tx.user.deleteMany();

  // 2) Создание заново — родители первыми, id и даты сохраняются как в копии
  await tx.user.createMany({ data: row("users") as any });
  if ((d.studentProfiles as BackupRow[]).length)
    await tx.studentProfile.createMany({ data: row("studentProfiles") as any });
  if ((d.requestTypes as BackupRow[]).length)
    await tx.requestType.createMany({ data: row("requestTypes") as any });
  if ((d.scheduleSlots as BackupRow[]).length)
    await tx.scheduleSlot.createMany({ data: row("scheduleSlots") as any });
  if ((d.scheduleChanges as BackupRow[]).length)
    await tx.scheduleChange.createMany({ data: row("scheduleChanges") as any });
  if ((d.grades as BackupRow[]).length) await tx.grade.createMany({ data: row("grades") as any });
  if ((d.examItems as BackupRow[]).length) await tx.examItem.createMany({ data: row("examItems") as any });
  if ((d.announcements as BackupRow[]).length)
    await tx.announcement.createMany({ data: row("announcements") as any });
  if ((d.serviceRequests as BackupRow[]).length)
    await tx.serviceRequest.createMany({ data: row("serviceRequests") as any });
  if ((d.requestEvents as BackupRow[]).length)
    await tx.requestEvent.createMany({ data: row("requestEvents") as any });
  if ((d.notifications as BackupRow[]).length)
    await tx.notification.createMany({ data: row("notifications") as any });
  if ((d.assistantMessages as BackupRow[]).length)
    await tx.assistantMessage.createMany({ data: row("assistantMessages") as any });

  return backupCounts(d);
}
