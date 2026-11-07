import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";

/** Единые помощники для API-роутов: ошибки, проверка сессии и роли. */

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireStudent(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; res: NextResponse }
> {
  const session = await getSession();
  if (!session) return { ok: false, res: jsonError("Требуется вход", 401) };
  if (session.role !== "STUDENT") {
    return { ok: false, res: jsonError("Раздел доступен только студентам", 403) };
  }
  return { ok: true, session };
}

export async function requireStaff(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; res: NextResponse }
> {
  const session = await getSession();
  if (!session) return { ok: false, res: jsonError("Требуется вход", 401) };
  if (session.role !== "STAFF") {
    return { ok: false, res: jsonError("Раздел доступен только сотрудникам деканата", 403) };
  }
  return { ok: true, session };
}

/** Видимые студенту объявления: для всех или для его группы/факультета. */
export function announcementVisible(
  announcement: { audience: string },
  student: { groupName: string; faculty: string } | null
): boolean {
  if (announcement.audience === "ALL") return true;
  if (!student) return false;
  if (announcement.audience.startsWith("GROUP:")) {
    return announcement.audience.slice(6) === student.groupName;
  }
  if (announcement.audience.startsWith("FACULTY:")) {
    return announcement.audience.slice(8) === student.faculty;
  }
  return false;
}

/** Человекопонятная часть суток для приветствия. */
export function greetingFor(minutesOfDay: number): string {
  if (minutesOfDay < 5 * 60) return "Доброй ночи";
  if (minutesOfDay < 12 * 60) return "Доброе утро";
  if (minutesOfDay < 17 * 60) return "Добрый день";
  return "Добрый вечер";
}
