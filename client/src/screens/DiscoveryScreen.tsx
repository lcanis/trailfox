import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRoutes } from '../hooks/useRoutes';
import { useRouteFilter } from '../hooks/useRouteFilter';
import { RouteList } from '../components/RouteList';
import { RouteDetails } from '../components/RouteDetails';
import Map from '../components/Map';
import { Route, RouteFilter as RouteFilterType } from '../types';
import { ItineraryScreen } from './ItineraryScreen';
import { RouteService } from '../services/routeService';

let Location: typeof import('expo-location') | null = null;
if (Platform.OS !== 'web') {
  Location = require('expo-location');
}

// Fisher-Yates shuffle
const shuffleArray = (array: Route[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const DiscoveryScreen = () => {
  const { routes, loading, error } = useRoutes();
  const { width, height } = useWindowDimensions();
  // Always treat native (iOS/Android) as "small". Simulators can report large pixel widths
  // which would otherwise prevent mobile layout rules from applying.
  const isSmallScreen = Platform.OS !== 'web' || Math.min(width, height) < 768;

  const [deviceLocation, setDeviceLocation] = useState<{ lon: number; lat: number } | null>(null);
  const [distanceSortedRoutes, setDistanceSortedRoutes] = useState<Route[] | null>(null);

  // UI State
  const [filter, setFilter] = useState<RouteFilterType>({
    searchQuery: '',
    viewboxOnly: true,
    sortBy: null, // No sort initially
  });

  const [shuffledRoutes, setShuffledRoutes] = useState<Route[]>([]);

  // Shuffle routes once loaded
  useEffect(() => {
    if (routes.length > 0) {
      setShuffledRoutes(shuffleArray(routes));
    }
  }, [routes]);

  // Fetch current device location so we can sort by distance from “here”.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (Platform.OS === 'web') {
          if (typeof navigator === 'undefined' || !navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled) return;
              setDeviceLocation({ lon: pos.coords.longitude, lat: pos.coords.latitude });
            },
            () => {
              // Ignore permission errors; distance sort will be unavailable.
            },
            { enableHighAccuracy: false, timeout: 7000 }
          );
          return;
        }

        if (!Location) return;

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setDeviceLocation({ lon: pos.coords.longitude, lat: pos.coords.latitude });
      } catch {
        // Ignore; distance sort will just not work.
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // When sorting by distance and we have a device location, fetch a server-side
  // distance-ordered list (distance is computed against the route geometry).
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (filter.sortBy !== 'distance') {
        setDistanceSortedRoutes(null);
        return;
      }
      if (!deviceLocation) {
        setDistanceSortedRoutes(null);
        return;
      }

      try {
        const data = await RouteService.fetchAllByDistance(deviceLocation);
        if (cancelled) return;
        setDistanceSortedRoutes(data);
      } catch {
        if (cancelled) return;
        setDistanceSortedRoutes(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [filter.sortBy, deviceLocation]);

  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [itineraryRouteId, setItineraryRouteId] = useState<number | null>(null);

  // Derived Data
  // Use shuffledRoutes as base if no sort is active, otherwise use original routes (or shuffled, doesn't matter if sorted)
  const baseRoutes = distanceSortedRoutes ?? shuffledRoutes;
  const displayedRoutes = useRouteFilter(baseRoutes, filter, visibleIds);

  const activeId = selectedId || hoveredId;
  const activeRoute = activeId ? baseRoutes.find((r) => r.osm_id === activeId) : null;
  const itineraryRoute = itineraryRouteId
    ? baseRoutes.find((r) => r.osm_id === itineraryRouteId)
    : null;

  // Handlers
  const handleViewChange = useCallback((ids: Set<number>) => {
    setVisibleIds(ids);
  }, []);

  const handleSelect = useCallback((route: Route) => {
    setSelectedId(route.osm_id);
  }, []);

  const handleMapSelect = useCallback((id: number | null) => {
    setSelectedId(id);
  }, []);

  const handleMapHover = useCallback((id: number | null) => {
    setHoveredId(id);
  }, []);

  const handleOpenItinerary = useCallback((route: Route) => {
    setItineraryRouteId(route.osm_id);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading routes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isSmallScreen && styles.containerSmall]}>
      <View style={[styles.listContainer, isSmallScreen && styles.listContainerSmall]}>
        <RouteList
          routes={displayedRoutes}
          filter={filter}
          onFilterChange={setFilter}
          onSelect={handleSelect}
        />
      </View>

      {/* Always keep the map very small (20 px) so the list is prominent */}
      <View style={[styles.mapContainer, styles.mapContainerSmall]}>
        <Map
          onHover={handleMapHover}
          onSelect={handleMapSelect}
          onViewChange={handleViewChange}
          selectedId={selectedId}
          highlightedId={activeId}
          compact={true}
        />
      </View>

      {activeRoute && (
        <RouteDetails
          route={activeRoute}
          onClose={() => setSelectedId(null)}
          onOpenItinerary={handleOpenItinerary}
        />
      )}

      {itineraryRoute && (
        <ItineraryScreen route={itineraryRoute} onClose={() => setItineraryRouteId(null)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  containerSmall: {
    // Map on top (visually), List on bottom? Or Column (List top, Map bottom).
    // Usually Map is main. Let's do Column: Map Top, List Bottom.
    // But in React Native Web Column is Top->Bottom.
    // If we want Map on Top, it should be first in DOM or flex-direction column.
    // But our JSX has List first. So column-reverse puts List at bottom.
    flexDirection: 'column-reverse',
  },
  listContainer: {
    width: 300,
    height: '100%',
    zIndex: 20,
  },
  listContainerSmall: {
    width: '100%',
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    height: '100%',
  },
  mapContainerSmall: {
    // Very small map on mobile (20 pts) so the list dominates on start.
    height: 20,
    flex: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
});
