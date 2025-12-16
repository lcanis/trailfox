\set import_user :IMPORTER_USER
\set app_user :APP_USER

CREATE SCHEMA IF NOT EXISTS api;
ALTER SCHEMA api OWNER TO :import_user;

GRANT USAGE ON SCHEMA api TO :app_user;

-- Safe wrapper for ST_LineLocatePoint that returns NULL if the provided line isn't a LINESTRING.
CREATE OR REPLACE FUNCTION api.safe_line_locate_point(line geometry, pt geometry)
RETURNS double precision AS $$
BEGIN
    IF line IS NULL OR GeometryType(line) <> 'LINESTRING' THEN
        RETURN NULL;
    END IF;
    RETURN ST_LineLocatePoint(line, pt);
END;
$$ LANGUAGE plpgsql STABLE;

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

-- Return routes ordered by distance to a given lon/lat.
-- This avoids client-side "centers" (which can be misleading for long routes)
-- and lets PostGIS use spatial indexes for ordering.
CREATE OR REPLACE FUNCTION api.routes_by_distance(lon double precision, lat double precision)
RETURNS TABLE (
    osm_id bigint,
    name text,
    network text,
    route_type text,
    symbol text,
    distance numeric,
    ascent numeric,
    descent numeric,
    roundtrip boolean,
    length_m numeric,
    tags jsonb,
    geom geometry,
    merged_geom_type text,
    geom_build_case text,
    geom_quality text,
    geom_parts integer,
    distance_m double precision
) AS $$
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
      ri.geom_parts,
      ST_Distance(r.geom::geography, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) AS distance_m
  FROM itinerarius.routes r
  LEFT JOIN itinerarius.route_info ri ON r.osm_id = ri.route_id
  ORDER BY
      -- Fast index-assisted ordering (approximate meters in WebMercator)
      r.geom_3857 <-> ST_Transform(ST_SetSRID(ST_MakePoint(lon, lat), 4326), 3857);
$$ LANGUAGE sql STABLE;

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
    (api.safe_line_locate_point(r.geom, a.geom) * (r.length_m / 1000.0)) AS trail_km
FROM itinerarius.routes r
JOIN itinerarius.amenities a
    ON ST_DWithin(a.geom::geography, r.geom::geography, 1000)
CROSS JOIN LATERAL (
    SELECT ST_Distance(a.geom::geography, r.geom::geography) AS dist_m
) AS d
ORDER BY
    r.osm_id,
    a.osm_type,
    a.osm_id,
    d.dist_m ASC;

GRANT SELECT ON api.routes TO :app_user;
GRANT EXECUTE ON FUNCTION api.routes_by_distance(double precision, double precision) TO :app_user;
GRANT SELECT ON api.route_amenities TO :app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE :import_user IN SCHEMA api GRANT SELECT ON TABLES TO :app_user;
