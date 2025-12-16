-- Apply a simplified `api.routes` view (no psql variable substitutions)
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
  ORDER BY r.geom_3857 <-> ST_Transform(ST_SetSRID(ST_MakePoint(lon, lat), 4326), 3857);
$$ LANGUAGE sql STABLE;

GRANT SELECT ON api.routes TO PUBLIC;
GRANT EXECUTE ON FUNCTION api.routes_by_distance(double precision, double precision) TO PUBLIC;