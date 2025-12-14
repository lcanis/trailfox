# Testing and profiling DB import

How to run Lua unit tests and profiling the osm2pgsql import

Run the Busted tests

- Install Lua and luarocks (macOS example):

  ```sh
  brew install lua luarocks
  luarocks install busted
  ```

- Run all specs for the osm2pgsql modules:

  ```sh
  cd server/osm2pgsql
  busted -v
  ```

- Run a single spec (fast iteration):

  ```sh
  busted spec/routes_spec.lua:57 -v
  ```

Quick profiling of Lua during an import

- Requirements: running Postgres (docker compose in `server/setup`) and a small local PBF.
- The repository includes a simple profiler helper (`server/osm2pgsql/profiler.lua`) that is enabled with an env var. Basic usage:

  ```sh
  # Run the bootstrap import with periodic profiler output to stderr
  cd server/setup
  LUA_PROFILING=1 LUA_PROFILING_FREQ=2000 ./bootstrap.sh /path/to/luxembourg-latest.osm.pbf 2> profiler.log
  ```

  - `LUA_PROFILING=1` enables profiling.
  - `LUA_PROFILING_FREQ` controls how often (in wrapped-call count) reports are printed; lower = more frequent.
  - Redirect `stderr` to capture the periodic reports for later inspection (`2> profiler.log`).
