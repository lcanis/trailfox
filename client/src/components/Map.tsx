import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { PREDEFINED_LOCATIONS, START_LOCATION_MODE } from '../config/settings';

// Set the access token if needed, or leave empty for self-hosted/open tiles
MapLibreGL.setAccessToken(null);

interface MapProps {
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
  onViewChange: (visibleIds: Set<number>) => void;
  selectedId: number | null;
  highlightedId: number | null;
}

export default function Map({
  onHover,
  onSelect,
  onViewChange,
  selectedId,
  highlightedId,
}: MapProps) {
  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const [zoom, setZoom] = useState<number>(0);

  let initialCenter = PREDEFINED_LOCATIONS.munich.center;
  let initialZoom = PREDEFINED_LOCATIONS.munich.zoom;

  if (START_LOCATION_MODE !== 'user' && PREDEFINED_LOCATIONS[START_LOCATION_MODE]) {
    initialCenter = PREDEFINED_LOCATIONS[START_LOCATION_MODE].center;
    initialZoom = PREDEFINED_LOCATIONS[START_LOCATION_MODE].zoom;
  }

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
            centerCoordinate: initialCenter,
            zoomLevel: initialZoom,
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
