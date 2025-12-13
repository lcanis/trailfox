-- ============================================================================
-- Amenities Module for Itinerarius
-- ============================================================================

local module = {}

-- ----------------------------------------------------------------------------
-- Table Definition
-- ----------------------------------------------------------------------------
local pois = osm2pgsql.define_table({
	schema = "itinerarius",
	name = "amenities",
	ids = { type = "any", type_column = "osm_type", id_column = "osm_id" },
	columns = {
		{ column = "name" },
		{ column = "class", not_null = true },
		{ column = "subclass" },
		-- Store amenities as WGS84 (EPSG:4326) to match `routes` and to make
		-- GeoJSON/GPX exports straightforward and consistent. This prevents
		-- accidental reprojection differences when exporting or comparing
		-- geometry between tables.
		{ column = "geom", type = "point", projection = 4326, not_null = true },
		{ column = "tags", type = "jsonb" },
	},
})

-- ----------------------------------------------------------------------------
-- Helper Functions
-- ----------------------------------------------------------------------------

-- Mapping of OSM tags to amenities.md categories
local tag_mapping = {
	tourism = {
		hotel = "Accommodation",
		hostel = "Accommodation",
		guest_house = "Accommodation",
		alpine_hut = "Accommodation",
		camp_site = "Accommodation",
		caravan_site = "Accommodation",
		chalet = "Accommodation",
		wilderness_hut = "Accommodation",
		viewpoint = "Tourist / Cultural Points",
		attraction = "Tourist / Cultural Points",
		artwork = "Tourist / Cultural Points",
		information = "Other Hiker-Relevant",
	},
	amenity = {
		shelter = "Shelter",
		restaurant = "Food/Drink",
		fast_food = "Food/Drink",
		cafe = "Food/Drink",
		bar = "Food/Drink",
		pub = "Food/Drink",
		biergarten = "Food/Drink",
		drinking_water = "Water",
		fountain = "Water",
		toilets = "Hygiene",
		shower = "Hygiene",
		public_bath = "Hygiene",
		fuel = "Resupply (Shops)",
		vending_machine = "Resupply (Shops)",
		bicycle_parking = "Bike / Sports",
		bicycle_repair_station = "Bike / Sports",
		compressed_air = "Bike / Sports",
		charging_station = "Bike / Sports",
		bank = "Banking/Cash",
		atm = "Banking/Cash",
		bureau_de_change = "Banking/Cash",
		bus_station = "Transportation",
		bench = "Street Furniture / Small Amenities",
		waste_basket = "Street Furniture / Small Amenities",
		waste_disposal = "Street Furniture / Small Amenities",
		lounger = "Street Furniture / Small Amenities",
		picnic_table = "Street Furniture / Small Amenities",
		pharmacy = "Medical",
		hospital = "Medical",
		clinic = "Medical",
		doctors = "Medical",
		dentist = "Medical",
	},
	natural = {
		hot_spring = "Hygiene",
	},
	leisure = {
		swimming_pool = "Hygiene",
		picnic_table = "Street Furniture / Small Amenities",
	},
	shop = {
		supermarket = "Resupply (Shops)",
		convenience = "Resupply (Shops)",
		general = "Resupply (Shops)",
		department_store = "Resupply (Shops)",
		greengrocer = "Resupply (Shops)",
		bakery = "Resupply (Shops)",
		butcher = "Resupply (Shops)",
		bicycle = "Bike / Sports",
		sports = "Bike / Sports",
	},
	aeroway = {
		aerodrome = "Transportation",
		airport = "Transportation",
	},
	railway = {
		station = "Transportation",
		halt = "Transportation",
	},
	highway = {
		bus_stop = "Transportation",
	},
	historic = {
		monument = "Tourist / Cultural Points",
		memorial = "Tourist / Cultural Points",
	},
	emergency = {
		phone = "Other Hiker-Relevant",
		defibrillator = "Other Hiker-Relevant",
	},
}

local allowed_vendings = {
	bicycle_tube = true,
	drinks = true,
	food = true,
	water = true,
	pizza = true,
	sweets = true,
	coffee = true,
	bread = true,
}

local allowed_places = {
	town = true,
	city = true,
	village = true,
	hamlet = true,
	isolated_dwelling = true,
	farm = true,
}

local function process_poi(object, geom)
	local a = {
		name = object.tags.name,
		geom = geom,
	}

	local cls, sub

	-- Special case: some amenities use a `guest_house` tag with value `albergue`
	-- (regional tagging). Prefer treating them as accommodation.
	if object.tags.guest_house and object.tags.guest_house == "albergue" then
		cls = "Accommodation"
		sub = "guest_house"
	end

	-- Check all relevant tags in order of preference
	for tag_key, tag_values in pairs(tag_mapping) do
		if object.tags[tag_key] and tag_values[object.tags[tag_key]] then
			-- Special handling: exclude vending_machine with excrement_bags
			if tag_key == "amenity" and object.tags.amenity == "vending_machine" then
				-- vending inclusion list: if `vending` tag exists, require at least
				-- one allowed vending item; if `vending` is missing, accept the
				-- vending_machine entry (unknown contents may still be useful).
				local vend = object.tags.vending or ""
				if vend ~= "" then
					local keep = false
					for item in vend:gmatch("[^;]+") do
						item = item:match("^%s*(.-)%s*$")
						if allowed_vendings[item] then
							keep = true
							break
						end
					end
					if not keep then
						return
					end
				end
			end

			-- Special handling: exclude tourism=information guideposts
			if tag_key == "tourism" and object.tags.tourism == "information" then
				if object.tags.information == "guidepost" then
					return
				end
			end

			-- Special handling: exclude wilderness huts marked as private access
			if tag_key == "tourism" and object.tags.tourism == "wilderness_hut" then
				if object.tags.access and object.tags.access == "private" then
					return
				end
			end

			-- Special handling: include charging_station only when bicycle=yes
			if tag_key == "amenity" and object.tags.amenity == "charging_station" then
				if not object.tags.bicycle or object.tags.bicycle ~= "yes" then
					return
				end
			end

			cls = tag_values[object.tags[tag_key]]
			sub = object.tags[tag_key]
			break
		end
	end

	if not cls then
		return
	end

	a.class = cls
	a.subclass = sub
	a.tags = object.tags

	pois:insert(a)
end

-- ----------------------------------------------------------------------------
-- Public API
-- ----------------------------------------------------------------------------

function module.process_node(object)
	-- Import place=* nodes as itinerary-relevant "Place" POIs.
	-- Spec: class=Place, subclass=place value.
	if object.tags.place and allowed_places[object.tags.place] then
		pois:insert({
			name = object.tags.name,
			class = "Place",
			subclass = object.tags.place,
			geom = object:as_point(),
			tags = object.tags,
		})
		return
	end

	process_poi(object, object:as_point())
end

function module.process_way(object)
	if object.is_closed and object.tags.building then
		process_poi(object, object:as_polygon():centroid())
	end
end

return module
