local amenities = require("amenities_module")
local routes = require("routes_module")

-- ----------------------------------------------------------------------------
-- OSM2PGSQL Callbacks - Dispatch to appropriate modules
-- ----------------------------------------------------------------------------

function osm2pgsql.process_node(object)
	amenities.process_node(object)
end

function osm2pgsql.process_way(object)
	amenities.process_way(object)
end

function osm2pgsql.process_relation(object)
	amenities.process_relation(object)
	routes.process_relation(object)
end
