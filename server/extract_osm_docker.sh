#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run osmium (from the iboates/osmium Docker image in docker-compose)
# Usage: ./extract_osm_docker.sh <input.osm.pbf> [output_prefix]
# Example: ./extract_osm_docker.sh luxembourg-latest.osm.pbf lux

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

cmd=(docker compose -f "$(dirname "$0")/docker-compose.yml" run --user "$(id -u):$(id -g)" --rm -T osmium \
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

# Use wall-clock timing (simpler and less confusing than the verbose /usr/bin/time output)
start_ts=$(date +%s)
if "${cmd[@]}"; then
  status=0
else
  status=$?
fi
end_ts=$(date +%s)
elapsed=$((end_ts - start_ts))
printf 'Elapsed time: %d:%02d:%02d\n' $((elapsed/3600)) $((elapsed%3600/60)) $((elapsed%60))

# Show output
ls -lh "$OUT_PBF"

# If the output is owned by root but we are not root, attempt to fix ownership via the container
owner_uid=$(stat -c %u "$OUT_PBF" || true)
if [ "${owner_uid:-}" = "0" ] && [ "$(id -u)" != "0" ]; then
  echo "Output is owned by root; attempting to fix ownership via container chown..."
  docker compose -f "$(dirname "$0")/docker-compose.yml" run --rm -T osmium chown "$(id -u):$(id -g)" /data/"$OUT_PBF" || true
  ls -lh "$OUT_PBF"
fi

if [ "$status" -ne 0 ]; then
  echo "Extraction command failed with exit status $status"
  exit "$status"
fi

echo "Extraction complete. Output: $OUT_PBF"
