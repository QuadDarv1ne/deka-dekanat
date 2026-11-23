#!/usr/bin/env bash
# PaaS start script for Дека (deka-dekanat).
#
# Used by Dockerfile.paas on Railway, Render, and similar PaaS providers.
# Expects DATABASE_URL to be injected by the platform, pointing to a managed
# PostgreSQL instance.
#
# Steps:
#   1. Wait for DATABASE_URL to be set and the DB to accept connections.
#   2. Apply SQL migrations (idempotent — only applies pending migrations).
#   3. Seed demo data (idempotent — only if the database has no users).
#   4. Start the Node app (foreground, becomes PID 1).

set -euo pipefail

echo "[start-paas] Starting Дека on PaaS..."

# ---- 1. Verify DATABASE_URL is set ---------------------------------------
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[start-paas] ERROR: DATABASE_URL is not set."
  echo "[start-paas] On Railway: add a PostgreSQL plugin, it injects DATABASE_URL automatically."
  echo "[start-paas] On Render:  create a PostgreSQL database, link it to this service."
  exit 1
fi

# Wait for the DB to accept connections. PaaS providers often boot the app
# and DB in parallel — the DB might not be ready for the first ~10 seconds.
echo "[start-paas] Waiting for PostgreSQL at \$DATABASE_URL..."
for i in $(seq 1 30); do
  if node -e "
    const { Client } = require('pg');
    (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2000 });
      try { await c.connect(); await c.query('SELECT 1'); await c.end(); process.exit(0); }
      catch (e) { process.exit(1); }
    })();
  " 2>/dev/null; then
    echo "[start-paas] PostgreSQL is ready (after ${i}s)."
    break
  fi
  if [ "$i" = "30" ]; then
    echo "[start-paas] PostgreSQL did not become ready in 30s. Continuing anyway..."
  fi
  sleep 1
done

# ---- 2. Apply migrations -------------------------------------------------
# Migrations require DDL privileges — the user in DATABASE_URL must own the
# schema or have CREATE/ALTER/DROP permissions. On managed PaaS PostgreSQL,
# the default user created with the DB has these privileges.
echo "[start-paas] Applying SQL migrations..."
node tooling/database/migrate.mjs

# ---- 3. Seed demo data (idempotent) --------------------------------------
# seed.mjs checks if the users table is empty; if it has any rows, it skips.
# DEMO_MODE=true is required by seed.mjs as a safety guard.
if [ "${DEMO_MODE:-false}" = "true" ]; then
  echo "[start-paas] Seeding demo data (DEMO_MODE=true)..."
  node tooling/database/seed.mjs || echo "[start-paas] Seed skipped (database already has data)."
else
  echo "[start-paas] DEMO_MODE=false, skipping demo seed."
fi

# ---- 4. Start the Node app -----------------------------------------------
echo "[start-paas] Starting Дека app on port ${PORT:-5180}..."
exec node .output/index.js
