import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Выпуск электронного студенческого. Токен создаётся один раз и дальше
 * не меняется: QR на телефоне остаётся действительным весь учебный год.
 */

export function newCardToken(): string {
  return randomBytes(16).toString("hex");
}

export async function ensureStudentCardToken(profileId: string): Promise<string> {
  const profile = await db.studentProfile.findUnique({
    where: { id: profileId },
    select: { cardToken: true },
  });
  if (profile?.cardToken) return profile.cardToken;

  // Коллизия 128-битного случайного токена практически невозможна, но
  // повторяем попытку, чтобы не отдавать пользователю ошибку уникальности.
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = newCardToken();
    try {
      await db.studentProfile.update({
        where: { id: profileId },
        data: { cardToken: token, cardIssuedAt: new Date() },
      });
      return token;
    } catch {
      // пробуем ещё раз
    }
  }
  throw new Error("Не удалось выпустить электронный студенческий");
}
