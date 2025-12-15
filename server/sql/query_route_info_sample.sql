-- Quick sample of route_info
SELECT route_id, geom_quality, geom_parts
FROM itinerarius.route_info
ORDER BY route_id
LIMIT 10;