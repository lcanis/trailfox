-- Deterministic amenities benchmark set (Luxembourg import)
--
-- Purpose:
-- - Fixed set of 10 routes (deterministic selection: ORDER BY md5(osm_id::text) LIMIT 10)
-- - Verify correctness via expected amenity counts
-- - Provide a consistent repro harness while optimizing api.get_route_amenities
--
-- How to run:
--   ./server/run_sql.sh server/sql/samples/amenities_benchmark_lux.sql
--
-- Notes:
-- - Counts depend on the imported dataset and the api.get_route_amenities implementation.
-- - If you intentionally change semantics, update expected_amenities.

WITH benchmark_routes(osm_id, expected_amenities) AS (
	VALUES
		(1904106::bigint, 909::bigint),
		(2342006::bigint, 73::bigint),
		(2727253::bigint, 124::bigint),
		(3914296::bigint, 96::bigint),
		(4536701::bigint, 155::bigint),
		(4730822::bigint, 143::bigint),
		(9238422::bigint, 189::bigint),
		(9465096::bigint, 688::bigint),
		(11489942::bigint, 40::bigint),
		(18385494::bigint, 213::bigint)
),
actual AS (
	SELECT
		b.osm_id,
		b.expected_amenities,
		m.actual_amenities,
		m.duration_ms
	FROM benchmark_routes b
	CROSS JOIN LATERAL (
		SELECT
			q.actual_amenities,
			(1000.0 * EXTRACT(EPOCH FROM (clock_timestamp() - t.t0))) AS duration_ms
		FROM (SELECT clock_timestamp() AS t0) t
		CROSS JOIN LATERAL (
			SELECT count(*)::bigint AS actual_amenities
			FROM api.get_route_amenities(b.osm_id, 1000)
		) q
	) m
)
SELECT
	a.osm_id,
	a.expected_amenities,
	a.actual_amenities,
	a.duration_ms,
	(a.actual_amenities - a.expected_amenities) AS diff
FROM actual a
ORDER BY a.osm_id;

DO $$
DECLARE
	mismatches integer;
BEGIN
	SELECT count(*)
	INTO mismatches
	FROM (
		WITH benchmark_routes(osm_id, expected_amenities) AS (
			VALUES
				(1904106::bigint, 909::bigint),
				(2342006::bigint, 73::bigint),
				(2727253::bigint, 124::bigint),
				(3914296::bigint, 96::bigint),
				(4536701::bigint, 155::bigint),
				(4730822::bigint, 143::bigint),
				(9238422::bigint, 189::bigint),
				(9465096::bigint, 688::bigint),
				(11489942::bigint, 40::bigint),
				(18385494::bigint, 213::bigint)
		),
		actual AS (
			SELECT
				b.osm_id,
				b.expected_amenities,
				(
					SELECT count(*)
					FROM api.get_route_amenities(b.osm_id, 1000)
				) AS actual_amenities
			FROM benchmark_routes b
		)
		SELECT 1
		FROM actual a
		WHERE a.actual_amenities <> a.expected_amenities
	) s;

	IF mismatches > 0 THEN
		RAISE EXCEPTION 'Amenities benchmark failed: % route(s) had mismatched counts', mismatches;
	END IF;
END $$;
