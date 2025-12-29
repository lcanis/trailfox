import React, { useEffect, useRef, useState, useMemo, ElementRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapLibreGL, {
  Camera,
  MapView,
  MapViewRef,
  LineLayer,
  CircleLayer,
  SymbolLayer,
  ShapeSource,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import { AmenityCluster } from '../types';
import { RouteService } from '../services/routeService';
import { ITINERARY_THEME } from '../styles/itineraryTheme';
import { WEB_BASEMAP_STYLE_URL } from '../config/settings';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Set Access Token to null as we are using self-hosted or keyless tiles
MapLibreGL.setAccessToken(null);

interface ItineraryMapProps {
  routeOsmId: number;
  clusters: AmenityCluster[];
  selectedClusterKey: string | null;
  onSelectClusterKey: (key: string | null) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  showsUserLocation?: boolean;
  isFollowingUser?: boolean;
  onToggleFollowUser?: () => void;
  followDisableGuardUntil?: number;
  onOpenFilters?: () => void;
}

export default function ItineraryMap({
  routeOsmId,
  clusters,
  selectedClusterKey,
  onSelectClusterKey,
  userLocation,
  showsUserLocation,
  isFollowingUser,
  onToggleFollowUser,
  followDisableGuardUntil,
  onOpenFilters,
}: ItineraryMapProps) {
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const mapRef = useRef<MapViewRef>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const insets = useSafeAreaInsets();

  // Handle following user
  useEffect(() => {
    if (isFollowingUser && userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 14,
        animationDuration: 500,
      });
    }
  }, [isFollowingUser, userLocation]);

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
          marker: c.marker ?? '',
          selected: c.key === selectedClusterKey,
        },
      })),
    };
  }, [clusters, selectedClusterKey]);

  // Individual Amenities GeoJSON (for high zoom)
  const individualAmenitiesGeoJSON = useMemo(() => {
    const features: any[] = [];
    clusters.forEach((c) => {
      c.amenities.forEach((a, i) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
          properties: {
            amenityId: `${c.key}-${i}`,
            key: c.key,
            icon: a.subclass || a.class || 'marker',
          },
        });
      });
    });
    return { type: 'FeatureCollection', features };
  }, [clusters]);

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

  const handleMapPress = () => {
    // If we are following user, stop following on map interaction
    if (isFollowingUser && onToggleFollowUser) {
      if (followDisableGuardUntil && Date.now() < followDisableGuardUntil) return;
      onToggleFollowUser();
    }
  };

  return (
    <View
      style={styles.container}
      onTouchStart={() => {
        if (isFollowingUser && onToggleFollowUser) {
          if (followDisableGuardUntil && Date.now() < followDisableGuardUntil) return;
          onToggleFollowUser();
        }
      }}
    >
      <MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={WEB_BASEMAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/bright'}
        logoEnabled={false}
        attributionEnabled={false}
        onPress={handleMapPress}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            zoomLevel: 10,
          }}
        />

        <UserLocation visible={showsUserLocation} />

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
            maxZoomLevel={15.9}
            style={{
              circleRadius: 12,
              circleColor: ['case', ['get', 'selected'], ITINERARY_THEME.accent, '#ffffff'],
              circleStrokeWidth: 2,
              circleStrokeColor: [
                'case',
                ['get', 'selected'],
                '#ffffff',
                ITINERARY_THEME.textSecondary,
              ],
              circleOpacity: 0.8,
            }}
          />
          <SymbolLayer
            id="clusterSymbols"
            maxZoomLevel={15.9}
            style={{
              textField: ['get', 'marker'],
              textFont: ['Noto Sans Bold'],
              textSize: 13,
              textColor: ['case', ['get', 'selected'], '#ffffff', ITINERARY_THEME.textPrimary],
              textHaloColor: '#ffffff',
              textHaloWidth: 2,
              textAllowOverlap: true,
              textAnchor: 'center',
            }}
          />
        </ShapeSource>

        {/* Individual Amenities (High Zoom) */}
        <ShapeSource
          id="individualAmenitiesSource"
          shape={individualAmenitiesGeoJSON as any}
          onPress={onClusterPress}
        >
          <SymbolLayer
            id="individualAmenitiesSymbols"
            minZoomLevel={16}
            style={{
              iconImage: ['get', 'icon'],
              iconSize: 1.2,
              iconAllowOverlap: true,
              iconAnchor: 'center',
            }}
          />
        </ShapeSource>
      </MapView>

      {/* Filter Button */}
      {onOpenFilters && (
        <TouchableOpacity
          style={[styles.mapButton, { top: insets.top + 16, right: 72 }]}
          onPress={onOpenFilters}
          activeOpacity={0.8}
        >
          <Ionicons name="filter" size={20} color="#666" />
        </TouchableOpacity>
      )}

      {/* Location Button */}
      <TouchableOpacity
        style={[styles.mapButton, { top: insets.top + 16, right: 16 }]}
        onPress={onToggleFollowUser}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.mapButtonIcon,
            styles.locationArrow,
            isFollowingUser && styles.locationIconActive,
          ]}
        >
          ➤
        </Text>
      </TouchableOpacity>
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
  mapButton: {
    position: 'absolute',
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  mapButtonIcon: {
    fontSize: 20,
    color: '#666',
  },
  locationArrow: {
    transform: [{ rotate: '-45deg' }],
  },
  locationIconActive: {
    color: ITINERARY_THEME.accent,
  },
});
