import Constants from 'expo-constants';
import { Platform } from 'react-native';

// User-configurable settings moved here from constants.ts
// Keep this file simple so it's easy for devs to override locally if needed.
export type StartLocation = 'luxembourg' | 'munich' | 'user';

export const START_LOCATION_MODE: StartLocation = 'luxembourg';

export const PREDEFINED_LOCATIONS: Record<string, { center: [number, number]; zoom: number }> = {
  luxembourg: { center: [6.13, 49.61], zoom: 9 },
  munich: { center: [11.58, 48.13], zoom: 10 },
};

// Developer mode toggles debug overlays and other conveniences
export const DEVELOPER_MODE = true;

// Basemap style used by MapLibre on web.
// Note: Protomaps styles require an API key and may fail (403) if the key is invalid.
//export const WEB_BASEMAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
export const WEB_BASEMAP_STYLE_URL =
  'https://api.protomaps.com/styles/v2/light.json?key=dcecaff09bb71b06';

// API configuration used by the client during development and production.
// Local dev: use Caddy reverse proxy running on localhost:8090 (see server setup)
// Production: blank base URL means same-origin (served via reverse proxy)
export let API_BASE_URL = '';

if (Platform.OS === 'web') {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLocalLan =
      hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
    const isExpoWebPort = port === '8081' || port === '19006' || port === '19000';
    // Default to local Caddy proxy when running Expo locally (localhost, LAN IP, or dev ports)
    if (isLocalHost || isLocalLan || isExpoWebPort) {
      API_BASE_URL = 'http://localhost:8090';
    } else {
      // Production/staging web: use absolute origin to avoid environments where
      // `Request('/relative')` is rejected (some fetch polyfills require absolute URLs).
      API_BASE_URL = window.location.origin;
    }
  }
} else {
  // Native (Android/iOS)
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

  if (debuggerHost) {
    // If running in Expo Go or dev build, use the debugger host IP
    const ip = debuggerHost.split(':')[0];
    API_BASE_URL = `http://${ip}:8090`;
  } else {
    // Fallback for production or standalone builds (if not configured otherwise)
    // For emulator/simulator
    API_BASE_URL = `http://${localhost}:8090`;
  }
}

export const API_URL = `${API_BASE_URL}/api/routes`;
export const TILES_BASE_URL = `${API_BASE_URL}/tiles`;

// Whether the app should allow itineraries for MultiLineString routes.
// Default false until bifurcations/superroutes are handled.
export const allowMultistring = true;

// Log config values during development so the dev console helps debugging network errors
if (DEVELOPER_MODE) {
  // eslint-disable-next-line no-console
  console.log('Trailfox settings:', { API_URL, TILES_BASE_URL, START_LOCATION_MODE });
}
