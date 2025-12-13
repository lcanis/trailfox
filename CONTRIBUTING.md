# Contributing

## Developers

see backend/README.md and frontend/CONTRIBUTING.md

### Development Setup

```bash
cd client
npm install
git config core.hooksPath .husky  # Enable git hooks
```

### Code Quality

Code is automatically linted and formatted on commit. To manually check:

```bash
cd client
npm run lint       # Check linting
npm run lint:fix   # Auto-fix issues
npm run format     # Format code
npm run check-types # Type check
```

All PRs must pass linting and type checks.

Feel free to open an issue with review comments and suggestions on implementation.

Database experts: Can the schema be improved for lower loads?

OSM experts: How can incremental imports be handled in a sustainable and safe manner?

## Designers

It would be nice to have a better basemap with an outdoor focus. Check out [Maputnik](https://maputnik.github.io/). Unfortunately [OpenTopomap](https://opentopomap.org) will be put into backup mode.

The gradients and colors on the trail networks can also be improved significantly.

## Users

Browse the discovery and update OSM route data to be consistent. Check for invalid links, weird tags.
