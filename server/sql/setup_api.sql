
-- main route-centric view
DROP VIEW IF EXISTS api.routes CASCADE;
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
    ST_Transform(r.geom, 4326) AS geom,
    r.merged_geom_type,
    r.geom_build_case,
    r.geom_quality,
    r.geom_parts
FROM itinerarius.routes_info r;

-- Return routes ordered by distance to a given lon/lat, i.e. which routes are closest to that point.
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
      ST_Transform(r.geom, 4326) AS geom,
      r.merged_geom_type,
      r.geom_build_case,
      r.geom_quality,
      r.geom_parts,
      ST_Distance(r.geom::geography, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) AS distance_m
  FROM itinerarius.routes_info r
  ORDER BY
      -- Fast index-assisted ordering using 3857
      r.geom <-> ST_Transform(ST_SetSRID(ST_MakePoint(lon, lat), 4326), 3857);
$$ LANGUAGE sql STABLE;

-- Return routes within a bounding box
CREATE OR REPLACE FUNCTION api.routes_in_bbox(
    min_lon double precision, 
    min_lat double precision, 
    max_lon double precision, 
    max_lat double precision,
    search_query text DEFAULT NULL
)
RETURNS SETOF api.routes AS $$
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
      ST_Transform(r.geom, 4326) AS geom,
      r.merged_geom_type,
      r.geom_build_case,
      r.geom_quality,
      r.geom_parts
  FROM itinerarius.routes_info r
  WHERE r.geom && ST_Transform(ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326), 3857)
  AND (
      search_query IS NULL 
      OR search_query = '' 
      OR name ILIKE '%' || search_query || '%' 
  );
$$ LANGUAGE sql STABLE;

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

-- Route amenities: view of amenities located near routes, with distance along route.
-- amenities should be within 1km of the route (roughly)
-- should be ordered by trail-km
-- needs to be very aggressively optimized for performance : suitable simplification, subdivision, corridor buffers, few transforms, etc.
-- amenities taken from itinerarius.amenities (using functional index on 3857 for speed)
DO $$ BEGIN RAISE NOTICE 'Creating API helpers...'; END $$;

-- subdivided version of routes_info 
DROP TABLE IF EXISTS itinerarius.routes_subdivide CASCADE;

CREATE TABLE IF NOT EXISTS itinerarius.routes_subdivide AS
WITH segments AS (
    SELECT 
        osm_id,
        ST_Subdivide(geom, 255) AS seg_m
    FROM itinerarius.routes_info
    WHERE geom IS NOT NULL
)
SELECT
    osm_id,
    seg_m AS geom_m,
    ST_Transform(seg_m, 3857) AS geom_3857
FROM segments;

ALTER TABLE itinerarius.routes_subdivide ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;

CREATE INDEX IF NOT EXISTS idx_routes_subdivide_osm_id ON itinerarius.routes_subdivide (osm_id);
CREATE INDEX IF NOT EXISTS idx_routes_subdivide_geom ON itinerarius.routes_subdivide USING GIST (geom_3857);
ANALYZE itinerarius.routes_subdivide;

GRANT USAGE ON SCHEMA api TO calixtinus;
GRANT USAGE ON SCHEMA itinerarius TO calixtinus;

-- Route amenities view
DROP VIEW IF EXISTS api.route_amenities CASCADE;

CREATE VIEW api.route_amenities AS
WITH candidates_all AS (
    -- Find amenities within 1km of the route using subdivided geometries for speed
    -- Using 3857 for ST_DWithin is faster than geography
    SELECT
        r.osm_id AS route_id,
        r.id AS segment_id,
        a.osm_id AS amenity_id,
        a.osm_type AS amenity_type,
        ST_Distance(r.geom_3857, a.geom) as dist_from_route_m
    FROM itinerarius.routes_subdivide r
    JOIN itinerarius.amenities a
      ON ST_DWithin(r.geom_3857, a.geom, 1000)
),
candidates AS (
    -- Pick the closest segment for each amenity
    SELECT DISTINCT ON (route_id, amenity_id, amenity_type)
        route_id, amenity_id, amenity_type, dist_from_route_m, segment_id
    FROM candidates_all
    ORDER BY route_id, amenity_id, amenity_type, dist_from_route_m ASC
)
SELECT
    c.route_id AS route_osm_id,
    c.amenity_type AS osm_type,
    c.amenity_id AS osm_id,
    a.name,
    a.class,
    a.subclass,
    ST_X(ST_Transform(a.geom, 4326)) AS lon,
    ST_Y(ST_Transform(a.geom, 4326)) AS lat,
    c.dist_from_route_m AS distance_from_trail_m,
    ST_M(ST_LineInterpolatePoint(r.geom_m, ST_LineLocatePoint(r.geom_m, a.geom))) / 1000.0 AS trail_km,
    a.tags
FROM candidates c
CROSS JOIN LATERAL (
    SELECT * FROM itinerarius.amenities a 
    WHERE c.amenity_id = a.osm_id AND c.amenity_type = a.osm_type
    OFFSET 0
) a
CROSS JOIN LATERAL (
    SELECT * FROM itinerarius.routes_subdivide r
    WHERE c.segment_id = r.id
    OFFSET 0
) r
ORDER BY c.route_id, trail_km;
ANALYZE api.route_amenities;
GRANT SELECT ON api.routes TO calixtinus;
GRANT EXECUTE ON FUNCTION api.routes_by_distance(double precision, double precision) TO calixtinus;
GRANT EXECUTE ON FUNCTION api.routes_in_bbox(double precision, double precision, double precision, double precision, text) TO calixtinus;
GRANT SELECT ON api.route_amenities TO calixtinus;

-- Reload PostgREST schema cache to pick up changes immediately
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
