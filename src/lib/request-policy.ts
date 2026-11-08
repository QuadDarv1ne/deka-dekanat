/**
 * Единая политика переходов статусов заявки.
 *
 * Одна чистая функция используется и на сервере (проверка перехода перед
 * записью), и на клиенте (какие кнопки показать сотруднику). Благодаря
 * этому интерфейс не может предложить действие, которое сервер отклонит,
 * а правила описаны в одном месте.
 */

export type RequestStatus = "NEW" | "IN_PROGRESS" | "READY" | "DONE" | "REJECTED" | "CANCELLED";

/** Статусы, из которых заявку уже нельзя перевести никуда. */
export const TERMINAL_STATUSES: RequestStatus[] = ["DONE", "REJECTED", "CANCELLED"];

/** Допустимые переходы для сотрудника деканата. */
const STAFF_TRANSITIONS: Record<string, RequestStatus[]> = {
  NEW: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["READY", "REJECTED"],
  READY: ["DONE", "REJECTED"],
};

/** Допустимые переходы для студента (только отмена своей неготовой заявки). */
const STUDENT_TRANSITIONS: Record<string, RequestStatus[]> = {
  NEW: ["CANCELLED"],
  IN_PROGRESS: ["CANCELLED"],
};

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.includes(status as RequestStatus);
}

/**
 * Можно ли перевести заявку из `from` в `to` в роли `role`.
 * role: "STAFF" | "STUDENT" (неизвестные роли не могут ничего).
 */
export function canTransition(role: string, from: string, to: string): boolean {
  if (isTerminal(from)) return false;
  const table = role === "STUDENT" ? STUDENT_TRANSITIONS : role === "STAFF" ? STAFF_TRANSITIONS : {};
  return (table[from] ?? []).includes(to as RequestStatus);
}

/** Список статусов, доступных роли из текущего состояния (для UI). */
export function allowedTransitions(role: string, from: string): RequestStatus[] {
  if (isTerminal(from)) return [];
  const table = role === "STUDENT" ? STUDENT_TRANSITIONS : role === "STAFF" ? STAFF_TRANSITIONS : {};
  return table[from] ?? [];
}
