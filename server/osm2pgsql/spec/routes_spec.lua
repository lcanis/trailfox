-- Provide a minimal mock for `osm2pgsql` so the module can be required outside osm2pgsql
_G.osm2pgsql = _G.osm2pgsql or {}
if not _G.osm2pgsql.define_table then
  _G.osm2pgsql.define_table = function(_) return { insert = function() end } end
end

local routes = require("routes_module")

describe("get_route_type", function()
  it("returns nil for nil input", function()
    assert.is_nil(routes._get_route_type(nil))
  end)

  it("returns 'hiking' for 'hiking'", function()
    assert.are.equal("hiking", routes._get_route_type("hiking"))
  end)

  it("returns 'hiking' for 'walking'", function()
    assert.are.equal("hiking", routes._get_route_type("walking"))
  end)

  it("returns 'hiking' for 'foot'", function()
    assert.are.equal("hiking", routes._get_route_type("foot"))
  end)

  it("is case-insensitive and handles lists", function()
    assert.are.equal("hiking", routes._get_route_type("Hiking;mtb"))
    assert.are.equal("hiking", routes._get_route_type("MTB;walking;other"))
    assert.are.equal("hiking", routes._get_route_type("FOOT"))
  end)

  it("returns nil for unknown or missing values", function()
    assert.is_nil(routes._get_route_type("bicycling"))
    assert.is_nil(routes._get_route_type(nil))
  end)
end)


describe("is_valid_route", function()
  it("valid route returns true and route_type", function()
    local ok, t = routes._is_valid_route({ type = "route", route = "hiking" })
    assert.is_true(ok)
    assert.are.equal("hiking", t)
  end)

  it("superroute valid with walking", function()
    local ok, t = routes._is_valid_route({ type = "superroute", route = "MTB;walking;other" })
    assert.is_true(ok)
    assert.are.equal("hiking", t)
  end)

  it("invalid when type isn't route/superroute", function()
    local ok = routes._is_valid_route({ type = "not_a_route", route = "hiking" })
    assert.is_false(ok)
  end)

  it("invalid when route tag doesn't specify hiking/walking/foot", function()
    local ok = routes._is_valid_route({ type = "route", route = "bicycling" })
    assert.is_false(ok)
  end)
end)
