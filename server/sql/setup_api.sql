\set import_user :IMPORTER_USER
\set app_user :APP_USER

CREATE SCHEMA IF NOT EXISTS api;
ALTER SCHEMA api OWNER TO :import_user;

GRANT USAGE ON SCHEMA api TO :app_user;

CREATE OR REPLACE VIEW api.routes AS
SELECT
    r.osm_id,
    r.name,
    r.network,
    r.route_type,
    r.symbol,
    r.distance,
    r.ascent,
    r.descent,
    r.roundtrip,
    r.length_m,
    r.tags,
    r.geom,
    ri.merged_geom_type,
    ri.geom_build_case,
    ri.geom_quality,
    ri.geom_parts
FROM itinerarius.routes r
LEFT JOIN itinerarius.route_info ri ON r.osm_id = ri.route_id;

-- Route-centric view of nearby amenities with linear referencing (km from start).
DROP VIEW IF EXISTS api.route_amenities;
CREATE OR REPLACE VIEW api.route_amenities AS
SELECT DISTINCT ON (r.osm_id, a.osm_type, a.osm_id)
    r.osm_id AS route_osm_id,
    a.osm_type AS osm_type,
    a.osm_id,
    a.name,
    a.class AS class,
    a.subclass,
    a.tags,
    ST_X(a.geom) AS lon,
    ST_Y(a.geom) AS lat,
    d.dist_m AS distance_from_trail_m,
    (ST_LineLocatePoint(rl.line, a.geom) * rl.seg_length_km) AS trail_km
FROM itinerarius.routes r
CROSS JOIN LATERAL (
    SELECT
        r.geom AS line,
        (r.geom::geography) AS line_geog,
        (ST_Length(r.geom::geography) / 1000.0) AS seg_length_km
) AS rl
JOIN itinerarius.amenities a
    ON ST_DWithin(a.geom::geography, rl.line_geog, 1000)
CROSS JOIN LATERAL (
    SELECT ST_Distance(a.geom::geography, rl.line_geog) AS dist_m
) AS d
ORDER BY
    r.osm_id,
    a.osm_type,
    a.osm_id,
    d.dist_m ASC;

GRANT SELECT ON api.routes TO :app_user;
GRANT SELECT ON api.route_amenities TO :app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE :import_user IN SCHEMA api GRANT SELECT ON TABLES TO :app_user;
