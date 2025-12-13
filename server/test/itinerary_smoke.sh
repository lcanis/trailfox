#!/usr/bin/env bash
set -euo pipefail

# Smoke test for itinerary query performance/correctness.
#
# Usage:
#   cd server/setup
#   ./../test/itinerary_smoke.sh 2096356
#
# Requires: server/setup/.env and local psql.

ROUTE_OSM_ID="${1:-2096356}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SETUP_DIR="$(cd "$SCRIPT_DIR/../setup" && pwd)"

cd "$SETUP_DIR"
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_PORT:?Missing POSTGRES_PORT in .env}"
: "${DB_ADMIN_PASSWORD:?Missing DB_ADMIN_PASSWORD in .env}"

export PGPASSWORD="$DB_ADMIN_PASSWORD"

psql -h 127.0.0.1 -p "$POSTGRES_PORT" -U gisuser -d itinerarius -v ON_ERROR_STOP=1 <<SQL
\timing on
SET statement_timeout='8s';

\echo 'route_amenities count (<=1km)'
SELECT COUNT(*) AS n
FROM api.route_amenities
WHERE route_osm_id=$ROUTE_OSM_ID
  AND distance_from_trail_m <= 1000;

\echo 'trail_km range'
SELECT MIN(trail_km) AS min_km, MAX(trail_km) AS max_km
FROM api.route_amenities
WHERE route_osm_id=$ROUTE_OSM_ID
  AND distance_from_trail_m <= 1000;

\echo 'route length (km)'
SELECT ST_Length(geom::geography)/1000.0 AS route_km
FROM itinerarius.routes
WHERE osm_id=$ROUTE_OSM_ID;
SQL
