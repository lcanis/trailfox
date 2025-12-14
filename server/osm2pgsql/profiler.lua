-- Lightweight sampling-free function profiler for osm2pgsql Lua modules
-- Enable by setting environment variable LUA_PROFILING=1

local M = {}
local _unpack = table.unpack or unpack
M._data = {}
M._hits = 0

function M.enabled()
  return os.getenv("LUA_PROFILING") == "1"
end

function M.wrap(fn, label)
  return function(...)
    local s = os.clock()
    local results = {fn(...)}
    local dt = os.clock() - s
    local entry = M._data[label]
    if not entry then
      entry = { time = 0, count = 0 }
      M._data[label] = entry
    end
    entry.time = entry.time + dt
    entry.count = entry.count + 1
    M._hits = M._hits + 1
    if M._hits % (tonumber(os.getenv("LUA_PROFILING_FREQ") or "10000") ) == 0 then
      M.report()
    end
    return _unpack(results)
  end
end

function M.report(out)
  out = out or io.stderr
  out:write("\nLUA PROFILING REPORT\n")
  local items = {}
  for k,v in pairs(M._data) do table.insert(items, { k = k, time = v.time, count = v.count }) end
  table.sort(items, function(a,b) return a.time > b.time end)
  for _,it in ipairs(items) do
    out:write(string.format("%s: count=%d total=%.6f avg=%.6f\n", it.k, it.count, it.time, it.time / it.count))
  end
  out:write("END LUA PROFILING REPORT\n\n")
end

return M
