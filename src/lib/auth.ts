import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'

/**
 * Аутентификация прототипа:
 * — пароли хранятся только как bcrypt-хеш;
 * — сессия — JWT (HS256) в httpOnly-cookie, к JS браузера недоступен;
 * — секрет подписи берётся из AUTH_SECRET (.env / окружение Docker);
 *    если он не задан (например, после холодного старта dev-песочницы),
 *    секрет автоматически создаётся в db/auth-secret.txt (не в git).
 */

export const SESSION_COOKIE = 'deka_session'
const SESSION_DAYS = 7

/** Fallback-секрет: читаем db/auth-secret.txt, при отсутствии — создаём случайный. */
let cachedFallbackSecret: string | null = null
function fileFallbackSecret(): string {
  // Кэш в памяти процесса: файл читается один раз, а не на каждый запрос
  // (secretKey вызывается при каждой проверке сессии).
  if (cachedFallbackSecret) return cachedFallbackSecret
  try {
    const file = path.join(process.cwd(), 'db', 'auth-secret.txt')
    if (fs.existsSync(file)) {
      const s = fs.readFileSync(file, 'utf8').trim()
      if (s.length >= 32) {
        cachedFallbackSecret = s
        return s
      }
    }
    const generated = randomBytes(32).toString('hex')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, generated, { mode: 0o600 })
    cachedFallbackSecret = generated
    return generated
  } catch {
    return ''
  }
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || fileFallbackSecret()
  if (!secret) throw new Error('AUTH_SECRET недоступен — задайте его в .env.local или окружении')
  return new TextEncoder().encode(secret)
}

export type SessionPayload = {
  uid: string
  login: string
  role: 'STUDENT' | 'STAFF'
  name: string
}

export async function createSessionToken(p: SessionPayload): Promise<string> {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (typeof payload.uid !== 'string' || typeof payload.role !== 'string') return null
    return {
      uid: payload.uid,
      login: String(payload.login ?? ''),
      role: payload.role as 'STUDENT' | 'STAFF',
      name: String(payload.name ?? ''),
    }
  } catch {
    return null
  }
}

export async function setSessionCookie(p: SessionPayload) {
  const token = await createSessionToken(p)
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 3600,
  })
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}

/** Текущая сессия (или null). Используется в серверных компонентах и API. */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

/** Требуется сессия — иначе 401 (для API-роутов). */
export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession()
  if (!s) throw new UnauthorizedError()
  return s
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Требуется вход')
  }
}

/** Полные данные пользователя из БД (для проверки, что учётка ещё жива). */
export async function loadUser(uid: string) {
  return db.user.findUnique({
    where: { id: uid },
    include: { student: true },
  })
}
