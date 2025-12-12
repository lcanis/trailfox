-- ============================================================================
-- Routes Module for Itinerarius
-- ============================================================================

local module = {}

-- ----------------------------------------------------------------------------
-- Table Definition
-- ----------------------------------------------------------------------------
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
		{ column = "geom", type = "multilinestring", projection = 4326 },
	},
})

-- ----------------------------------------------------------------------------
-- Helper Functions
-- ----------------------------------------------------------------------------

local function contains_value(str, value)
	if not str then
		return false
	end

	str = str:lower()
	value = value:lower()

	if str == value then
		return true
	end

	for part in str:gmatch("[^;]+") do
		if part:match("^%s*(.-)%s*$") == value then
			return true
		end
	end

	return false
end

local function get_route_type(route_tag)
	if not route_tag then
		return nil
	end

	if contains_value(route_tag, "hiking") then
		return "hiking"
	elseif contains_value(route_tag, "walking") then
		return "walking"
	elseif contains_value(route_tag, "foot") then
		return "foot"
	end

	return nil
end

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

local function get_intnames(tags)
	local intnames = {}

	for key, value in pairs(tags) do
		local lang = key:match("^name:(.+)$")
		if lang then
			intnames[lang] = value
		end
	end

	if next(intnames) == nil then
		return nil
	end

	return intnames
end

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

local function parse_numeric(value)
	if not value then
		return nil
	end

	value = tostring(value)

	value = value:gsub("%s+", "")
	value = value:gsub("km", "")
	value = value:gsub("m", "")
	value = value:gsub("mi", "")
	value = value:gsub(",", ".")

	local num = value:match("^([%d%.]+)")
	if num then
		return tonumber(num)
	end

	return nil
end

local function process_route(object)
	local is_valid, route_type = is_valid_route(object.tags)
	if not is_valid then
		return
	end

	local geom = object:as_multilinestring()

	-- Skip routes with invalid or empty geometry
	-- This filters out:
	-- - Superroutes that contain only relation members (no direct ways)
	-- - Broken relations with only node members or no members
	-- See: https://wiki.openstreetmap.org/wiki/Relation:route#Hierarchies
	if not geom or geom:is_null() then
		return
	end

	local route_data = {
		name = object.tags.name,
		network = object.tags.network,
		route_type = route_type,
		type = object.tags.type,
		symbol = object.tags["osmc:symbol"],
		distance = parse_numeric(object.tags["route:distance"] or object.tags.distance),
		ascent = parse_numeric(object.tags["route:ascent"] or object.tags.ascent),
		descent = parse_numeric(object.tags["route:descent"] or object.tags.descent),
		roundtrip = parse_boolean(object.tags.roundtrip),
		-- operator, website, wikidata, wikipedia, names and localized names
		-- are available under the `tags` JSONB column; avoid duplicating them
		-- as separate DB columns and extract them from `tags` when needed.
		tags = object.tags,
		geom = geom,
	}

	routes:insert(route_data)
end

-- ----------------------------------------------------------------------------
-- Public API
-- ----------------------------------------------------------------------------

function module.process_relation(object)
	process_route(object)
end

return module
