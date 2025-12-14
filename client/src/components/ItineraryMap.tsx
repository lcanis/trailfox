import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { AmenityCluster } from '../types';
import { ITINERARY_THEME } from '../styles/itineraryTheme';

interface ItineraryMapProps {
  routeOsmId: number;
  clusters: AmenityCluster[];
  selectedClusterKey: string | null;
  onSelectClusterKey: (key: string | null) => void;
}

export default function ItineraryMap({
  routeOsmId,
  clusters,
  selectedClusterKey,
  onSelectClusterKey,
}: ItineraryMapProps) {
  const cameraRef = useRef<MapLibreGL.Camera>(null);

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL="https://api.protomaps.com/styles/v2/light.json?key=dcecaff09bb71b06"
        logoEnabled={false}
        attributionEnabled={true}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [6.1, 49.7],
            zoomLevel: 10,
          }}
        />
      </MapLibreGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
