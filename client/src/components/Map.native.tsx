import React, { useEffect, useRef, useMemo, ElementRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapLibreGL, {
  Camera,
  MapView,
  MapViewRef,
  VectorSource,
  LineLayer,
} from '@maplibre/maplibre-react-native';
import {
  START_LOCATION_MODE,
  PREDEFINED_LOCATIONS,
  TILES_BASE_URL,
  WEB_BASEMAP_STYLE_URL,
} from '../config/settings';
import { RouteService } from '../services/routeService';

// Set Access Token to null as we are using self-hosted or keyless tiles (or configured via URL)
MapLibreGL.setAccessToken(null);

interface MapProps {
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
  onViewChange: (visibleIds: Set<number>) => void;
  onBboxChange?: (bbox: [number, number, number, number]) => void;
  selectedId: number | null;
  highlightedId: number | null;
  compact?: boolean;
}

export default function Map({
  onHover,
  onSelect,
  onViewChange,
  onBboxChange,
  selectedId,
  highlightedId,
  compact,
}: MapProps) {
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const mapRef = useRef<MapViewRef>(null);
  // const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initial Location
  const initialCenter = useMemo(() => {
    if (START_LOCATION_MODE !== 'user' && PREDEFINED_LOCATIONS[START_LOCATION_MODE]) {
      return PREDEFINED_LOCATIONS[START_LOCATION_MODE].center;
    }
    return PREDEFINED_LOCATIONS.munich.center;
  }, []);

  const initialZoom = useMemo(() => {
    if (START_LOCATION_MODE !== 'user' && PREDEFINED_LOCATIONS[START_LOCATION_MODE]) {
      return PREDEFINED_LOCATIONS[START_LOCATION_MODE].zoom;
    }
    return PREDEFINED_LOCATIONS.munich.zoom;
  }, []);

  // Ensure styleURL is valid
  const styleURL = WEB_BASEMAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

  // Focus on Selected Route
  useEffect(() => {
    if (selectedId && cameraRef.current) {
      RouteService.fetchGeoJSON(selectedId).then((geojson) => {
        if (geojson && geojson.features && geojson.features.length > 0) {
          // Calculate bbox
          let minLon = 180,
            minLat = 90,
            maxLon = -180,
            maxLat = -90;

          const processCoords = (coords: any[]) => {
            if (typeof coords[0] === 'number') {
              const [lon, lat] = coords;
              minLon = Math.min(minLon, lon);
              minLat = Math.min(minLat, lat);
              maxLon = Math.max(maxLon, lon);
              maxLat = Math.max(maxLat, lat);
            } else {
              coords.forEach(processCoords);
            }
          };

          geojson.features.forEach((feature: any) => {
            if (feature.geometry && feature.geometry.coordinates) {
              processCoords(feature.geometry.coordinates);
            }
          });

          if (minLon <= maxLon && minLat <= maxLat && cameraRef.current) {
            cameraRef.current.fitBounds([maxLon, maxLat], [minLon, minLat], 50, 1000);
          }
        }
      });
    }
  }, [selectedId]);

  // Handle Region Change (Bbox)
  const onRegionDidChange = async (feature: any) => {
    if (!onBboxChange || !mapRef.current) return;

    const bounds = await mapRef.current.getVisibleBounds();
    // bounds is [[neLng, neLat], [swLng, swLat]]
    // bbox format: [minLon, minLat, maxLon, maxLat]
    const bbox: [number, number, number, number] = [
      bounds[1][0], // swLng
      bounds[1][1], // swLat
      bounds[0][0], // neLng
      bounds[0][1], // neLat
    ];
    onBboxChange(bbox);
  };

  // Filter for Highlight Layer
  const highlightFilter = useMemo(() => {
    const id = selectedId || highlightedId || -1;
    return ['==', 'osm_id', id] as any;
  }, [selectedId, highlightedId]);

  // Layer Styles
  const majorRouteStyle = {
    lineColor: ['match', ['get', 'network'], 'iwn', '#e41a1c', 'nwn', '#377eb8', '#333'] as any,
    lineWidth: ['match', ['get', 'network'], 'iwn', 6, 'nwn', 5, 3] as any,
    lineOpacity: 0.8,
  };

  const regionalRouteStyle = {
    lineColor: '#4daf4a',
    lineWidth: 4,
    lineOpacity: 0.8,
  };

  const localRouteStyle = {
    lineColor: '#984ea3',
    lineWidth: 2,
    lineOpacity: 0.8,
  };

  const highlightStyle = {
    lineColor: '#FF00FF',
    lineWidth: 10,
    lineOpacity: 0.6,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={styleURL}
        onRegionDidChange={onRegionDidChange}
        // onDidFinishLoadingMap={() => setIsMapLoaded(true)}
        logoEnabled={false}
        attributionEnabled={false} // Or true if you want attribution
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: initialCenter,
            zoomLevel: initialZoom,
          }}
        />

        {/* Routes Source */}
        <VectorSource id="routes" tileUrlTemplates={[TILES_BASE_URL + '/mvt_routes/{z}/{x}/{y}']}>
          {/* Highlight Layer (Bottom) */}
          <LineLayer
            id="routes-highlight"
            sourceLayerID="routes"
            style={highlightStyle}
            filter={highlightFilter}
          />

          {/* Local Routes */}
          <LineLayer
            id="routes-line-local"
            sourceLayerID="routes"
            minZoomLevel={10}
            filter={['==', ['get', 'network'], 'lwn']}
            style={localRouteStyle}
          />

          {/* Regional Routes */}
          <LineLayer
            id="routes-line-regional"
            sourceLayerID="routes"
            minZoomLevel={8}
            filter={['==', ['get', 'network'], 'rwn']}
            style={regionalRouteStyle}
          />

          {/* Major Routes */}
          <LineLayer
            id="routes-line-major"
            sourceLayerID="routes"
            minZoomLevel={6}
            filter={['match', ['get', 'network'], ['iwn', 'nwn'], true, false]}
            style={majorRouteStyle}
          />
        </VectorSource>
      </MapView>
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
