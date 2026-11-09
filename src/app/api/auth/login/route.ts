import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
import { ensureStudentCardToken } from '@/lib/student-card-server'

// Простая защита от перебора: не более 10 НЕУДАЧНЫХ попыток за минуту с одного IP.
// Успешный вход сбрасывает счётчик, поэтому обычная работа не блокируется.
const FAILURE_WINDOW_MS = 60_000
const MAX_FAILURES = 10
const attempts = new Map<string, { count: number; resetAt: number }>()
let nextCleanupAt = 0

function cleanupExpired(now: number) {
  if (now < nextCleanupAt) return
  nextCleanupAt = now + FAILURE_WINDOW_MS
  for (const [ip, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(ip)
  }
}

function isRateLimited(ip: string, now: number): boolean {
  cleanupExpired(now)
  const entry = attempts.get(ip)
  return Boolean(entry && entry.resetAt > now && entry.count >= MAX_FAILURES)
}

function recordFailure(ip: string, now: number) {
  const entry = attempts.get(ip)
  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + FAILURE_WINDOW_MS })
  } else {
    entry.count += 1
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (isRateLimited(ip, Date.now())) {
    return NextResponse.json({ error: 'Слишком много попыток. Подождите минуту.' }, { status: 429 })
  }

  let body: { login?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const login = String(body.login ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  if (!login || !password) {
    return NextResponse.json({ error: 'Введите логин и пароль' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { login } })
  // Проверяем хеш даже если пользователя нет — чтобы не раскрывать перебором наличие логина
  const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash)
  if (!user || !ok) {
    recordFailure(ip, Date.now())
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  // успешный вход не должен расходовать лимит попыток
  attempts.delete(ip)

  // Электронный студенческий выпускается при входе: QR в профиле готов сразу,
  // даже если студент открыл кабинет на новом устройстве.
  if (user.role === 'STUDENT') {
    const profile = await db.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (profile) {
      try {
        await ensureStudentCardToken(profile.id)
      } catch {
        // выпуск карточки не должен блокировать вход
      }
    }
  }

  await setSessionCookie({
    uid: user.id,
    login: user.login,
    role: user.role === 'STAFF' ? 'STAFF' : 'STUDENT',
    name: user.name,
  })

  return NextResponse.json({
    ok: true,
    role: user.role,
    name: user.name,
    redirect: user.role === 'STAFF' ? '/staff' : '/dashboard',
  })
}
