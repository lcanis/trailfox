\set import_user :IMPORTER_USER
\set app_user :APP_USER

CREATE SCHEMA IF NOT EXISTS api;
ALTER SCHEMA api OWNER TO :import_user;

GRANT USAGE ON SCHEMA api TO :app_user;

CREATE OR REPLACE VIEW api.routes AS
SELECT
    osm_id,
    name,
    network,
    route_type,
    symbol,
    distance,
    ascent,
    descent,
    roundtrip,
    length_m,
    tags,
    geom
FROM itinerarius.routes;

-- ---------------------------------------------------------------------------
-- Performance helpers (online dev mode)
--
-- The itinerary query is sensitive to expensive geometry operations.
-- We therefore add indexable geography columns and compute a single
-- representative LineString per route lazily via LATERAL (so PostgREST filters
-- like `route_osm_id=eq.<id>` only process that one route).
-- ---------------------------------------------------------------------------

-- 1) Amenities: add a geography column we can GiST-index for meter-based queries.
-- Use an expression index to avoid expensive table rewrites.
CREATE INDEX IF NOT EXISTS idx_amenities_geom_geog
    ON itinerarius.amenities
    USING GIST ((geom::geography));

-- Route-centric view of nearby amenities with linear referencing (km from start).
-- This is intended for online development/validation. Later, the same contract
-- can be served from a GeoPackage export.
DROP VIEW IF EXISTS api.route_amenities;
CREATE OR REPLACE VIEW api.route_amenities AS
SELECT DISTINCT ON (r.osm_id, a.osm_type, a.osm_id)
    r.osm_id AS route_osm_id,
    a.osm_type AS osm_type,
    a.osm_id,
    a.name,
    a.class,
    a.subclass,
    a.tags,
    ST_X(a.geom) AS lon,
    ST_Y(a.geom) AS lat,
    ST_Distance(a.geom::geography, rl.line_geog) AS distance_from_trail_m,
    (rl.prefix_km + (ST_LineLocatePoint(rl.line, a.geom) * rl.seg_length_km)) AS trail_km
FROM itinerarius.routes r
CROSS JOIN LATERAL (
    WITH bbox AS (
        SELECT
            ST_XMin(r.geom) AS xmin,
            ST_YMin(r.geom) AS ymin,
            ST_XMax(r.geom) AS xmax,
            ST_YMax(r.geom) AS ymax
    ),
    segs AS (
        SELECT
            d.geom AS line,
            (d.geom::geography) AS line_geog,
            (ST_Length(d.geom::geography) / 1000.0) AS seg_length_km,
            ST_X(ST_Centroid(d.geom)) AS cx,
            ST_Y(ST_Centroid(d.geom)) AS cy
        FROM ST_Dump(ST_LineMerge(r.geom)) AS d
    ),
    ordered AS (
        SELECT
            x.line,
            x.line_geog,
            x.seg_length_km,
            (
                SUM(x.seg_length_km) OVER (ORDER BY x.proj) - x.seg_length_km
            ) AS prefix_km
        FROM (
            SELECT
                s.*, 
                CASE
                    WHEN ((b.xmax - b.xmin) * (b.xmax - b.xmin) + (b.ymax - b.ymin) * (b.ymax - b.ymin)) = 0 THEN 0
                    ELSE (
                        ((s.cx - b.xmin) * (b.xmax - b.xmin) + (s.cy - b.ymin) * (b.ymax - b.ymin))
                        / ((b.xmax - b.xmin) * (b.xmax - b.xmin) + (b.ymax - b.ymin) * (b.ymax - b.ymin))
                    )
                END AS proj
            FROM segs s
            CROSS JOIN bbox b
        ) AS x
    )
    SELECT
        o.line,
        o.line_geog,
        o.seg_length_km,
        o.prefix_km
    FROM ordered o
) AS rl
JOIN itinerarius.amenities a
    ON ST_DWithin(a.geom::geography, rl.line_geog, 1000)
ORDER BY
    r.osm_id,
    a.osm_type,
    a.osm_id,
    ST_Distance(a.geom::geography, rl.line_geog) ASC;

GRANT SELECT ON api.routes TO :app_user;
GRANT SELECT ON api.route_amenities TO :app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE :import_user IN SCHEMA api GRANT SELECT ON TABLES TO :app_user;
