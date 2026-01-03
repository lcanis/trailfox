#!/bin/bash
# Benchmark PostgREST API performance using curl
# Usage: ./server/sql/samples/api_benchmark.sh [port]

PORT=${1:-3000}
HOST="http://localhost:$PORT"

echo "Benchmarking API at $HOST"
echo "----------------------------------------------------------------"
printf "%-12s | %-40s | %-10s\n" "OSM ID" "Route Name" "Time"
echo "----------------------------------------------------------------"

# List of routes from the Bavaria benchmark
ROUTES=(
    "100366:Fränkischer Marienweg"
    "10095829:Fränkischer Marienweg R4"
    "142198:Kelten-Erlebnisweg"
    "157477:Steigerwald Panoramaweg"
    "1736379:Traumpfad München-Venedig"
    "3974292:7-Flüsse-Wanderweg"
    "158952:Burgenweg"
    "197344:Nurtschweg"
    "2129711:E3 Bayern"
    "17610772:Lutherweg"
)

for entry in "${ROUTES[@]}"; do
    ID="${entry%%:*}"
    NAME="${entry#*:}"
    
    # Use /usr/bin/time for more precision or just time builtin
    # We want to capture the real time of the request
    T_START=$(python3 -c 'import time; print(time.time())')
    curl -s -G "$HOST/rpc/get_route_amenities" \
      -d "target_route_id=$ID" \
      -d "search_radius_m=1000" \
      -H "Accept: application/json" > /dev/null
    T_END=$(python3 -c 'import time; print(time.time())')
    
    DURATION=$(python3 -c "print(f'{($T_END - $T_START)*1000:.2f}')")
    printf "%-12s | %-40s | %s ms\n" "$ID" "$NAME" "$DURATION"
done
