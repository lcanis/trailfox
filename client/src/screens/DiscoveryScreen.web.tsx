import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useDiscoveryScreen } from '../hooks/useDiscoveryScreen';
import { RouteList } from '../components/RouteList';
import { RouteDetails } from '../components/RouteDetails';
import Map from '../components/Map';
import { ItineraryScreen } from './ItineraryScreen';

export const DiscoveryScreen = () => {
  const {
    filter,
    setFilter,
    routes,
    totalCount,
    loading,
    error,
    loadMore,
    hasMore,
    selectedId,
    activeId,
    detailsRoute,
    itineraryRoute,
    displayedRoutes,
    handleViewChange,
    handleBboxChange,
    handleSelect,
    handleMapSelect,
    handleMapHover,
    handleOpenItinerary,
    handleCloseDetails,
    handleCloseItinerary,
  } = useDiscoveryScreen();

  const { width, height } = useWindowDimensions();
  const isSmallScreen = Math.min(width, height) < 768;

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
          totalCount={totalCount}
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

      {detailsRoute && (
        <RouteDetails
          route={detailsRoute}
          onClose={handleCloseDetails}
          onOpenItinerary={handleOpenItinerary}
        />
      )}

      {itineraryRoute && <ItineraryScreen route={itineraryRoute} onClose={handleCloseItinerary} />}
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
