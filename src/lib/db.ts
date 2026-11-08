import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Единственный экземпляр PrismaClient на процесс.
 *
 * Самодостаточное вычисление DATABASE_URL: в среде деплоя может не быть ни
 * .env (он gitignored), ни переменных окружения (если сервер запустили напрямую,
 * node .next/standalone/server.js — Next 16 не запекает env в standalone-конфиг).
 * Тогда поднимаемся от текущего каталога вверх, пока не найдём корень проекта
 * (prisma/schema.prisma), и берём db/custom.db оттуда. В standalone-режиме cwd
 * — это .next/standalone, поэтому подъём вверх обязателен.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  let dir = process.cwd()
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, 'prisma', 'schema.prisma'))) {
      return `file:${path.join(dir, 'db', 'custom.db')}`
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return `file:${path.join(process.cwd(), 'db', 'custom.db')}`
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolveDatabaseUrl()
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Логирование SQL. По умолчанию пишем только ошибки: подробный лог каждого
 * запроса полезен при отладке, но в продакшене это лишний шум в stdout и
 * заметная нагрузка на горячих маршрутах. Включается PRISMA_LOG_QUERIES=1.
 */
const prismaLog: Prisma.LogLevel[] =
  process.env.PRISMA_LOG_QUERIES === '1' ? ['query', 'info', 'warn', 'error'] : ['error']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLog,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
