-- Benchmark for Bavaria amenities performance
-- Usage: ./run_sql.sh server/sql/samples/amenities_benchmark_bayern.sql

SET jit = off;

WITH test_routes AS (
    SELECT * FROM (VALUES
        (100366, 'Fränkischer Marienweg – Ave-Maria-Route', 581),
        (10095829, 'Fränkischer Marienweg Route 4', 250),
        (142198, 'Kelten-Erlebnisweg', 190),
        (157477, 'Steigerwald Panoramaweg', 163),
        (1736379, 'Traumpfad München-Venedig', 107),
        (3974292, '7-Flüsse-Wanderweg', 208),
        (158952, 'Burgenweg', 176),
        (197344, 'Nurtschweg', 134),
        (2129711, 'Europäischer Fernwanderweg E3', 122),
        (17610772, 'Lutherweg Bayern-Mittelfranken', 108)
    ) AS t(osm_id, name, km)
),
bench AS (
    SELECT 
        tr.osm_id,
        tr.name,
        tr.km,
        (SELECT count(*) FROM api.get_route_amenities(tr.osm_id, 1000)) as amenity_count,
        clock_timestamp() as t0
    FROM test_routes tr
),
results AS (
    SELECT 
        b.osm_id,
        b.name,
        b.km,
        (SELECT count(*) FROM api.get_route_amenities(b.osm_id, 1000)) as amenity_count,
        (1000.0 * EXTRACT(EPOCH FROM (clock_timestamp() - b.t0))) as duration_ms
    FROM bench b
)
SELECT 
    osm_id,
    RPAD(LEFT(name, 40), 40) as route_name,
    km as length_km,
    amenity_count,
    ROUND(duration_ms::numeric, 2) as duration_ms
FROM results
ORDER BY duration_ms DESC;
