-- Busted spec for in_meters

-- Provide a minimal mock for `osm2pgsql` so the module can be required outside osm2pgsql
_G.osm2pgsql = _G.osm2pgsql or {}
if not _G.osm2pgsql.define_table then
  _G.osm2pgsql.define_table = function(_) return { insert = function() end } end
end

local routes = require("routes_module")

describe("in_meters", function()
  it("parses km to meters", function()
    assert.are.equal(1000, routes._in_meters("1km"))
    assert.are.equal(1500, routes._in_meters("1.5 km"))
    assert.are.equal(1500, routes._in_meters("1,5km"))
  end)

  it("parses miles to meters", function()
    local v = routes._in_meters("1mi")
    -- 1 mi = 1609.344 m
    assert.is_true(math.abs(v - 1609.344) < 1e-6)
  end)

  it("parses plain meters and bare numbers", function()
    assert.are.equal(100, routes._in_meters("100m"))
    assert.are.equal(100, routes._in_meters("100"))
  end)

  it("returns nil for invalid values", function()
    assert.is_nil(routes._in_meters(nil))
    assert.is_nil(routes._in_meters("abc"))
  end)
end)
