# Itinerarius Client

This is the React Native / Expo client for Itinerarius.

## Setup

1. Install dependencies:

    ```bash
    npm install
    ```

2. Run for web:

    ```bash
    npx expo start --web
    ```

3. Build for web:

    ```bash
    npx expo export -p web
    ```

## Deployment

The web build is deployed to `poc.trailfox.app`.
To deploy manually:

```bash
npx expo export -p web
sudo cp -r dist/* /var/www/trailfox.app/poc/html/
```

## Configuration

The app expects the API to be available at `/api` and tiles at `/tiles`.
This is handled by the Caddy reverse proxy in production.
For local development, you might need to configure a proxy or point to the production URL.
