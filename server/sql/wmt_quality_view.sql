-- View combining original route metadata with WMT-processed geometry and quality checks
DROP VIEW IF EXISTS itinerarius.wmt_routes_view;

CREATE VIEW itinerarius.wmt_routes_view AS
WITH quality_calc AS (
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
        r.tags,
        r.raw_geom,
        w.geom AS wmt_geom,
        w.linear_state AS wmt_linear_state,
        ST_Length(ST_Transform(r.raw_geom, 3857)) AS raw_len_m,
        ST_Length(w.geom) AS wmt_len_m,
        GeometryType(w.geom) AS wmt_geom_type,
        ST_NumGeometries(w.geom) AS wmt_num_geometries
    FROM itinerarius.routes r
    JOIN itinerarius.routes_wmt w ON r.osm_id = w.osm_id
)
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
    tags,
    raw_geom,
    wmt_geom,
    wmt_linear_state,
    raw_len_m,
    wmt_len_m,
    wmt_geom_type,
    wmt_num_geometries,
    CASE
        WHEN raw_len_m > 0 AND (wmt_len_m / raw_len_m) < 0.80 THEN 'broken_short'
        WHEN raw_len_m > 0 AND (wmt_len_m / raw_len_m) > 1.20 THEN 'broken_long'
        WHEN wmt_geom_type = 'LINESTRING' THEN 'ok_linestring'
        WHEN wmt_geom_type = 'MULTILINESTRING' AND wmt_num_geometries >= 25 THEN 'fragmented_multiline'
        WHEN wmt_geom_type = 'MULTILINESTRING' THEN 'ok_multiline'
        ELSE 'other'
    END AS quality_check
FROM quality_calc;

-- Simple stats output (optional, can be run separately)
-- SELECT quality_check, count(*) FROM itinerarius.wmt_routes_view GROUP BY quality_check;
