import type { Prisma } from "@prisma/client";

/**
 * Журнал аудита действий кабинета.
 *
 * Запись добавляется в ТОЙ ЖЕ транзакции, что и само изменение, — иначе
 * журнал может разойтись с данными (изменение сохранилось, аудит потерялся,
 * или наоборот). Поэтому `auditEntry()` возвращает объект для `tx.auditLog.create`,
 * а не выполняет запись сам.
 */

export type AuditActor = { id: string; name: string; role: string };

/** Готовые коды действий — единый словарь, чтобы журнал было удобно фильтровать. */
export const AUDIT = {
  requestCreated: "request.created",
  requestStatusChanged: "request.status_changed",
  requestCancelled: "request.cancelled",
} as const;

/**
 * Подготовить запись аудита для вставки в транзакцию.
 * `metadata` сериализуется в JSON-строку (в SQLite нет jsonb-типа).
 */
export function auditEntry(
  actor: AuditActor,
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
): Prisma.AuditLogCreateInput {
  return {
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityId,
    metadata: JSON.stringify(metadata),
  };
}
