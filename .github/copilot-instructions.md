# Copilot instructions — general

- IMPORTANT: Do NOT commit or push changes automatically. Make edits in a branch and open a pull request for review; ask a human before committing significant changes.
- DRY principle: don't repeat yourself, don't repeat code, extract common patterns.

## applies to: server/ directory (PostGIS + import + PostgREST + helpers)

- Purpose: help AI agents be immediately productive with database and import-related work. Be concise, *fail-fast*, and prefer simple, fast code over defensive complexity.

Quick facts
- This repo is self-contained for local development. We are the only user and there are no external services required outside this repo for normal work (PBF files are in `server/` and imports are local).
- DB is regeneratable quickly using the `server/import` workflow (osm2pgsql + post-import SQL). It is acceptable to reimport rather than implement complicated recovery logic.

How to run SQL (canonical)
- Use the single entrypoint: `./server/run_sql.sh` (not a custom wrapper).
  - Inline command: `./server/run_sql.sh -c "SELECT 1;"`
  - Run a file: `./server/run_sql.sh server/sql/my_script.sql`
  - Admin mode (explicit): `./server/run_sql.sh --admin -c "ALTER ROLE ..."`
- The runtime reads `server/.env`; do **not** overwrite it with `.env.example`. Use `server/.env` for local credentials and keep secrets out of commits.
- For interactive checks, `-c` runs with `SET statement_timeout = '30s'` to avoid hanging the terminal.

Why the fail-fast philosophy
- Imports and post-import checks should fail loudly: e.g., a DO block in `server/sql/post_import.sql` raises if any `itinerarius.routes` rows lack `geom`.
- Prefer fixing the source/import or reimporting data over adding ad-hoc defensive workarounds in production views.

Key files and where to look
- `server/sql/setup_api.sql` — API views (e.g., `api.route_amenities`) and helper functions used by PostgREST. Use it to find API-side geometry logic.
- `server/sql/post_import.sql` — post-import maintenance (geometry materialization, indexes, fail-fast checks). Look here for data fixes and indexing guidance.
- `server/osm2pgsql/*` — osm2pgsql Lua modules that shape raw import (e.g., `routes_module.lua` shows how `raw_geom` is populated and why some relations may be skipped).
- `server/import` — import orchestration (how PBFs and osm2pgsql are run).
- `server/run_sql.sh` — canonical way to run SQL for dev operations; prefer it to calling `psql` directly so env and timeouts are applied consistently.

Performance & debugging notes
- Be careful when scanning `api.route_amenities` at scale — it performs per-route lateral computations and geography checks (ST_DWithin). For wide scans use per-route checks, `EXPLAIN ANALYZE` to find hotspots, or materialize helpers if you need aggregate/fast counts.

Testing & quick checks
- To inspect missing-geometry issues: use `server/check_missing_geom.sql` or run the same queries with `./server/run_sql.sh -c "<SQL>"`.
- Route geometry quality checks and indices are in `server/sql/post_import.sql` and `server/sql/route_quality.sql`.

Style & conventions
- Keep SQL and helpers clear and fast; prefer straightforward SQL over clever one-liners. Document assumptions in nearby SQL or comments.
- Use `itinerarius.*` schema for core data; API views live in `api` schema and are exposed to PostgREST.

If anything is missing or you want extra examples (e.g., a sample `EXPLAIN ANALYZE` guidance or a short materialized-view recipe for `route_amenities`), tell me and I’ll add it.
