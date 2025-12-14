-- ============================================================================
-- Amenities Module for Itinerarius
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

local pois = osm2pgsql.define_table({
	schema = "itinerarius",
	name = "amenities",
	ids = { type = "any", type_column = "osm_type", id_column = "osm_id" },
	columns = {
		{ column = "name" },
		{ column = "class", not_null = true },
		{ column = "subclass" },
		{ column = "geom", type = "point", projection = constants.GEOMETRY_PROJECTION, not_null = true },
		{ column = "tags", type = "jsonb" },
	},
})

-- ----------------------------------------------------------------------------
-- Helper Functions
-- ----------------------------------------------------------------------------


local CATEGORY_CODE = {
	ACCOMMODATION = "accom",
	TOURIST_CULTURAL = "tourism",
	OTHER_HIKER_RELEVANT = "other",
	SHELTER = "shelter",
	FOOD_DRINK = "food",
	WATER = "water",
	HYGIENE = "hygiene",
	RESUPPLY_SHOPS = "resupply",
	BIKE_SPORTS = "bike",
	BANKING_CASH = "cash",
	TRANSPORTATION = "transport",
	STREET_FURNITURE = "street",
	MEDICAL = "medical",
	PLACE = "place",
}

-- Mapping of OSM tags to categories.
local CATEGORY_BY_TAG = {
	tourism = {
		hotel = CATEGORY_CODE.ACCOMMODATION,
		hostel = CATEGORY_CODE.ACCOMMODATION,
		guest_house = CATEGORY_CODE.ACCOMMODATION,
		alpine_hut = CATEGORY_CODE.ACCOMMODATION,
		camp_site = CATEGORY_CODE.ACCOMMODATION,
		caravan_site = CATEGORY_CODE.ACCOMMODATION,
		chalet = CATEGORY_CODE.ACCOMMODATION,
		wilderness_hut = CATEGORY_CODE.ACCOMMODATION,
		viewpoint = CATEGORY_CODE.TOURIST_CULTURAL,
		attraction = CATEGORY_CODE.TOURIST_CULTURAL,
		artwork = CATEGORY_CODE.TOURIST_CULTURAL,
		information = CATEGORY_CODE.OTHER_HIKER_RELEVANT,
	},
	amenity = {
		shelter = CATEGORY_CODE.SHELTER,
		restaurant = CATEGORY_CODE.FOOD_DRINK,
		fast_food = CATEGORY_CODE.FOOD_DRINK,
		cafe = CATEGORY_CODE.FOOD_DRINK,
		bar = CATEGORY_CODE.FOOD_DRINK,
		pub = CATEGORY_CODE.FOOD_DRINK,
		biergarten = CATEGORY_CODE.FOOD_DRINK,
		drinking_water = CATEGORY_CODE.WATER,
		fountain = CATEGORY_CODE.WATER,
		toilets = CATEGORY_CODE.HYGIENE,
		shower = CATEGORY_CODE.HYGIENE,
		public_bath = CATEGORY_CODE.HYGIENE,
		fuel = CATEGORY_CODE.RESUPPLY_SHOPS,
		vending_machine = CATEGORY_CODE.RESUPPLY_SHOPS,
		bicycle_parking = CATEGORY_CODE.BIKE_SPORTS,
		bicycle_repair_station = CATEGORY_CODE.BIKE_SPORTS,
		compressed_air = CATEGORY_CODE.BIKE_SPORTS,
		charging_station = CATEGORY_CODE.BIKE_SPORTS,
		bank = CATEGORY_CODE.BANKING_CASH,
		atm = CATEGORY_CODE.BANKING_CASH,
		bureau_de_change = CATEGORY_CODE.BANKING_CASH,
		bus_station = CATEGORY_CODE.TRANSPORTATION,
		bench = CATEGORY_CODE.STREET_FURNITURE,
		waste_basket = CATEGORY_CODE.STREET_FURNITURE,
		waste_disposal = CATEGORY_CODE.STREET_FURNITURE,
		lounger = CATEGORY_CODE.STREET_FURNITURE,
		picnic_table = CATEGORY_CODE.STREET_FURNITURE,
		pharmacy = CATEGORY_CODE.MEDICAL,
		hospital = CATEGORY_CODE.MEDICAL,
		clinic = CATEGORY_CODE.MEDICAL,
		doctors = CATEGORY_CODE.MEDICAL,
		dentist = CATEGORY_CODE.MEDICAL,
	},
	natural = {
		hot_spring = CATEGORY_CODE.HYGIENE,
	},
	leisure = {
		swimming_pool = CATEGORY_CODE.HYGIENE,
		picnic_table = CATEGORY_CODE.STREET_FURNITURE,
	},
	shop = {
		supermarket = CATEGORY_CODE.RESUPPLY_SHOPS,
		convenience = CATEGORY_CODE.RESUPPLY_SHOPS,
		general = CATEGORY_CODE.RESUPPLY_SHOPS,
		department_store = CATEGORY_CODE.RESUPPLY_SHOPS,
		greengrocer = CATEGORY_CODE.RESUPPLY_SHOPS,
		bakery = CATEGORY_CODE.RESUPPLY_SHOPS,
		butcher = CATEGORY_CODE.RESUPPLY_SHOPS,
		bicycle = CATEGORY_CODE.BIKE_SPORTS,
		sports = CATEGORY_CODE.BIKE_SPORTS,
	},
	aeroway = {
		aerodrome = CATEGORY_CODE.TRANSPORTATION,
		airport = CATEGORY_CODE.TRANSPORTATION,
	},
	railway = {
		station = CATEGORY_CODE.TRANSPORTATION,
		halt = CATEGORY_CODE.TRANSPORTATION,
	},
	highway = {
		bus_stop = CATEGORY_CODE.TRANSPORTATION,
	},
	historic = {
		monument = CATEGORY_CODE.TOURIST_CULTURAL,
		memorial = CATEGORY_CODE.TOURIST_CULTURAL,
	},
	emergency = {
		phone = CATEGORY_CODE.OTHER_HIKER_RELEVANT,
		defibrillator = CATEGORY_CODE.OTHER_HIKER_RELEVANT,
	},
}

-- Deterministic preference order when multiple tag families exist on a POI.
-- NOTE: Previously this loop used `pairs(tag_mapping)`, which is not ordered.
local TAG_FAMILY_PRIORITY = {
	"tourism",
	"amenity",
	"shop",
	"natural",
	"leisure",
	"aeroway",
	"railway",
	"highway",
	"historic",
	"emergency",
}

local VENDING_ALLOWLIST = {
	bicycle_tube = true,
	drinks = true,
	food = true,
	water = true,
	pizza = true,
	sweets = true,
	coffee = true,
	bread = true,
}

local PLACE_ALLOWLIST = {
	town = true,
	city = true,
	village = true,
	hamlet = true,
	isolated_dwelling = true,
	farm = true,
}


local function process_poi(object, geom)
	local tags = object.tags
	local a = {
		name = tags.name,
		geom = geom,
	}

	local cls, sub

	-- Special case: some amenities use a `guest_house` tag with value `albergue`
	-- (regional tagging). Prefer treating them as accommodation.
	if tags.guest_house and tags.guest_house == "albergue" then
		cls = CATEGORY_CODE.ACCOMMODATION
		sub = "guest_house"
	end

	-- Check all relevant tags in order of preference
	if not cls then
		for i = 1, #TAG_FAMILY_PRIORITY do
			local tag_key = TAG_FAMILY_PRIORITY[i]
			local tag_values = CATEGORY_BY_TAG[tag_key]
			local tag_value = tags[tag_key]
			if tag_value and tag_values[tag_value] then
				-- Special handling: exclude vending_machine with excrement_bags
				if tag_key == "amenity" and tag_value == "vending_machine" then
					-- vending inclusion list: if `vending` tag exists, require at least
					-- one allowed vending item; if `vending` is missing, accept the
					-- vending_machine entry (unknown contents may still be useful).
					local vend = tags.vending or ""
					if vend ~= "" then
						local keep = false
						for item in vend:gmatch("[^;]+") do
							item = item:match("^%s*(.-)%s*$")
							if VENDING_ALLOWLIST[item] then
								keep = true
								break
							end
						end
						if not keep then
							return
						end
					end
				end

				-- Note: we keep tourism=information guideposts (useful on trail).

				-- Special handling: exclude wilderness huts marked as private access
				if tag_key == "tourism" and tag_value == "wilderness_hut" then
					if tags.access and tags.access == "private" then
						return
					end
				end

				-- Special handling: include charging_station only when bicycle=yes
				if tag_key == "amenity" and tag_value == "charging_station" then
					if not tags.bicycle or tags.bicycle ~= "yes" then
						return
					end
				end

				cls = tag_values[tag_value]
				sub = tag_value
				break
			end
		end
	end

	if not cls then
		return
	end

	a.class = cls
	a.subclass = sub
	a.tags = tags

	pois:insert(a)
end
process_poi = maybe_wrap(process_poi, "process_poi")

-- ----------------------------------------------------------------------------
-- Public API
-- ----------------------------------------------------------------------------

function module.process_node(object)
	-- Import place=* nodes as itinerary-relevant "Place" POIs.
	-- Spec: class=Place, subclass=place value.
	if object.tags.place and PLACE_ALLOWLIST[object.tags.place] then
		pois:insert({
			name = object.tags.name,
			class = CATEGORY_CODE.PLACE,
			subclass = object.tags.place,
			geom = object:as_point(),
			tags = object.tags,
		})
		return
	end

	process_poi(object, object:as_point())
end
module.process_node = maybe_wrap(module.process_node, "process_node")

function module.process_way(object)
	if object.is_closed and object.tags.building then
		process_poi(object, object:as_polygon():centroid())
	end
end
module.process_way = maybe_wrap(module.process_way, "process_way")

return module
