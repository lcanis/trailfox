#!/usr/bin/env bash
set -euo pipefail

# Common bootstrap utilities: load .env (if present), set defaults, and define psql helpers.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
if [ -f "$ENV_FILE" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi

# Defaults
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_NAME="${DB_NAME:-itinerarius}"
DB_ADMIN_USER="${DB_ADMIN_USER:-${POSTGRES_USER:-gisuser}}"
# Import runs as the DB admin/owner (rw)
IMPORTER_USER="${IMPORTER_USER:-$DB_ADMIN_USER}"
APP_USER="${APP_USER:-calixtinus}"
# APP_PASSWORD must be provided explicitly (no legacy fallback)
APP_PASSWORD="${APP_PASSWORD:-}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-30}"
DB_STATEMENT_TIMEOUT_MS="${DB_STATEMENT_TIMEOUT_MS:-120000}"

# trailfox psql wrapper and helper arrays
PSQL_SCRIPT="$SCRIPT_DIR/trailfox-psql"
PSQL_DB=("$PSQL_SCRIPT" -d "${POSTGRES_DB:-$DB_NAME}")
PSQL_POSTGRES=("$PSQL_SCRIPT" -d postgres)

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || { echo "$1 is required" >&2; exit 1; }
}

wait_for_postgres() {
  echo "Waiting for Postgres at $DB_HOST:${POSTGRES_PORT:-5432}..."
  READY=false
  for ((i=1; i<=DB_WAIT_TIMEOUT; i++)); do
    if PGPASSWORD="${DB_ADMIN_PASSWORD:-}" "${PSQL_POSTGRES[@]}" -c "SELECT 1" >/dev/null 2>&1; then
      READY=true
      break
    fi
    sleep 1
  done
  if [ "$READY" = false ]; then
    echo "Postgres not reachable after ${DB_WAIT_TIMEOUT}s" >&2
    return 1
  fi
  return 0
}
