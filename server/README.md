# Server

Compose-first PostGIS + Martin + PostgREST + Caddy.

## Prerequisites
- Docker (Desktop/Engine)
- `psql` (PostgreSQL client)

## Configuration

1.  Copy the example environment file:
    ```bash
    cd server && cp .env.example .env
    ```
2.  Edit `.env` to set secure passwords for:
    -   `POSTGRES_PASSWORD` (Superuser)
    -   `DB_ADMIN_PASSWORD` (GIS Admin)
    -   `APP_PASSWORD` (Application User)

## Docker Setup (Base + Override)

We use a "Base + Override" pattern to separate shared configuration from production-specific settings.

### Development (Local)
The default `docker-compose.yml` is configured for development. It exposes ports directly and uses a simple Caddy proxy.

```bash
# Start dev environment
docker compose up -d
```

### Production (Server)
For production, use the `docker-compose.prod.yml` override. This binds internal services to `127.0.0.1` for security and configures Caddy with automatic HTTPS.

```bash
# Start production environment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Data Import

The `bootstrap` script handles database creation, user setup, and data import.

```bash
# Full bootstrap (Create DB, Users, Import Data)
./bootstrap create /path/to/region.osm.pbf
```

**Incremental imports:**
-   `./bootstrap incremental ...` uses `osm2pgsql --slim`.

**Manual Steps:**
You can also run steps individually:
```bash
./init-db        # Create DB (use --force-reset to drop/recreate)
./import create <pbf>   # Import OSM data
./apply-schemas  # Apply API and tiles schemas
```

## Deployment

To deploy the web client to the production server:

```bash
# 1. Build the client (locally or in CI)
cd ../client
npx expo export -p web --output-dir dist

# 2. Deploy to server
cd ../server
./deploy_client.sh ../client/dist main
```

## Troubleshooting

### "API error 400" or Missing Tiles
If you see 400 errors for API requests or missing tiles in Martin:
1.  **Check Logs:** `docker logs martin` or `docker logs postgrest`.
2.  **Missing Columns:** A common issue is missing columns in the `routes` table (e.g., `network`). This happens if the `osm2pgsql` Lua style doesn't match the SQL schema expectations.
    *   *Fix:* Ensure `osm2pgsql/routes_module.lua` includes all necessary columns (like `network`) and re-run the import:
        ```bash
        ./bootstrap create /path/to/region.osm.pbf
        ```
3.  **Restart Services:** After schema changes, restart Martin/PostgREST:
        ```bash
        docker restart martin postgrest
        ```

### Resetting the Database
If you need to start fresh:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
docker volume rm trailfox_pg_data
```
