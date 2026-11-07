#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# "Дека" — установка на чистый сервер одной командой.
#
# Запуск из корня проекта (Ubuntu/Debian, от обычного пользователя с sudo):
#   bash install.sh                  # приложение (Docker)
#   bash install.sh --with-ollama    # приложение + локальная LLM (Ollama)
#
# Что делает скрипт:
#   1) ставит Docker, если его нет (официальный установщик);
#   2) создаёт .env со случайным AUTH_SECRET (существующий .env не трогает);
#   3) собирает и запускает контейнер (docker compose up -d --build);
#   4) ждёт /api/health и печатает адрес и тестовые аккаунты.
#
# Все данные живут на вашем сервере (том deka-db); ни один внешний SaaS
# не участвует ни в установке, ни в работе.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PORT="${DEKA_PORT:-3000}"
COMPOSE_FILE="docker-compose.yml"
if [[ "${1:-}" == "--with-ollama" ]]; then COMPOSE_FILE="docker-compose.ollama.yml"; fi

say() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

# 0) проверка окружения
[[ -f docker-compose.yml ]] || die "Запустите скрипт из корня проекта \"Дека\" (рядом с docker-compose.yml)"
command -v curl >/dev/null 2>&1 || die "Нужен curl: sudo apt install -y curl"

# 1) Docker
if ! command -v docker >/dev/null 2>&1; then
  say "Docker не найден — устанавливаю (официальный установщик)…"
  curl -fsSL https://get.docker.com | sh
  sudo systemctl enable --now docker
fi
docker compose version >/dev/null 2>&1 || die "Docker Compose не найден — обновите Docker (curl -fsSL https://get.docker.com | sh)"

# 2) .env со случайным секретом (существующий не перезаписываем)
gen_secret() { openssl rand -hex 32 2>/dev/null || od -An -N32 -tx1 /dev/urandom | tr -d ' \n'; }
if [[ ! -f .env ]]; then
  say "Создаю .env со случайным AUTH_SECRET…"
  printf 'AUTH_SECRET=%s\nDATABASE_URL=file:../db/custom.db\n' "$(gen_secret)" > .env
  chmod 600 .env
else
  grep -q '^AUTH_SECRET=' .env || printf 'AUTH_SECRET=%s\n' "$(gen_secret)" >> .env
  grep -q '^DATABASE_URL=' .env || printf 'DATABASE_URL=file:../db/custom.db\n' >> .env
  say ".env уже существует — секрет и настройки сохранены"
fi

# 3) сборка и запуск
say "Собираю и запускаю контейнер (compose: ${COMPOSE_FILE})…"
docker compose -f "$COMPOSE_FILE" up -d --build

# 4) ожидание health
say "Жду /api/health (первая сборка может занять несколько минут)…"
health_ok=""
for _ in $(seq 1 72); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then health_ok=1; break; fi
  sleep 5
done
[[ -n "$health_ok" ]] || die "Приложение не поднялось за 6 минут — логи: docker compose -f ${COMPOSE_FILE} logs --tail 50"

# 5) отчёт
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[[ -n "${IP:-}" ]] || IP="127.0.0.1"
VER="$(curl -fsS "http://127.0.0.1:${PORT}/api/health" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
echo
echo "──────────────────────────────────────────────────────────────"
echo "  "Дека" запущена:  http://${IP}:${PORT}"
printf '  Версия: %s   Health: /api/health\n' "${VER:-?}"
echo "  Тестовые аккаунты (пароль demo1234):"
echo "    студент:   student1 / student2"
echo "    деканат:   dekanat"
echo "  Бэкап: кабинет деканата → Профиль → \"Полный бэкап (JSON)\""
echo "  HTTPS: см. DEPLOY.md (Caddy, 3 строки конфига)"
if [[ "$COMPOSE_FILE" == "docker-compose.ollama.yml" ]]; then
  echo "  Модель: docker compose -f ${COMPOSE_FILE} logs -f ollama-init  # ждать \"Модель готова.\""
fi
echo "──────────────────────────────────────────────────────────────"
