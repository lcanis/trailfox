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
export PGOPTIONS='-c statement_timeout=8000'

echo "-- itinerary smoke: route_osm_id=$ROUTE_OSM_ID"

psql -h 127.0.0.1 -p "$POSTGRES_PORT" -U gisuser -d itinerarius -v ON_ERROR_STOP=1 <<SQL

\echo 'route_amenities count (<=1km)'
SELECT COUNT(*) AS n
FROM api.route_amenities
WHERE route_osm_id=$ROUTE_OSM_ID
  AND distance_from_trail_m <= 1000;
SQL

MIN_KM=$(psql -qAt -h 127.0.0.1 -p "$POSTGRES_PORT" -U gisuser -d itinerarius -c "
  SELECT COALESCE(MIN(trail_km), 0) FROM api.route_amenities
  WHERE route_osm_id=$ROUTE_OSM_ID AND distance_from_trail_m <= 1000;
")
MAX_KM=$(psql -qAt -h 127.0.0.1 -p "$POSTGRES_PORT" -U gisuser -d itinerarius -c "
  SELECT COALESCE(MAX(trail_km), 0) FROM api.route_amenities
  WHERE route_osm_id=$ROUTE_OSM_ID AND distance_from_trail_m <= 1000;
")
ROUTE_KM=$(psql -qAt -h 127.0.0.1 -p "$POSTGRES_PORT" -U gisuser -d itinerarius -c "
  SELECT ST_Length(geom::geography)/1000.0 FROM itinerarius.routes WHERE osm_id=$ROUTE_OSM_ID;
")

echo "trail_km range: min_km=$MIN_KM max_km=$MAX_KM"
echo "route length km: route_km=$ROUTE_KM"

# Assertions (heuristics):
# - min_km should be near the start (but may not be exactly 0 if no amenity near the start).
# - max_km should be close to the route length; this catches the historical 'stops at 15km' bug.
python3 - <<PY
import sys

min_km = float("$MIN_KM")
max_km = float("$MAX_KM")
route_km = float("$ROUTE_KM")

if route_km <= 0:
  print("FAIL: route_km <= 0")
  sys.exit(2)

if min_km > 5.0:
  print(f"FAIL: min_km too large ({min_km:.2f}km) — likely start not near 0")
  sys.exit(3)

if (route_km - max_km) > 5.0:
  print(f"FAIL: max_km too far from route_km (route_km-max_km={(route_km-max_km):.2f}km)")
  sys.exit(4)

print("OK")
PY

unset PGOPTIONS
