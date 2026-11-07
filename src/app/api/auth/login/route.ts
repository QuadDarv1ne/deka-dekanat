import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'

// Простая защита от перебора: не более 10 попыток за минуту с одного IP
const attempts = new Map<string, { count: number; resetAt: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const a = attempts.get(ip)
  if (!a || a.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60000 })
    return false
  }
  a.count += 1
  return a.count > 10
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (rateLimited(ip)) {
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
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
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
