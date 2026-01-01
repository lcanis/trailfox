# Running wmt routebuilder

This is the routebuilder from waymarked trails.

Original source: [waymarkedtrails-backend/wmt_db/geometry](https://github.com/waymarkedtrails/waymarkedtrails-backend/tree/master/wmt_db/geometry)

```shell
# Install dependencies and run (must run from the parent directory so `routebuilder` is importable)
cd ../
uv run --project routebuilder -m routebuilder.build_routes

# If you're already in `server/routebuilder`, you can also run:
uv run --project . --directory .. -m routebuilder.build_routes
```

## Development
```shell
# Run tests
uv run pytest
```
