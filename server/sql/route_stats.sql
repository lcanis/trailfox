-- Route statistics (streamlined)
-- Outputs only:
--  1) total number of routes
--  2) build case distribution split by geometry type (LINESTRING vs MULTILINESTRING)
--  3) histogram of number of segments for MULTILINESTRING routes

--\set ON_ERROR_STOP on

-- 1) Total routes
SELECT 'total_routes' AS metric, count(*)::bigint AS count
FROM itinerarius.api.routes;

-- 2) Build case distribution by geometry type (shows pct_of_total)
WITH totals AS (
    SELECT count(*)::numeric AS total FROM itinerarius.api.routes
), by_type AS (
    SELECT
        coalesce(geom_build_case, 'NULL') AS geom_build_case,
        GeometryType(geom) AS geom_type,
        count(*)::numeric AS cnt
    FROM itinerarius.api.routes
    GROUP BY coalesce(geom_build_case, 'NULL'), GeometryType(geom)
)
SELECT
    'build_case_by_geom_type' AS metric,
    geom_build_case,
    geom_type,
    cnt::bigint AS count,
    round(100.0 * cnt / (SELECT total FROM totals), 2) || '%' AS pct_of_total
FROM by_type
ORDER BY geom_type, cnt DESC;

-- 3) Histogram of number of segments for MULTILINESTRING routes
WITH multiline AS (
    SELECT ST_NumGeometries(geom) AS parts
    FROM itinerarius.api.routes
    WHERE GeometryType(geom) = 'MULTILINESTRING'
), counts AS (
    SELECT parts, count(*) AS routes_with_that_many_parts
    FROM multiline
    GROUP BY parts
)
-- Top 5 most common segment counts
SELECT 'top_parts' AS metric, parts AS num_segments, routes_with_that_many_parts,
       round(100.0 * routes_with_that_many_parts / (SELECT count(*) FROM multiline), 2) || '%' AS pct_of_multiline
FROM counts
ORDER BY routes_with_that_many_parts DESC
LIMIT 5;

-- Bottom 5 least common segment counts
WITH multiline AS (
    SELECT ST_NumGeometries(geom) AS parts
    FROM itinerarius.api.routes
    WHERE GeometryType(geom) = 'MULTILINESTRING'
), counts AS (
    SELECT parts, count(*) AS routes_with_that_many_parts
    FROM multiline
    GROUP BY parts
)
SELECT 'least_common_parts' AS metric, parts AS num_segments, routes_with_that_many_parts,
       round(100.0 * routes_with_that_many_parts / (SELECT count(*) FROM multiline), 2) || '%' AS pct_of_multiline
FROM counts
ORDER BY routes_with_that_many_parts ASC, parts ASC
LIMIT 5;
