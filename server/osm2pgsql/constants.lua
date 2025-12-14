-- Centralized constants for osm2pgsql Lua modules
local M = {}

-- Use EPSG:4326 (WGS84) as the default geometry projection across modules to make
-- GeoJSON/GPX exports straightforward and consistent. This prevents
-- accidental reprojection differences when exporting or comparing
-- geometry between tables.
-- However we need to transform when serving tiles with Martin.
M.GEOMETRY_PROJECTION = 4326

return M
