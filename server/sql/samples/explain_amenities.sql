-- Explain analyze for three routes in Bavaria
-- Usage: ./run_sql.sh server/sql/samples/explain_amenities.sql

SET jit = off;

\echo '--- EXPLAIN ANALYZE for Fränkischer Marienweg (581km) ---'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM api.get_route_amenities(100366, 1000);

\echo '--- EXPLAIN ANALYZE for Steigerwald Panoramaweg (163km) ---'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM api.get_route_amenities(157477, 1000);

\echo '--- EXPLAIN ANALYZE for Lutherweg Bayern-Mittelfranken (108km) ---'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM api.get_route_amenities(17610772, 1000);
