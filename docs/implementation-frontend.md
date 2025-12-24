# Client Implementation Documentation

## Overview

The client is a React Native application built with Expo, supporting iOS, Android, and Web. It serves as a frontend for exploring hiking routes and viewing detailed itineraries.

## Architecture

### Tech Stack

- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Navigation**: Single-screen architecture (currently) with conditional rendering of overlays/bottom sheets.
- **State Management**: React Hooks (local state + custom hooks).
- **Maps**: `@maplibre/maplibre-react-native` (Native) / MapLibre GL JS (Web).
- **UI Components**: Custom components + `@gorhom/bottom-sheet`.
- **Testing**: Jest, `@testing-library/react-native`.

### Project Structure

```text
src/
├── app/            # Expo Router entry points (currently minimal usage)
├── components/     # Reusable UI components (Map, BottomSheet, etc.)
├── config/         # Configuration settings (API URLs, constants)
├── hooks/          # Custom React hooks (business logic)
├── screens/        # Main screen components (Discovery, Itinerary)
├── services/       # API interaction layer
├── styles/         # Shared styles and themes
├── types/          # TypeScript definitions
└── utils/          # Helper functions
```

## Key Components

### Screens

1. **DiscoveryScreen**: The main entry point.
    - Displays a map of available routes.
    - Handles filtering (search, bbox) and selection.
    - Manages the transition to the Itinerary view.
2. **ItineraryScreen**: Detailed view of a selected route.
    - Displays the route geometry on a map.
    - Shows a timeline of amenities along the route.
    - Uses a bottom sheet interaction model on mobile.

### Core Components

- **Map**: A platform-aware wrapper around MapLibre.
  - `Map.native.tsx`: Uses `@maplibre/maplibre-react-native`.
  - `Map.web.tsx`: Uses `maplibre-gl` (JS).
- **NativeBottomSheet**: A wrapper around `@gorhom/bottom-sheet` to provide a consistent sheet experience on iOS/Android, with fallback behavior for web.
- **ScrollContainer**: A smart scroll wrapper that uses `BottomSheetScrollView` on native (for gesture handling) and standard `ScrollView` on web.

## Data Layer

### Services

- **RouteService**: Handles fetching route data from the backend (PostgREST).
  - `fetchRoutes`: Paginated list of routes.
  - `fetchRoutesInBbox`: Spatial search.
- **ItineraryService**: Fetches detailed amenity data for a specific route.

### State Management

- **useRoutes**: Manages the list of routes, pagination, and loading states.
- **useItinerary**: Manages the detailed data for a single route, including clustering of amenities.
- **useDiscoveryScreen**: Orchestrates the state for the main screen (filters, selection, map interactions).

## Testing Strategy

- **Unit/Integration Tests**: Jest + React Native Testing Library.
- **Mocking**: Extensive mocking is required for native modules in `jest.setup.ts`:
  - `react-native-reanimated`: Mocked to avoid native driver issues in tests.
  - `react-native-worklets`: Mocked for Reanimated dependencies.
  - `@gorhom/bottom-sheet`: Mocked to render children directly without complex gesture logic.
  - `@maplibre/maplibre-react-native`: Mocked to avoid native view rendering.

## Configuration

- **API_BASE_URL**: Configured in `src/config/settings.ts`.
  - **Web**: Auto-detects localhost/LAN or uses `window.location.origin`.
  - **Native**: Attempts to connect to `localhost:8090` (via `10.0.2.2` on Android).

## Known Patterns & Gotchas

- **Platform Specific Files**: `.native.tsx` and `.web.tsx` extensions are used heavily to handle platform differences (especially for Maps and Bottom Sheet).
- **Scroll Handling**: Inside the Bottom Sheet, `BottomSheetScrollView` (via `ScrollContainer`) MUST be used on native to prevent the sheet from stealing scroll gestures.
- **Layout**: Flexbox is used throughout. `SafeAreaView` context is essential for handling notches and home indicators.
