SELECT osm_id,
       name,
       network,
       route_type,
       symbol,
       distance,
       ascent,
       descent,
       roundtrip,
       length_m,
       tags,
       geom,
       merged_geom_type,
       geom_build_case,
       geom_quality,
       geom_parts
FROM api.routes
LIMIT 1000;