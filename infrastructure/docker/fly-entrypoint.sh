#!/usr/bin/env bash
# Fly.io container entrypoint for Дека (deka-dekanat).
#
# Responsibilities (in order):
#   1. Prepare the data directory on the Fly volume (owned by "postgres").
#   2. Initialize the PostgreSQL cluster on first boot (initdb).
#   3. Start PostgreSQL in the background and wait until it accepts connections.
#   4. Create the application database + role (idempotent).
#   5. Run SQL migrations (idempotent — applies only pending migrations).
#   6. Seed demo data (idempotent — only if the database has no users).
#   7. Run the Node app and shut everything down cleanly on SIGTERM/SIGINT.
#
# This entrypoint runs as root inside an image that has both PostgreSQL
# binaries and Node.js installed (see Dockerfile.fly). It drives PostgreSQL
# directly through initdb/postgres via gosu instead of the postgres image's
# docker-entrypoint.sh: that wrapper skips its root-only chown branch when it
# is already running as "postgres", which breaks on a root-owned volume mount.
#
# Persistent storage: the Fly volume is mounted at /data and the cluster lives
# in the /data/postgres SUBDIRECTORY. Fly volumes are ext4 and arrive with a
# lost+found directory at their root, which makes initdb refuse to run when
# PGDATA is the mount point itself.

set -euo pipefail

echo "[fly-entrypoint] Starting Дека container..."

# ---- 0. Validate required secrets ---------------------------------------
# Without these the image defaults would silently fall back to the placeholder
# password "demo_password" baked into Dockerfile.fly — refuse to start instead.
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "[fly-entrypoint] FATAL: POSTGRES_PASSWORD secret is not set." >&2
  exit 1
fi
if [ -z "${APP_DB_PASSWORD:-}" ]; then
  echo "[fly-entrypoint] FATAL: APP_DB_PASSWORD secret is not set." >&2
  exit 1
fi

PGDATA="${PGDATA:-/data/postgres}"
export PGDATA
export PGHOST=/var/run/postgresql
PGPORT=5432
export PGPORT
# psql/createdb/pg_isready default to $PGUSER; the superuser is POSTGRES_USER
# (initdb --username), not the OS user "postgres".
export PGUSER="${POSTGRES_USER:-deka_owner}"

# Percent-encode a value so it can be embedded in a postgres:// URL. Passwords
# set by hand may contain '@', ':', '/' or other reserved characters.
urlencode() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

# ---- 1. Prepare the data directory --------------------------------------
# /data is the Fly volume root (uid 0). Let "postgres" create its subdirectory.
# Only the top-level entries are re-owned: a recursive chown over a growing
# cluster would slow down every cold start.
mkdir -p /var/run/postgresql
chown postgres:postgres /data /var/run/postgresql 2>/dev/null || true
mkdir -p "$PGDATA"
chown postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"

# ---- 2. Initialize the cluster on first boot ----------------------------
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[fly-entrypoint] Empty PGDATA — running initdb..."
  umask 077
  printf '%s' "$POSTGRES_PASSWORD" > /tmp/pg-superuser-pw
  chown postgres:postgres /tmp/pg-superuser-pw
  gosu postgres initdb -D "$PGDATA" \
    --username="$POSTGRES_USER" \
    --pwfile=/tmp/pg-superuser-pw \
    --auth-local=trust \
    --auth-host=scram-sha-256 \
    --encoding=UTF8 \
    --locale=C.UTF-8
  rm -f /tmp/pg-superuser-pw
else
  echo "[fly-entrypoint] Existing PGDATA found — reusing it."
fi

# ---- 3. Start PostgreSQL in the background ------------------------------
# Tee the server log so database problems are visible in `fly logs`, while
# keeping a copy for the "did not become ready" diagnostic below.
echo "[fly-entrypoint] Starting PostgreSQL..."
gosu postgres postgres -D "$PGDATA" \
  -c listen_addresses=127.0.0.1 \
  -c port="$PGPORT" \
  > >(tee /tmp/pg.log) 2>&1 &
PG_PID=$!

echo "[fly-entrypoint] Waiting for PostgreSQL to be ready..."
for i in $(seq 1 60); do
  if gosu postgres pg_isready -q -d postgres -U "$POSTGRES_USER" 2>/dev/null; then
    echo "[fly-entrypoint] PostgreSQL is ready (after ${i}s)."
    break
  fi
  if [ "$i" = "60" ]; then
    echo "[fly-entrypoint] PostgreSQL did not become ready in 60s. Log:"
    tail -30 /tmp/pg.log
    exit 1
  fi
  sleep 1
done

# ---- 4. Create the application database and role (idempotent) -----------
if ! gosu postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB'" -d postgres | grep -q 1; then
  echo "[fly-entrypoint] Creating database '$POSTGRES_DB'..."
  gosu postgres createdb -O "$POSTGRES_USER" "$POSTGRES_DB"
fi

if ! gosu postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='deka_app'" -d "$POSTGRES_DB" | grep -q 1; then
  echo "[fly-entrypoint] Creating application role 'deka_app'..."
  # 10-application-user.sh is a BASH script (the postgres image's initdb.d runs
  # *.sh through bash), so it must not be handed to `psql -f` as if it were SQL.
  gosu postgres bash /docker-entrypoint-initdb.d/10-application-user.sh
else
  echo "[fly-entrypoint] Application role 'deka_app' already exists."
fi

# Keep the role's password in sync with the secret on every boot: a redeploy
# after `fly secrets set APP_DB_PASSWORD=...` must not leave the app unable to
# connect because the role was created with the previous value.
gosu postgres psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
\getenv application_password APP_DB_PASSWORD
ALTER ROLE deka_app PASSWORD :'application_password';
SQL

# Build the connection strings from the runtime secrets, percent-encoding the
# passwords so reserved characters cannot corrupt the URL.
APP_PW_ENC="$(urlencode "$APP_DB_PASSWORD")"
OWNER_PW_ENC="$(urlencode "$POSTGRES_PASSWORD")"
export DATABASE_URL="postgres://deka_app:${APP_PW_ENC}@127.0.0.1:${PGPORT}/${POSTGRES_DB}"

# ---- 5. Run migrations as the owning role -------------------------------
# Migrations need DDL privileges, so connect as the superuser/owner role.
DATABASE_URL_OWNER="postgres://${POSTGRES_USER}:${OWNER_PW_ENC}@127.0.0.1:${PGPORT}/${POSTGRES_DB}"
echo "[fly-entrypoint] Applying SQL migrations..."
DATABASE_URL="$DATABASE_URL_OWNER" node tooling/database/migrate.mjs

# ---- 6. Seed demo data (idempotent) -------------------------------------
# seed.mjs checks if the users table is empty; if it has any rows, it skips.
if [ "${DEMO_MODE:-false}" = "true" ]; then
  echo "[fly-entrypoint] Seeding demo data (DEMO_MODE=true)..."
  DATABASE_URL="$DATABASE_URL_OWNER" DEMO_MODE=true node tooling/database/seed.mjs || \
    echo "[fly-entrypoint] Seed skipped (database already has data)."
else
  echo "[fly-entrypoint] DEMO_MODE=false, skipping demo seed."
fi

# ---- 7. Start the local assistant (background, best effort) -------------
# The model (~1 GB) and the llama.cpp runtime are cached on the volume, so only
# the first boot downloads them. Downloading happens in the background: the web
# app must come up immediately so the platform health check passes, and the
# assistant simply reports "temporarily unavailable" until it is ready.
AI_PID=""
# Per-boot API key: only this app should be able to drive the model server.
# Generated in the parent shell (not inside the background installer) so the
# Node app, started later in this same shell, receives the same value.
if [ "${ASSISTANT_ENABLED:-true}" = "true" ] && [ -z "${AI_API_KEY:-}" ]; then
  AI_API_KEY="$(head -c 32 /dev/urandom | base64 | tr -d '\n=+/')"
  export AI_API_KEY
fi

start_assistant() {
  if ! node tooling/assistant/install-fly-assistant.mjs; then
    echo "[fly-entrypoint] Assistant setup failed; continuing without it."
    return 0
  fi
  local model_file
  model_file="$(ls "${MODEL_DIRECTORY:-/data/models}"/*.gguf 2>/dev/null | head -1)"
  if [ -z "$model_file" ]; then
    echo "[fly-entrypoint] No model file found; assistant stays disabled."
    return 0
  fi
  echo "[fly-entrypoint] Starting llama-server with $(basename "$model_file")..."
  # The bundled .so files live next to the binary; make sure they are found.
  LD_LIBRARY_PATH="${RUNTIME_DIRECTORY:-/data/llama}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
  "${RUNTIME_DIRECTORY:-/data/llama}/llama-server" \
    --model "$model_file" \
    --host 127.0.0.1 --port 5188 \
    --ctx-size 4096 --threads 2 --parallel 1 \
    --api-key "$AI_API_KEY" \
    --jinja --no-ui --metrics >/tmp/llama.log 2>&1 &
  echo $! >/tmp/ai.pid
  for i in $(seq 1 120); do
    # /health is unauthenticated, but send the key anyway so a future change to
    # the server's auth rules cannot silently break this readiness probe.
    if curl -fsS --max-time 2 -H "Authorization: Bearer $AI_API_KEY" \
      http://127.0.0.1:5188/health >/dev/null 2>&1; then
      echo "[fly-entrypoint] Assistant ready (after ${i}s)."
      return 0
    fi
    if [ "$i" = "120" ]; then
      echo "[fly-entrypoint] Assistant did not become ready; continuing without it."
      tail -20 /tmp/llama.log || true
    fi
    sleep 1
  done
}

if [ "${ASSISTANT_ENABLED:-true}" = "true" ]; then
  echo "[fly-entrypoint] Preparing the local assistant in the background..."
  start_assistant &
else
  echo "[fly-entrypoint] ASSISTANT_ENABLED=false, skipping the local model."
fi

# ---- 8. Run the app, then stop PostgreSQL cleanly -----------------------
echo "[fly-entrypoint] Starting Дека app on port ${PORT:-5180}..."

stop_assistant() {
  # llama-server is started from a background function, so its PID is kept in
  # /tmp/ai.pid rather than in a shell variable (a subshell cannot export it).
  if [ -s /tmp/ai.pid ]; then
    kill -TERM "$(cat /tmp/ai.pid)" 2>/dev/null || true
    rm -f /tmp/ai.pid
  fi
}

shutdown() {
  echo "[fly-entrypoint] Shutdown signal received — stopping app, assistant and PostgreSQL..."
  kill -TERM "$APP_PID" 2>/dev/null || true
  wait "$APP_PID" 2>/dev/null || true
  stop_assistant
  # SIGTERM lets PostgreSQL shut down cleanly before the volume is unmounted.
  kill -TERM "$PG_PID" 2>/dev/null || true
  wait "$PG_PID" 2>/dev/null || true
  echo "[fly-entrypoint] Stopped."
  exit 0
}

node .output/index.js &
APP_PID=$!
trap shutdown SIGTERM SIGINT

# Exit when either process dies: a dead app is useless, and a dead database
# means the app cannot serve requests anyway.
set +e
wait -n "$APP_PID" "$PG_PID"
CHILD_EXIT=$?
set -e

echo "[fly-entrypoint] A child process exited (code ${CHILD_EXIT}); shutting down."
kill -TERM "$APP_PID" "$PG_PID" 2>/dev/null || true
wait "$APP_PID" 2>/dev/null || true
wait "$PG_PID" 2>/dev/null || true
stop_assistant
exit "$CHILD_EXIT"
