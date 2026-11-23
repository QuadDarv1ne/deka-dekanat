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
#   7. exec the Node app as PID 1.
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

# ---- 0. Verify secrets ---------------------------------------------------
# POSTGRES_PASSWORD creates the deka_owner superuser (and is used for
# migrations); APP_DB_PASSWORD is the password of the unprivileged deka_app
# role the Node app connects with. Both come from `fly secrets set`.
if [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${APP_DB_PASSWORD:-}" ]; then
  echo "[fly-entrypoint] ERROR: POSTGRES_PASSWORD and APP_DB_PASSWORD must be set."
  echo "[fly-entrypoint]   fly secrets set POSTGRES_PASSWORD='<random>' APP_DB_PASSWORD='<random>'"
  exit 1
fi

# Build the application's connection string from the runtime secrets. Keeping
# it out of the image means no password is ever baked into a layer.
export DATABASE_URL="postgres://deka_app:${APP_DB_PASSWORD}@127.0.0.1:5432/deka"

PGDATA="${PGDATA:-/data/postgres}"
export PGDATA
export PGHOST=/var/run/postgresql
PGPORT=5432
export PGPORT
# psql/createdb/pg_isready default to $PGUSER; the superuser is POSTGRES_USER
# (initdb --username), not the OS user "postgres".
export PGUSER="${POSTGRES_USER:-deka_owner}"

# ---- 1. Prepare the data directory --------------------------------------
# /data is the Fly volume root (uid 0). Let "postgres" create its subdirectory.
mkdir -p /var/run/postgresql
chown postgres:postgres /data /var/run/postgresql 2>/dev/null || true
mkdir -p "$PGDATA"

# ---- 2. Initialize the cluster on first boot ----------------------------
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[fly-entrypoint] Empty PGDATA — running initdb..."
  chown -R postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  if [ -n "${POSTGRES_PASSWORD:-}" ]; then
    # Give the superuser a password so TCP (scram) connections work.
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
    echo "[fly-entrypoint] WARNING: POSTGRES_PASSWORD is empty — using trust auth."
    gosu postgres initdb -D "$PGDATA" \
      --username="$POSTGRES_USER" \
      --auth-local=trust \
      --auth-host=trust \
      --encoding=UTF8 \
      --locale=C.UTF-8
  fi
else
  echo "[fly-entrypoint] Existing PGDATA found — reusing it."
fi

# ---- 3. Start PostgreSQL in the background ------------------------------
echo "[fly-entrypoint] Starting PostgreSQL..."
gosu postgres postgres -D "$PGDATA" \
  -c listen_addresses=127.0.0.1 \
  -c port="$PGPORT" >/tmp/pg.log 2>&1 &
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

# Build the application's connection string from the runtime secrets.
export DATABASE_URL="postgres://deka_app:${APP_DB_PASSWORD}@127.0.0.1:${PGPORT}/${POSTGRES_DB}"

# ---- 5. Run migrations as the owning role -------------------------------
# Migrations need DDL privileges, so connect as the superuser/owner role.
DATABASE_URL_OWNER="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD:-}@127.0.0.1:${PGPORT}/${POSTGRES_DB}"
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

# ---- 7. Start the Node app (foreground, becomes PID 1) ------------------
echo "[fly-entrypoint] Starting Дека app on port ${PORT:-5180}..."
trap "kill $PG_PID 2>/dev/null; exit 0" SIGTERM SIGINT

# Keep PostgreSQL alive alongside the app; if it dies, the container exits.
wait "$PG_PID" &
WAIT_PID=$!

exec node .output/index.js
