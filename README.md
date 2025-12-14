# Trailfox

**Discover your trail. Navigate with clarity. Go further.**

Outdoor trail and route companion based on OpenStreetMap data.

Trailfox will help you to

* Discover your next trail
* Navigate in a logistics-first manner.

## Discovery

Find trails the way they deserve to be found: filtered, visual, interactive, with full trail metadata. Built on OpenStreetMap's comprehensive trail network.

## Itinerary

Navigate using a logistics-first manner - if required completely offline including map.

The interface is optimized for the journey ahead: a vertical timeline showing your route broken into logical segments - towns, water sources, resupply points, huts—with distance countdowns and amenity clusters.

This approach is inspired by specialized long-distance trail apps that meticulously curate each route, but built directly from OpenStreetMap data - so anyone can add and improve trails. It echoes medieval pilgrim guides and ancient Roman itineraries: a list of essential things to come, stripped of geographic noise.

See [docs/itinerary.md](docs/itinerary.md) for more details and the original idea.

## Availability

Available soon on the web and as an app with offline GeoPackage support for true offline experience.

Open source, including the trail data. No paywalls. No ads.

## CI: Automatic web deploy

A GitHub Actions workflow builds the web client and deploys the static `dist/` export to the server (`/var/www/trailfox.app/main/html`) when `main` receives a push. Secrets required:

- `DEPLOY_HOST` — host/IP of the VPS
- `DEPLOY_USER` — SSH user
- `DEPLOY_KEY` — private SSH key (no passphrase)
- `DEPLOY_PORT` — optional SSH port (defaults to 22)

Adjust the workflow or deployment path as needed for staging/production. The workflow uploads the `dist/` export to a temporary path on the server, then runs the helper deploy script (if present) to atomically swap the site into place.

