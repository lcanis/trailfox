#!/usr/bin/env bash
set -euo pipefail

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
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
DB_NAME="${TRAILFOX_DB:-itinerarius}"
APP_USER="${APP_USER:-calixtinus}"
APP_PASSWORD="${APP_PASSWORD:-}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-30}"
DB_STATEMENT_TIMEOUT_MS="${DB_STATEMENT_TIMEOUT_MS:-120000}"

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || { echo "$1 is required" >&2; exit 1; }
}

# psql helper arrays (use system psql directly)
ensure_command psql

PSQL_BASE=( psql -v ON_ERROR_STOP=1 -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT:-5432}" )

# connect as DB admin to itinerarius DB
PSQL_DB=( "${PSQL_BASE[@]}" -U "${DB_ADMIN_USER}" -d "${TRAILFOX_DB}" )
# connect as DB admin to postgres DB (admin operations)
PSQL_POSTGRES=( "${PSQL_BASE[@]}" -U "${POSTGRES_USER}" -d postgres )

# Ensure an environment variable is set (used by init/alter scripts). Do not
# perform checks here automatically; scripts should call this helper when
# they require specific variables.
ensure_env_set() {
  local varname="$1"
  if [ -z "${!varname:-}" ]; then
    echo "Missing required env: $varname" >&2
    exit 1
  fi
}

wait_for_postgres() {
  #echo "Waiting for Postgres at $POSTGRES_HOST:${POSTGRES_PORT:-5432} using ${POSTGRES_USER:-} and password ${POSTGRES_PASSWORD:-}..."
  #echo "${PSQL_POSTGRES[@]}"
  local
  READY=false
  for ((i=1; i<=DB_WAIT_TIMEOUT; i++)); do
    if PGPASSWORD="${POSTGRES_PASSWORD:-}" "${PSQL_POSTGRES[@]}" -c "SELECT 1" >/dev/null 2>&1; then
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
