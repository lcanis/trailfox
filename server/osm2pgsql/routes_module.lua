-- ============================================================================
-- Routes Module for Itinerarius
-- ============================================================================

local module = {}
local profiler = require("profiler")
local function maybe_wrap(fn, name)
	if profiler.enabled() then return profiler.wrap(fn, name) end
	return fn
end

-- ----------------------------------------------------------------------------
-- Table Definition
-- ----------------------------------------------------------------------------
local constants = require("constants")

local routes = osm2pgsql.define_table({
	schema = "itinerarius",
	name = "routes",
	ids = { type = "relation", id_column = "osm_id" },
	columns = {
		-- Minimal set of columns: keep only fields that we want as first-class DB columns
		-- All other attributes (ref, operator, website, wikidata, wikipedia, from/to names,
		-- and localized names) are available in the `tags` JSONB column and thus do not
		-- need to be materialized as separate columns.
		{ column = "name" },
		{ column = "network" },
		{ column = "route_type" },
		{ column = "type" },
		{ column = "symbol" },
		{ column = "distance", type = "real" },
		{ column = "ascent", type = "real" },
		{ column = "descent", type = "real" },
		{ column = "roundtrip", type = "boolean" },
		{ column = "tags", type = "jsonb" },
		{ column = "raw_geom", type = "multilinestring", projection = constants.GEOMETRY_PROJECTION },
	},
})

-- this is more lenient than OSM Wiki definitions, accepting
-- any route tag that includes hiking, walking, or foot
local function get_route_type(route_tag)
	if not route_tag then
		return nil
	end

	local s = route_tag:lower()
	if s:find("hiking") or s:find("walking") or s:find("foot") then
		return "hiking"
	end

	return nil
end
get_route_type = maybe_wrap(get_route_type, "get_route_type")

local function is_valid_route(tags)
	if tags.type ~= "route" and tags.type ~= "superroute" then
		return false
	end

	local route_type = get_route_type(tags.route)
	if not route_type then
		return false
	end

	return true, route_type
end
is_valid_route = maybe_wrap(is_valid_route, "is_valid_route")

local function parse_boolean(value)
	if not value then
		return nil
	end

	local v = value:lower()
	if v == "yes" or v == "true" or v == "1" then
		return true
	elseif v == "no" or v == "false" or v == "0" then
		return false
	end

	return nil
end

-- NOTE: Relation members are useful for building 'superroute' hierarchies
-- (e.g. multiplexes or `route=superroute`) but are not used for simple
-- rendering/visualization in the main import. We therefore do not store
-- `members` as a top-level column at this time. For future reference:
--  - `member.type` values are: 'node', 'way', 'relation'
--  - `member.ref` is the numeric OSM id of the member (integer)
--  - `member.role` is a relation-specific role string (stop, platform, forward, etc.)
-- You can re-add a `members` JSONB field if you later want to import and
-- index the relation graph for superroute resolution.

local function in_meters(value)
	if not value then
		return nil
	end

	local s = tostring(value):lower()
	s = s:gsub("%s+", "")

	local unit
	if s:match("km$") then
		unit = "km"
		s = s:gsub("km$", "")
	elseif s:match("mi$") then
		unit = "mi"
		s = s:gsub("mi$", "")
	elseif s:match("m$") then
		unit = "m"
		s = s:gsub("m$", "")
	end

	s = s:gsub(",", ".")
	local num = s:match("^([%d%.]+)")
	if not num then return nil end
	local n = tonumber(num)
	if not n then return nil end

	if unit == "km" then
		return n * 1000
	elseif unit == "mi" then
		return n * 1609.344
	else
		return n
	end
end
in_meters = maybe_wrap(in_meters, "in_meters")

local function process_relation(object)
	local tags = object.tags
	local is_route, route_type = is_valid_route(tags)
	if not is_route then
		return
	end

	-- Skip routes with invalid or empty geometry
	-- This filters out:
	-- - Superroutes that contain only relation members (no direct ways)
	-- - Broken relations with only node members or no members
	-- See: https://wiki.openstreetmap.org/wiki/Relation:route#Hierarchies
	-- NOTE: In osm2pgsql flex, `as_linestring()` is only valid in process_way.
	-- For relations we import as MultiLineString and line-merge later in SQL.
	local geom = object:as_multilinestring()
	if not geom or geom:is_null() then
		return nil
	end

	local route_data = {
		name = object.tags.name,
		network = object.tags.network,
		route_type = route_type,
		type = object.tags.type,
		-- parse frequently used route attributes, keep all in `tags`
		symbol = object.tags["osmc:symbol"],
		distance = in_meters(object.tags["route:distance"] or object.tags.distance),
		ascent = in_meters(object.tags["route:ascent"] or object.tags.ascent),
		descent = in_meters(object.tags["route:descent"] or object.tags.descent),
		roundtrip = parse_boolean(object.tags.roundtrip),
		tags = object.tags,
		raw_geom = geom,
	}

	routes:insert(route_data)
end
process_relation = maybe_wrap(process_relation, "process_relation")

module.process_relation = process_relation

-- Expose internal helpers for unit testing
module._get_route_type = get_route_type
module._is_valid_route = is_valid_route
module._in_meters = in_meters
return module
