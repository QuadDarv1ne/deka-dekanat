import type { NextConfig } from "next";
import path from "node:path";
import os from "node:os";

// Путь к базе вычисляется при СБОРКЕ и запекается в конфиг (env): тогда
// standalone-сервер работает в среде деплоя даже при запуске напрямую
// (node .next/standalone/server.js) — без .env и переменных окружения.
// Каталог сборки совпадает с каталогом запуска, поэтому путь всегда верный.
// Явно заданный DATABASE_URL (docker-compose, лаунчер start-prod.mjs) имеет приоритет.
const resolvedDbUrl =
  process.env.DATABASE_URL || `file:${path.join(process.cwd(), "db", "custom.db")}`;

// Автоматически добавляем все локальные IP-адреса в allowedDevOrigins.
// Без этого при открытии через LAN (например 192.168.x.x) Next.js блокирует
// dev-ресурсы (чанки JS, шрифты) — страница остаётся белой.
function getLocalIps(): string[] {
  const ifaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const _name of Object.keys(ifaces)) {
    const ifc = ifaces[_name as keyof typeof ifaces]!;
    for (const info of ifc) {
      if (!info.internal) ips.push(info.address);
    }
  }
  return ips;
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: { DATABASE_URL: resolvedDbUrl },
  /* config options here */
  allowedDevOrigins: ["127.0.0.1", "localhost", ...getLocalIps()],
  reactStrictMode: false,
  // убираем плавающий индикатор dev-режима (мешает на скриншотах прототипа)
  devIndicators: false,
  // базовые security-заголовки: защита от кликджекинга, MIME-sniffing и утечки реферера
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // изоляция окна от сторонних документов — защита от cross-window утечек
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // микрофон разрешён своему источнику — иначе не работает голосовой ввод в ИИ-ассистенте
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
        ],
      },
      {
        // Ответы API содержат персональные данные — их нельзя кэшировать ни браузеру,
        // ни промежуточным прокси. Это же дублируется в самих роутах (no-store).
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
