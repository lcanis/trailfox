
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
RETURNS SETOF api.routes AS $$
  SELECT *
  FROM api.routes
  ORDER BY
      -- Spatial index-assisted ordering (K-Nearest Neighbor)
      geom <-> ST_Transform(ST_SetSRID(ST_MakePoint(lon, lat), 4326), 3857)
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
  WHERE geom && ST_Transform(ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326), 3857)
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

DROP TABLE IF EXISTS itinerarius.routes_subdivide CASCADE;
DROP TABLE IF EXISTS itinerarius.routes_subdivide CASCADE;
CREATE TABLE itinerarius.routes_subdivide AS
SELECT
    r.osm_id,
    -- Get the M-measure at the very first point of this subdivided part
    ST_M(ST_PointN(s.geom, 1)) as start_m,
    s.geom AS geom
FROM itinerarius.routes_info r
-- Subdivide into chunks of max 50 vertices for optimal indexing
CROSS JOIN LATERAL ST_Dump(ST_Subdivide(r.geom, 50)) AS s(geom)
WHERE r.geom IS NOT NULL;

-- 2. Create Indexes
-- Primary index for ID lookups
CREATE INDEX idx_rs_osm_id ON itinerarius.routes_subdivide (osm_id);
-- Spatial index for the DWithin join
CREATE INDEX idx_rs_geom ON itinerarius.routes_subdivide USING GIST (geom);

-- 3. Optimize Physical Storage
-- This sorts the data on disk by geography, making nearby segments 
-- live in the same CPU cache lines/RAM pages.
CLUSTER itinerarius.routes_subdivide USING idx_rs_geom;
ANALYZE itinerarius.routes_subdivide;


DROP VIEW IF EXISTS api.route_amenities;
CREATE OR REPLACE FUNCTION api.get_route_amenities(target_route_id bigint, search_radius_m integer DEFAULT 1000)
RETURNS TABLE (
    osm_id bigint,
    osm_type text,
    name text,
    class text,
    subclass text,
    lon double precision,
    lat double precision,
    distance_from_trail_m double precision,
    trail_km double precision,
    tags jsonb
) AS $$
BEGIN
    RETURN QUERY
    WITH found_amenities AS (
        -- Fast spatial join using only the specific route's segments
        SELECT DISTINCT ON (a.osm_id, a.osm_type)
            a.osm_id,
            a.osm_type,
            a.name,
            a.class,
            a.subclass,
            a.geom as amenity_geom,
            ST_Distance(rs.geom, a.geom) as dist_m,
            -- Local calculation: Start of segment + interpolation on segment
            (rs.start_m + ST_InterpolatePoint(rs.geom, a.geom)) / 1000.0 as t_km,
            a.tags
        FROM itinerarius.routes_subdivide rs
        JOIN itinerarius.amenities a ON ST_DWithin(rs.geom, a.geom, search_radius_m)
        WHERE rs.osm_id = target_route_id
        ORDER BY a.osm_id, a.osm_type, ST_Distance(rs.geom, a.geom)
    )
    SELECT 
        f.osm_id,
        f.osm_type,
        f.name,
        f.class,
        f.subclass,
        ST_X(ST_Transform(f.amenity_geom, 4326)) as lon,
        ST_Y(ST_Transform(f.amenity_geom, 4326)) as lat,
        f.dist_m,
        f.t_km,
        f.tags
    FROM found_amenities f
    ORDER BY f.t_km ASC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT USAGE ON SCHEMA api TO calixtinus;
GRANT USAGE ON SCHEMA itinerarius TO calixtinus;
GRANT SELECT ON api.routes TO calixtinus;
GRANT EXECUTE ON FUNCTION api.routes_by_distance(double precision, double precision) TO calixtinus;
GRANT EXECUTE ON FUNCTION api.routes_in_bbox(double precision, double precision, double precision, double precision, text) TO calixtinus;
GRANT EXECUTE ON FUNCTION api.get_route_amenities(bigint, integer) TO calixtinus;

-- Reload PostgREST schema cache to pick up changes immediately
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
