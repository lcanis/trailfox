-- Add geom_parts column if missing and populate geom_parts + geom_quality
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'itinerarius' AND table_name = 'route_info' AND column_name = 'geom_parts'
    ) THEN
        ALTER TABLE itinerarius.route_info ADD COLUMN geom_parts integer;
    END IF;
END
$$;

-- Populate values from itinerarius.routes
UPDATE itinerarius.route_info ri
SET geom_parts = ST_NumGeometries(r.geom),
    geom_quality = CASE
        WHEN GeometryType(r.geom) = 'LINESTRING' THEN 'ok_singleline'
        WHEN GeometryType(r.geom) = 'MULTILINESTRING' THEN concat(ST_NumGeometries(r.geom)::text, ' parts')
        ELSE 'other'
    END
FROM itinerarius.routes r
WHERE ri.route_id = r.osm_id;

-- Show sample
SELECT route_id, geom_quality, geom_parts FROM itinerarius.route_info ORDER BY route_id LIMIT 10;
