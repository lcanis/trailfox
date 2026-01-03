
-- main route-centric view
DROP VIEW IF EXISTS api.routes CASCADE;
DROP FUNCTION IF EXISTS api.routes_by_distance(double precision, double precision) CASCADE;
DROP FUNCTION IF EXISTS api.routes_in_bbox(double precision, double precision, double precision, double precision, text) CASCADE;
DROP FUNCTION IF EXISTS api.safe_line_locate_point(geometry, geometry) CASCADE;
DROP FUNCTION IF EXISTS api.get_route_amenities(bigint, integer) CASCADE;
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
    r.geom_4326 AS geom,
    r.merged_geom_type,
    r.geom_build_case,
    r.geom_quality,
    r.geom_parts
FROM itinerarius.routes_info r;

-- Return routes ordered by distance to a given lon/lat, i.e. which routes are closest to that point.
CREATE OR REPLACE FUNCTION api.routes_by_distance(lon double precision, lat double precision)
RETURNS SETOF api.routes AS $$
  SELECT r.*
  FROM api.routes r
  JOIN itinerarius.routes_info ri ON r.osm_id = ri.osm_id
  ORDER BY
      -- Spatial index-assisted ordering (K-Nearest Neighbor)
      ri.geom <-> ST_Transform(ST_SetSRID(ST_MakePoint(lon, lat), 4326), 3857)
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
  SELECT r.*
  FROM api.routes r
  JOIN itinerarius.routes_info ri ON r.osm_id = ri.osm_id
  WHERE ri.geom && ST_Transform(ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326), 3857)
  AND (
      search_query IS NULL 
      OR search_query = '' 
      OR r.name ILIKE '%' || search_query || '%' 
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

-- So far, so easy. Now the hard part:
-- Route amenities: view of amenities located near routes, with distance along route.
-- amenities should be within 1km of the route (roughly)
-- should be ordered by trail-km
-- needs to be very aggressively optimized for performance : suitable simplification, subdivision, corridor buffers, few transforms, etc.
-- amenities taken from itinerarius.amenities
-- there are some benchmark queries in server/sql/samples/amenities_benchmark_*.sql
DO $$ BEGIN RAISE NOTICE 'Creating API helpers...'; END $$;

-- for a gentle introduction to linear referencing, see https://postgis.net/workshops/postgis-intro/linear_referencing.html

-- first, create a subdivided routes table for fast spatial joins
-- this is a standard technique for speeding up linear feature joins
-- but we also want to preserve M values for distance-along-route calculations
DROP TABLE IF EXISTS itinerarius.routes_subdivide CASCADE;
CREATE TABLE itinerarius.routes_subdivide AS
SELECT
	ri.osm_id,
    -- Exact measure at the start of the segment (meters).
    m.start_m as start_m,
    -- Measure-length of the segment (meters).
    (m.end_m - m.start_m) as seg_len_m,
    -- Segment geometry with M restored.
    ST_AddMeasure(m.geom_2d, m.start_m, m.end_m) AS geom
FROM itinerarius.ri ri
-- Work per-LineString part (ri.geom_m is MultiLineStringM)
CROSS JOIN LATERAL ST_Dump(ri.geom_m) AS p(part_path, part_geom)
-- Subdivide into chunks of max 200 vertices (fewer segments = fewer join probes)
CROSS JOIN LATERAL ST_Subdivide(p.part_geom, 200) AS s(sub_geom)
-- Ensure we always store LineString parts (not MultiLineString containers)
CROSS JOIN LATERAL ST_Dump(s.sub_geom) AS d(dump_path, dump_geom)
-- Compute measures once per segment
CROSS JOIN LATERAL (
    SELECT
        d.dump_geom AS geom_2d,
        ST_InterpolatePoint(p.part_geom, ST_StartPoint(d.dump_geom)) AS start_m,
        ST_InterpolatePoint(p.part_geom, ST_EndPoint(d.dump_geom)) AS end_m
) m
WHERE ri.geom_m IS NOT NULL
    AND GeometryType(p.part_geom) IN ('LINESTRING', 'LINESTRINGM')
    AND ST_M(ST_StartPoint(p.part_geom)) IS NOT NULL
    AND GeometryType(d.dump_geom) IN ('LINESTRING', 'LINESTRINGM');

-- 2. Create Indexes
-- Primary index for ID lookups
CREATE INDEX idx_rs_osm_id ON itinerarius.routes_subdivide (osm_id);
-- Spatial index for the DWithin join
CREATE INDEX idx_rs_geom ON itinerarius.routes_subdivide USING GIST (geom);

-- Spatial index on core table for fast initial filtering
CREATE INDEX IF NOT EXISTS idx_ri_geom_m ON itinerarius.ri USING GIST (geom_m);

-- 3. Optimize Physical Storage
-- This sorts the data (on disk) by geography
-- One would think that with modern storage this would not matter, but it does: live in the same CPU cache lines/RAM pages. 
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
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Increase work_mem for this session to avoid disk spills during large sorts
    PERFORM set_config('work_mem', '128MB', true);
    -- Disable JIT to avoid overhead on these types of queries (hmm, apparently yes)
    PERFORM set_config('jit', 'off', true);

    RETURN QUERY
    WITH route_envelope AS (
        -- Get the bounding box of the WHOLE trail + the radius
        -- This is a single, extremely fast index lookup
        SELECT ST_Expand(ST_Extent(rs.geom), search_radius_m) as bbox
        FROM itinerarius.routes_subdivide rs
        WHERE rs.osm_id = target_route_id
    ),
    nearby_amenities AS (
        -- Narrow the planet down to JUST the amenities near this trail
        SELECT a.osm_id, a.osm_type, a.geom
        FROM itinerarius.amenities a, route_envelope re
        WHERE a.geom && re.bbox
    ),
    nearest AS MATERIALIZED (
        SELECT DISTINCT ON (na.osm_id, na.osm_type)
            na.osm_id,
            na.osm_type,
            na.geom AS amenity_geom,
            ST_Distance(rs.geom, na.geom) AS dist_m,
            (ST_InterpolatePoint(rs.geom, na.geom) / 1000.0) AS t_km
        FROM itinerarius.routes_subdivide rs
        JOIN nearby_amenities na
            ON ST_DWithin(rs.geom, na.geom, search_radius_m)
        WHERE rs.osm_id = target_route_id
        ORDER BY na.osm_id, na.osm_type, ST_Distance(rs.geom, na.geom)
    ),
    nearest_sorted AS (
        -- Sort by trail-km BEFORE joining large metadata columns (tags, name, etc.)
        -- This keeps the sort buffer small and fast.
        SELECT * FROM nearest ORDER BY t_km ASC
    )
    SELECT
        n.osm_id,
        n.osm_type::text,
        a.name,
        a.class,
        a.subclass,
        ST_X(ST_Transform(n.amenity_geom, 4326)) AS lon,
        ST_Y(ST_Transform(n.amenity_geom, 4326)) AS lat,
        n.dist_m AS distance_from_trail_m,
        n.t_km AS trail_km,
        a.tags
    FROM nearest_sorted n
    JOIN itinerarius.amenities a
        ON a.osm_id = n.osm_id
        AND a.osm_type = n.osm_type;
END;
$$;

GRANT USAGE ON SCHEMA api TO calixtinus;
GRANT USAGE ON SCHEMA itinerarius TO calixtinus;
GRANT SELECT ON api.routes TO calixtinus;
GRANT EXECUTE ON FUNCTION api.routes_by_distance(double precision, double precision) TO calixtinus;
GRANT EXECUTE ON FUNCTION api.routes_in_bbox(double precision, double precision, double precision, double precision, text) TO calixtinus;
GRANT EXECUTE ON FUNCTION api.get_route_amenities(bigint, integer) TO calixtinus;

-- Reload PostgREST schema cache to pick up changes immediately
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
