import React, { useEffect, useRef, useState, useMemo, ElementRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Camera,
  MapView,
  MapViewRef,
  LineLayer,
  CircleLayer,
  ShapeSource,
} from '@maplibre/maplibre-react-native';
import { AmenityCluster } from '../types';
import { RouteService } from '../services/routeService';
import { ITINERARY_THEME } from '../styles/itineraryTheme';
import { WEB_BASEMAP_STYLE_URL } from '../config/settings';

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
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const mapRef = useRef<MapViewRef>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);

  // Fetch Route GeoJSON
  useEffect(() => {
    RouteService.fetchGeoJSON(routeOsmId).then((geojson) => {
      setRouteGeoJSON(geojson);

      // Fit bounds
      if (geojson && geojson.features && geojson.features.length > 0 && cameraRef.current) {
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

        if (minLon <= maxLon && minLat <= maxLat) {
          cameraRef.current.fitBounds([maxLon, maxLat], [minLon, minLat], 50, 1000);
        }
      }
    });
  }, [routeOsmId]);

  // Clusters GeoJSON
  const clustersGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: clusters.map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
        properties: {
          key: c.key,
          size: c.size,
          selected: c.key === selectedClusterKey,
        },
      })),
    };
  }, [clusters, selectedClusterKey]);

  const onClusterPress = (e: any) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      if (feature.properties && feature.properties.key) {
        onSelectClusterKey(feature.properties.key);
      }
    } else {
      onSelectClusterKey(null);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={WEB_BASEMAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty'}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            zoomLevel: 10,
          }}
        />

        {/* Route Line */}
        {routeGeoJSON && (
          <ShapeSource id="routeSource" shape={routeGeoJSON}>
            <LineLayer
              id="routeLine"
              style={{
                lineColor: '#e41a1c',
                lineWidth: 4,
                lineOpacity: 0.8,
              }}
            />
          </ShapeSource>
        )}

        {/* Clusters */}
        <ShapeSource id="clustersSource" shape={clustersGeoJSON as any} onPress={onClusterPress}>
          <CircleLayer
            id="clustersCircle"
            style={{
              circleRadius: 10,
              circleColor: [
                'case',
                ['get', 'selected'],
                ITINERARY_THEME.accent,
                ITINERARY_THEME.textSecondary,
              ],
              circleStrokeWidth: 2,
              circleStrokeColor: '#fff',
            }}
          />
        </ShapeSource>
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
