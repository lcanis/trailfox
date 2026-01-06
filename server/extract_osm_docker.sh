#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run osmium (from the iboates/osmium Docker image in docker-compose)
# Usage: ./extract_osm_docker.sh <input.osm.pbf> [output_prefix]

INPUT_PBF="$1"
OUTPUT_PREFIX="${2:-extracted}"

if [ -z "$INPUT_PBF" ]; then
  echo "Usage: $0 <input.osm.pbf> [output_prefix]"
  exit 1
fi

OUT_PBF="${OUTPUT_PREFIX}-filtered.osm.pbf"

echo "--- Extracting with Docker Osmium: $INPUT_PBF -> $OUT_PBF ---"
# Run osmium tags-filter inside the docker container via docker-compose service `osmium`.
# The project mounts the repo root as /data in the container.

cmd=(docker compose -f "$(dirname "$0")/docker-compose.yml" run --rm -T osmium \
  tags-filter /data/"$INPUT_PBF"
  r/type=route,superroute \
  r/route=hiking,foot,walking,ferry \
  nwr/route=ferry nwr/man_made=pier nwr/ferry=yes \
  nwr/tourism nwr/amenity nwr/healthcare \
  nwr/amenity=place_of_worship \
  nwr/building=church,monastery,chapel \
  nwr/shop nwr/historic \
  nwr/leisure=swimming_pool,swimming_area,bathing_place,beach,picnic_table \
  nwr/natural=hot_spring,spring,beach \
  nwr/man_made=water_tap,water_well \
  nwr/highway=bus_stop,rest_area nwr/railway=station,halt \
  nwr/aeroway=aerodrome,airport nwr/emergency=phone,defibrillator \
  nwr/place=city,town,village,hamlet,isolated_dwelling,farm \
  -o /data/"$OUT_PBF" --overwrite)

# Show the constructed command (for debugging)
echo "Running: ${cmd[*]}"

# Time the command using /usr/bin/time if available, else use shell time
TIME_CMD=(/usr/bin/time -v)
if command -v /usr/bin/time >/dev/null 2>&1; then
  ("${TIME_CMD[@]}" "${cmd[@]}")
else
  time "${cmd[@]}"
fi

ls -lh "$OUT_PBF"
sha256sum "$OUT_PBF" > "$OUT_PBF.sha256"

echo "Extraction complete. Output: $OUT_PBF and checksum in $OUT_PBF.sha256"
