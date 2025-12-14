-- Extracted routes geometry post-processing
-- This logic is heavy and is moved here to avoid running it during standard imports.
-- It creates a separate table itinerarius.routes_cluster_sql for analysis.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'itinerarius' AND t.typname = 'clustering_result'
    ) THEN
        CREATE TYPE itinerarius.clustering_result AS (
            geom geometry,
            build_case text
        );
    END IF;
END $$;

-- Cluster+snap+merge multi-part routes into a more usable linestring when possible.
-- NOTE: This runs in WGS84 (4326). Snapping uses a small degree tolerance.
-- 10 meters is ~0.0000898 degrees at the equator.
DROP FUNCTION IF EXISTS itinerarius.apply_clustering(geometry);
CREATE OR REPLACE FUNCTION itinerarius.apply_clustering(multilinestring geometry)
RETURNS itinerarius.clustering_result AS $$
WITH
params AS (
    SELECT (10.0 / 111320.0) AS snap_tol_deg
),
input AS (
    SELECT
        CASE
            WHEN multilinestring IS NULL OR ST_IsEmpty(multilinestring) THEN NULL
            ELSE ST_CollectionExtract(ST_Force2D(multilinestring), 2)
        END AS g
),
prep AS (
    SELECT
        g,
        ST_LineMerge(g) AS lm,
        CASE
            WHEN GeometryType(g) = 'MULTILINESTRING' THEN ST_NumGeometries(g)
            ELSE 1
        END AS n
    FROM input
    WHERE g IS NOT NULL
),
fallback AS (
    SELECT ST_LineMerge(ST_UnaryUnion((SELECT g FROM prep))) AS g
),
clustered AS (
    WITH
    segments AS (
        SELECT (ST_Dump((SELECT g FROM prep))).geom AS seg
    ),
    union_all AS (
        -- Only compute union for small-ish relations; large relations are handled
        -- by the fallback path to avoid heavy GEOS operations.
        SELECT ST_UnaryUnion(ST_Collect(seg)) AS u
        FROM segments
        WHERE (SELECT n FROM prep) <= 300
    ),
    snapped_segments AS (
        -- Stage 2 (doc): snap segments that are "almost" connected.
        -- IMPORTANT: snap against the union of all segments so clusters can join.
        -- Skip snapping for very large relations to avoid long/interruptible GEOS calls.
        SELECT ST_Snap(seg, (SELECT u FROM union_all), (SELECT snap_tol_deg FROM params)) AS seg
        FROM segments
        WHERE (SELECT n FROM prep) <= 300
    ),
    clusters AS (
        -- Stage 1 (doc): cluster intersecting segments (after snapping)
        SELECT unnest(ST_ClusterIntersecting(seg)) AS cluster_geom
        FROM snapped_segments
    ),
    cluster_merged AS (
        SELECT ST_LineMerge(ST_UnaryUnion(ST_CollectionExtract(cluster_geom, 2))) AS g
        FROM clusters
        WHERE cluster_geom IS NOT NULL AND NOT ST_IsEmpty(cluster_geom)
    )
    SELECT ST_LineMerge(
        ST_CollectionExtract(
            ST_UnaryUnion(ST_Collect(g)),
            2
        )
    ) AS g
    FROM cluster_merged
)
SELECT
    CASE
        WHEN (SELECT g FROM input) IS NULL
            THEN ROW(NULL::geometry, 'null_or_empty')::itinerarius.clustering_result

        WHEN GeometryType((SELECT lm FROM prep)) = 'LINESTRING'
            THEN ROW((SELECT lm FROM prep), 'fast_linestring')::itinerarius.clustering_result

        WHEN (SELECT n FROM prep) > 300
            THEN ROW((SELECT g FROM fallback), 'fallback_big_multiline')::itinerarius.clustering_result

        WHEN (SELECT g FROM clustered) IS NULL OR ST_IsEmpty((SELECT g FROM clustered))
            THEN ROW((SELECT g FROM fallback), 'fallback_cluster_empty')::itinerarius.clustering_result

        ELSE
            ROW((SELECT g FROM clustered), 'clustered_snapped')::itinerarius.clustering_result
    END;
$$ LANGUAGE sql IMMUTABLE STRICT;

-- Create the table with the results
DROP TABLE IF EXISTS itinerarius.routes_cluster_sql;
CREATE TABLE itinerarius.routes_cluster_sql AS
SELECT
    osm_id,
    (itinerarius.apply_clustering(raw_geom)).*
FROM itinerarius.routes
WHERE raw_geom IS NOT NULL;

CREATE INDEX idx_routes_cluster_sql_geom ON itinerarius.routes_cluster_sql USING GIST (geom);

-- NOTE: This file has been moved to `sql/cluster.sql`. The copy in the root remains as a placeholder; run the SQL in `sql/` instead.
RAISE NOTICE 'cluster moved to sql/cluster.sql';
