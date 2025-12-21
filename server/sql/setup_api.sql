
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
    r.geom AS geom,
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
      r.geom,
      r.merged_geom_type,
      r.geom_build_case,
      r.geom_quality,
      r.geom_parts,
      ST_Distance(r.geom::geography, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) AS distance_m
  FROM itinerarius.routes_info r
  ORDER BY
      -- Fast index-assisted ordering (approximate meters in WebMercator)
      r.geom_3857 <-> ST_Transform(ST_SetSRID(ST_MakePoint(lon, lat), 4326), 3857);
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
  SELECT *
  FROM api.routes
  WHERE ST_Intersects(geom, ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326))
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

-- Index for faster 3857 lookups on amenities

-- subdivided version of routes_info 
DROP TABLE IF EXISTS routes_subdivide CASCADE;
CREATE TABLE routes_subdivide AS
SELECT 
    osm_id,
    (ST_DumpSegments(
        ST_Segmentize(
            ST_AddMeasure(g, 0, ST_Length(g)),
            1000
        )
    )).geom AS geom
FROM (SELECT osm_id, ST_Simplify(geom_3857, 100) as g FROM itinerarius.routes_info) sub;

CREATE INDEX IF NOT EXISTS idx_routes_subdivide_osm_id ON routes_subdivide (osm_id);
CREATE INDEX IF NOT EXISTS idx_routes_subdivide_geom ON routes_subdivide USING GIST (geom);

DROP VIEW IF EXISTS api.route_amenities;
CREATE OR REPLACE VIEW api.route_amenities AS
WITH candidates_all AS (
    -- Find amenities within 1km of the route using subdivided geometries for speed
    -- Using 3857 for ST_DWithin is faster than geography
    SELECT
        r.osm_id AS route_id,
        a.osm_id AS amenity_id,
        a.osm_type AS amenity_type,
        r.geom as segment_geom,
        -- Calculate distance here to pick the closest segment later
        ST_Distance(r.geom, a.geom) as dist_from_route_m,
        a.name, a.class, a.subclass, a.tags, a.geom
    FROM routes_subdivide r
    JOIN itinerarius.amenities a
      ON ST_DWithin(r.geom, a.geom, 1000)
),
candidates AS (
    -- Pick the closest segment for each amenity to get accurate M-value
    SELECT DISTINCT ON (route_id, amenity_id, amenity_type)
        route_id, amenity_id, amenity_type, segment_geom, dist_from_route_m,
        name, class, subclass, tags, geom
    FROM candidates_all
    ORDER BY route_id, amenity_id, amenity_type, dist_from_route_m ASC
)
SELECT
    c.route_id AS route_osm_id,
    c.amenity_type AS osm_type,
    c.amenity_id AS osm_id,
    c.name,
    c.class,
    c.subclass,
    ST_X(ST_Transform(c.geom, 4326)) AS lon,
    ST_Y(ST_Transform(c.geom, 4326)) AS lat,
    c.dist_from_route_m AS distance_from_trail_m,
    (m.m_val * (ri.length_m / NULLIF(ST_Length(ri.geom_3857), 0))) / 1000.0 AS trail_km,
    c.tags
FROM candidates c
CROSS JOIN LATERAL (SELECT c.geom AS geom_3857) p
CROSS JOIN LATERAL (SELECT ST_LineLocatePoint(c.segment_geom, p.geom_3857) as seg_frac) frac
CROSS JOIN LATERAL (SELECT ST_M(ST_LineInterpolatePoint(c.segment_geom, frac.seg_frac)) as m_val) m
JOIN itinerarius.routes_info ri 
  ON c.route_id = ri.osm_id
ORDER BY c.route_id, trail_km;

GRANT SELECT ON api.routes TO calixtinus;
GRANT EXECUTE ON FUNCTION api.routes_by_distance(double precision, double precision) TO calixtinus;
GRANT EXECUTE ON FUNCTION api.routes_in_bbox(double precision, double precision, double precision, double precision, text) TO calixtinus;
GRANT SELECT ON api.route_amenities TO calixtinus;

-- Reload PostgREST schema cache to pick up changes immediately
NOTIFY pgrst, 'reload config';
