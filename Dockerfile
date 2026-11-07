# ─────────────────────────────────────────────────────────────────────
# "Дека" — цифровой деканат (концепт). Продакшен-образ: Next.js standalone.
# Сборка: docker build -t deka .
# Запуск: см. docker-compose.yml
# ─────────────────────────────────────────────────────────────────────

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL нужен на этапе сборки только для генерации Prisma-клиента
ENV DATABASE_URL="file:../db/custom.db"
RUN bunx prisma generate && bun run build

FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# непривилегированный пользователь
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts/seed.ts ./scripts/seed.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/package.json ./package.json

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# при старте: применяем схему, наполняем базу демо-данными (идемпотентно), запускаем сервер
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss; bun scripts/seed.ts || true; exec bun server.js"]
