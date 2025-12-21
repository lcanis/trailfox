import React, { useState, useCallback } from 'react';
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

export const DiscoveryScreen = () => {
  // UI State
  const [filter, setFilter] = useState<RouteFilterType>({
    searchQuery: '',
    viewboxOnly: true,
    sortBy: null, // No sort initially
  });

  const [bbox, setBbox] = useState<[number, number, number, number] | undefined>(undefined);

  const { routes, loading, error, loadMore, hasMore } = useRoutes({
    bbox: filter.viewboxOnly ? bbox : undefined,
    searchQuery: filter.searchQuery,
  });

  const { width, height } = useWindowDimensions();
  // Always treat native (iOS/Android) as "small". Simulators can report large pixel widths
  // which would otherwise prevent mobile layout rules from applying.
  const isSmallScreen = Platform.OS !== 'web' || Math.min(width, height) < 768;

  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [itineraryRouteId, setItineraryRouteId] = useState<number | null>(null);

  // Derived Data
  // We still use useRouteFilter for client-side sorting and search (if search is not fully server-side yet)
  // Note: useRoutes now handles bbox filtering server-side if viewboxOnly is true.
  // We can disable client-side viewbox filtering in useRouteFilter if we trust server-side,
  // or keep it as a refinement. For now, let's keep useRouteFilter as is, but it might be redundant for viewbox.
  const displayedRoutes = useRouteFilter(routes, filter, visibleIds);

  const activeId = selectedId || hoveredId;
  const activeRoute = activeId ? routes.find((r) => r.osm_id === activeId) : null;
  const itineraryRoute = itineraryRouteId
    ? routes.find((r) => r.osm_id === itineraryRouteId)
    : null;

  // Handlers
  const handleViewChange = useCallback((ids: Set<number>) => {
    setVisibleIds(ids);
  }, []);

  const handleBboxChange = useCallback((newBbox: [number, number, number, number]) => {
    setBbox(newBbox);
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

  if (loading && routes.length === 0) {
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
          onLoadMore={loadMore}
          hasMore={hasMore}
          loading={loading}
        />
      </View>

      {/* Always keep the map very small (20 px) so the list is prominent */}
      <View style={[styles.mapContainer, isSmallScreen && styles.mapContainerSmall]}>
        <Map
          onHover={handleMapHover}
          onSelect={handleMapSelect}
          onViewChange={handleViewChange}
          onBboxChange={handleBboxChange}
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
