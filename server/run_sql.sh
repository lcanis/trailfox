#!/usr/bin/env bash
set -euo pipefail

# Run a .sql file or inline SQL against the DB using system `psql` and credentials from ../.env via `run_sql.sh`
# todo: make use of bootstrap-common.sh 

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 [--admin] ( -c \"SQL command\" | path/to/file.sql )" >&2
  exit 2
fi

# Optional explicit admin mode: only use admin credentials when --admin/-a is provided
ADMIN_MODE=false
if [ "$1" = "-a" ] || [ "$1" = "--admin" ]; then
  ADMIN_MODE=true
  shift
fi

MODE=""
CMD=""
SQLFILE=""
if [ "$1" = "-c" ] || [ "$1" = "--command" ]; then
  MODE="command"
  if [ "$#" -lt 2 ]; then
    echo "Usage: $0 -c \"SQL command\"" >&2
    exit 2
  fi
  CMD="$2"
  shift 2
else
  MODE="file"
  SQLFILE="$1"
  if [ ! -f "$SQLFILE" ]; then
    echo "SQL file not found: $SQLFILE" >&2
    exit 2
  fi
fi

ENV_FILE_CANDIDATE="$(dirname "$0")/.env"
ENV_FILE_PARENT="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE_CANDIDATE" ]; then
  ENV_FILE="$ENV_FILE_CANDIDATE"
elif [ -f "$ENV_FILE_PARENT" ]; then
  ENV_FILE="$ENV_FILE_PARENT"
else
  echo "Missing env file: looked for $ENV_FILE_CANDIDATE and $ENV_FILE_PARENT. Please create it and set required DB variables." >&2
  exit 1
fi

set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

# Basic required variables for non-admin operations
MISSING=()
# Require host/port/db; POSTGRES_USER is optional if APP_USER is provided
for v in POSTGRES_HOST POSTGRES_PORT TRAILFOX_DB; do
  if [ -z "${!v:-}" ]; then
    MISSING+=("$v")
  fi
done
# Ensure there's a user to connect as: either DB_ADMIN_USER or APP_USER
if [ -z "${DB_ADMIN_USER:-}" ] && [ -z "${APP_USER:-}" ]; then
  MISSING+=("DB_ADMIN_USER or APP_USER")
fi
if [ ${#MISSING[@]} -ne 0 ]; then
  echo "Missing required variables in $ENV_FILE: ${MISSING[*]}" >&2
  echo "Please set them in $ENV_FILE and retry." >&2
  exit 3
fi

# Determine the non-admin user: prefer DB_ADMIN_USER, otherwise fall back to APP_USER
PSQL_USER="${DB_ADMIN_USER:-${APP_USER:-}}"
if [ "$ADMIN_MODE" = true ]; then
  if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "Admin mode requires POSTGRES_USER and POSTGRES_PASSWORD to be set in $ENV_FILE" >&2
    exit 3
  fi
  PGPASSWORD="$POSTGRES_PASSWORD"
  export PGPASSWORD
  PSQL_USER="$POSTGRES_USER"
else
  # Non-admin: prefer an explicit DB_ADMIN_PASSWORD, otherwise allow APP_PASSWORD as a fallback
  if [ -n "${DB_ADMIN_PASSWORD:-}" ]; then
    PGPASSWORD="$DB_ADMIN_PASSWORD"
    export PGPASSWORD
  elif [ -n "${APP_PASSWORD:-}" ]; then
    PGPASSWORD="$APP_PASSWORD"
    export PGPASSWORD
  else
    unset PGPASSWORD 2>/dev/null || true
  fi
fi

# Ensure system psql is available and use it directly for all calls
command -v psql >/dev/null 2>&1 || { echo "psql is required but not found in PATH" >&2; exit 1; }
# Use psql directly. Set -v ON_ERROR_STOP so scripts error out on first failure.
PSQL_BASE=( psql -v ON_ERROR_STOP=1 -P pager=off -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$PSQL_USER" -d "$TRAILFOX_DB" )

if [ "$MODE" = "command" ]; then
  # Apply a short session timeout to prevent hanging interactive sessions.
  "${PSQL_BASE[@]}" -c "SET statement_timeout = '30s'; ${CMD}"
  exit $?
else
  "${PSQL_BASE[@]}" -f "$SQLFILE"
  exit $?
fi
