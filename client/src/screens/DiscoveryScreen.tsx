import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useDiscoveryScreen } from '../hooks/useDiscoveryScreen';
import { RouteList } from '../components/RouteList';
import { RouteDetails } from '../components/RouteDetails';
import Map from '../components/Map';
import { NativeBottomSheet } from '../components/NativeBottomSheet';
import { ItineraryScreen } from './ItineraryScreen';

export const DiscoveryScreen = () => {
  const snapPoints = React.useMemo(() => ['12%', '50%', '95%'], []);

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

  const MapComponent = (
    <Map
      onHover={handleMapHover}
      onSelect={handleMapSelect}
      onViewChange={handleViewChange}
      onBboxChange={handleBboxChange}
      selectedId={selectedId}
      highlightedId={activeId}
      compact={false}
    />
  );

  const ContentComponent = (
    <View style={{ flex: 1 }}>
      {detailsRoute ? (
        <RouteDetails
          route={detailsRoute}
          onClose={handleCloseDetails}
          onOpenItinerary={handleOpenItinerary}
        />
      ) : (
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
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <NativeBottomSheet
        mapComponent={MapComponent}
        index={1} // Default to mid-range (50%)
        snapPoints={snapPoints}
      >
        {ContentComponent}
      </NativeBottomSheet>

      {itineraryRoute && <ItineraryScreen route={itineraryRoute} onClose={handleCloseItinerary} />}
    </View>
  );
};

const styles = StyleSheet.create({
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
