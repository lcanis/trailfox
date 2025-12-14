-- Busted spec for amenities classification + insertion

describe("amenities_module", function()
  local orig_osm2pgsql
  local amenities
  local table_inserts

  before_each(function()
    -- Keep specs independent: clear captured inserts before each test.
    table_inserts = {}
  end)

  local function require_fresh(name)
    package.loaded[name] = nil
    return require(name)
  end

  setup(function()
    orig_osm2pgsql = _G.osm2pgsql

    table_inserts = {}

    _G.osm2pgsql = {
      define_table = function(def)
        local t = { _def = def, _rows = {} }
        t.insert = function(_, row)
          table.insert(t._rows, row)
          table.insert(table_inserts, { def = def, row = row })
        end
        return t
      end,
    }

    amenities = require_fresh("amenities_module")
  end)

  teardown(function()
    package.loaded["amenities_module"] = nil
    _G.osm2pgsql = orig_osm2pgsql
  end)

  it("imports place=* nodes as class Place", function()
    local obj = {
      tags = { place = "town", name = "Townsville" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj)

    assert.are.equal(1, #table_inserts)
    assert.are.equal("place", table_inserts[1].row.class)
    assert.are.equal("town", table_inserts[1].row.subclass)
    assert.are.equal("Townsville", table_inserts[1].row.name)
    assert.are.equal("POINT", table_inserts[1].row.geom)
  end)

  it("does not import unsupported place=* values", function()
    local obj = {
      tags = { place = "suburb", name = "Suburbia" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj)

    assert.are.equal(0, #table_inserts)
  end)

  it("imports tourism=hotel as Accommodation", function()
    local obj = {
      tags = { tourism = "hotel", name = "Hotel" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj)

    assert.are.equal(1, #table_inserts)
    assert.are.equal("accom", table_inserts[1].row.class)
    assert.are.equal("hotel", table_inserts[1].row.subclass)
  end)

  it("guest_house=albergue forces Accommodation/guest_house", function()
    local obj = {
      tags = { guest_house = "albergue", amenity = "restaurant" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj)

    assert.are.equal(1, #table_inserts)
    assert.are.equal("accom", table_inserts[1].row.class)
    assert.are.equal("guest_house", table_inserts[1].row.subclass)
  end)

  it("vending_machine is excluded when vending has no allowed items", function()
    local obj = {
      tags = { amenity = "vending_machine", vending = "excrement_bags" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj)

    assert.are.equal(0, #table_inserts)
  end)

  it("vending_machine is included when vending has allowed items", function()
    local obj = {
      tags = { amenity = "vending_machine", vending = "excrement_bags;drinks" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj)

    assert.are.equal(1, #table_inserts)
    assert.are.equal("resupply", table_inserts[1].row.class)
    assert.are.equal("vending_machine", table_inserts[1].row.subclass)
  end)

  it("tourism=information + information=guidepost is included", function()
    local obj = {
      tags = { tourism = "information", information = "guidepost" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj)

    assert.are.equal(1, #table_inserts)
    assert.are.equal("other", table_inserts[1].row.class)
    assert.are.equal("information", table_inserts[1].row.subclass)
  end)

  it("wilderness_hut with access=private is excluded", function()
    local obj = {
      tags = { tourism = "wilderness_hut", access = "private" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj)

    assert.are.equal(0, #table_inserts)
  end)

  it("charging_station is included only with bicycle=yes", function()
    local obj_no = {
      tags = { amenity = "charging_station" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj_no)
    assert.are.equal(0, #table_inserts)

    local obj_yes = {
      tags = { amenity = "charging_station", bicycle = "yes" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj_yes)
    assert.are.equal(1, #table_inserts)
    assert.are.equal("bike", table_inserts[1].row.class)
    assert.are.equal("charging_station", table_inserts[1].row.subclass)
  end)

  it("uses deterministic tag preference: tourism beats amenity", function()
    local obj = {
      tags = { tourism = "hotel", amenity = "restaurant" },
      as_point = function() return "POINT" end,
    }

    amenities.process_node(obj)

    assert.are.equal(1, #table_inserts)
    assert.are.equal("accom", table_inserts[1].row.class)
    assert.are.equal("hotel", table_inserts[1].row.subclass)
  end)

  it("process_way imports only closed buildings", function()
    local obj_open = {
      is_closed = false,
      tags = { amenity = "toilets" },
      as_polygon = function()
        return { centroid = function() return "CENTROID" end }
      end,
    }

    amenities.process_way(obj_open)
    assert.are.equal(0, #table_inserts)

    local obj_closed_no_building = {
      is_closed = true,
      tags = { amenity = "toilets" },
      as_polygon = function()
        return { centroid = function() return "CENTROID" end }
      end,
    }

    amenities.process_way(obj_closed_no_building)
    assert.are.equal(0, #table_inserts)

    local obj_closed_building = {
      is_closed = true,
      tags = { building = "yes", amenity = "toilets" },
      as_polygon = function()
        return { centroid = function() return "CENTROID" end }
      end,
    }

    amenities.process_way(obj_closed_building)
    assert.are.equal(1, #table_inserts)
    assert.are.equal("hygiene", table_inserts[1].row.class)
    assert.are.equal("toilets", table_inserts[1].row.subclass)
    assert.are.equal("CENTROID", table_inserts[1].row.geom)
  end)
end)
