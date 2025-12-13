import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AmenityCluster } from '../types';
import { RouteService } from '../services/routeService';
import { getBounds } from '../utils/geo';
import { ITINERARY_THEME } from '../styles/itineraryTheme';
import { DEVELOPER_MODE } from '../constants';

const THEME = ITINERARY_THEME;

const tagsToList = (tags: Record<string, string> | null | undefined) => {
  if (!tags) return [] as [string, string][];
  return Object.entries(tags).map(([k, v]) => [k, String(v)] as [string, string]);
};

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const clustersRef = useRef<AmenityCluster[]>(clusters);
  const [devTagsOverlay, setDevTagsOverlay] = useState<{
    title: string;
    tags: Record<string, string> | null;
  } | null>(null);

  const amenitiesGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: clusters.map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
        properties: {
          key: c.key,
          size: c.size,
          trail_km: c.trail_km,
        },
      })),
    } as const;
  }, [clusters]);

  useEffect(() => {
    clustersRef.current = clusters;
  }, [clusters]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.protomaps.com/styles/v2/light.json?key=dcecaff09bb71b06',
      center: [6.1, 49.7],
      zoom: 10,
    });

    map.current.on('load', () => {
      if (!map.current) return;
      setIsMapLoaded(true);

      let hoverKey: string | null = null;

      map.current.addSource('selected-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addLayer({
        id: 'selected-route-line',
        type: 'line',
        source: 'selected-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': THEME.accent,
          'line-width': 5,
          'line-opacity': 0.8,
        },
      });

      map.current.addSource('itinerary-amenities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addLayer({
        id: 'itinerary-amenities-circles',
        type: 'circle',
        source: 'itinerary-amenities',
        paint: {
          'circle-color': THEME.accent,
          'circle-opacity': 0.6,
          'circle-radius': ['interpolate', ['linear'], ['get', 'size'], 1, 4, 20, 9, 80, 14],
          'circle-stroke-color': THEME.accentDark,
          'circle-stroke-width': 1,
        },
      });

      map.current.addLayer({
        id: 'itinerary-amenities-selected',
        type: 'circle',
        source: 'itinerary-amenities',
        paint: {
          'circle-color': THEME.accent,
          'circle-opacity': 0.95,
          'circle-radius': ['interpolate', ['linear'], ['get', 'size'], 1, 6, 20, 12, 80, 18],
          'circle-stroke-color': THEME.accentDark,
          'circle-stroke-width': 2,
        },
        filter: ['==', ['get', 'key'], ''],
      });

      map.current.on('mouseenter', 'itinerary-amenities-circles', () => {
        map.current?.getCanvas().style.setProperty('cursor', 'pointer');
      });

      map.current.on('mouseleave', 'itinerary-amenities-circles', () => {
        map.current?.getCanvas().style.removeProperty('cursor');

        hoverKey = null;
        setDevTagsOverlay(null);
      });

      map.current.on('mousemove', 'itinerary-amenities-circles', (e) => {
        if (!DEVELOPER_MODE) return;
        const feature = e.features?.[0];
        const key = feature?.properties?.key;
        if (typeof key !== 'string') return;

        if (key === hoverKey) return;
        hoverKey = key;

        const cluster = clustersRef.current.find((c) => c.key === key);
        const a = cluster?.amenities?.[0];
        if (!a) {
          setDevTagsOverlay(null);
          return;
        }

        setDevTagsOverlay({
          title: a.name || `${a.class}${a.subclass ? ` / ${a.subclass}` : ''}`,
          tags: a.tags,
        });
      });

      map.current.on('click', 'itinerary-amenities-circles', (e) => {
        const feature = e.features?.[0];
        const key = feature?.properties?.key;
        if (typeof key === 'string') {
          onSelectClusterKey(key);
        }
      });

      map.current.on('click', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, {
          layers: ['itinerary-amenities-circles'],
        });
        if (!features || features.length === 0) {
          onSelectClusterKey(null);
          setDevTagsOverlay(null);
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [onSelectClusterKey]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const source = map.current.getSource('itinerary-amenities') as
      | maplibregl.GeoJSONSource
      | undefined;
    source?.setData(amenitiesGeoJSON as any);
  }, [amenitiesGeoJSON, isMapLoaded]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    RouteService.fetchGeoJSON(routeOsmId)
      .then((geojson) => {
        if (!map.current) return;
        const src = map.current.getSource('selected-route') as maplibregl.GeoJSONSource | undefined;
        src?.setData(geojson as any);

        const bounds = getBounds(geojson);
        if (bounds) {
          map.current.fitBounds(bounds, { padding: 40 });
        }
      })
      .catch(() => {
        // Ignore map-only failures; itinerary UI still works.
      });
  }, [routeOsmId, isMapLoaded]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    map.current.setFilter('itinerary-amenities-selected', [
      '==',
      ['get', 'key'],
      selectedClusterKey ?? '',
    ]);

    if (!selectedClusterKey) return;

    const match = clusters.find((c) => c.key === selectedClusterKey);
    if (!match) return;

    map.current.flyTo({
      center: [match.lon, match.lat],
      zoom: Math.max(map.current.getZoom(), 14),
    });
  }, [selectedClusterKey, clusters, isMapLoaded]);

  return (
    <View style={styles.container}>
      <div ref={mapContainer} style={styles.map} />
      {DEVELOPER_MODE && devTagsOverlay ? (
        <View style={styles.devOverlayBackdrop}>
          <View style={styles.devOverlayCard}>
            <View style={styles.devOverlayHeader}>
              <View style={styles.devOverlayHeaderMid}>
                <View style={styles.devTitleRow}>
                  <View style={styles.devDot} />
                  <Text numberOfLines={1} style={styles.devOverlayTitle}>
                    {devTagsOverlay.title}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setDevTagsOverlay(null)} style={styles.devCloseHit}>
                <Text style={styles.devCloseText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.devOverlayScroll}>
              {tagsToList(devTagsOverlay.tags).map(([k, v]) => (
                <View key={k} style={styles.devTagRow}>
                  <Text style={styles.devTagKey}>{k}:</Text>
                  <Text style={styles.devTagValue}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  map: {
    height: '100%',
    width: '100%',
  } as any,

  devOverlayBackdrop: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    pointerEvents: 'none',
  } as any,
  devOverlayCard: {
    pointerEvents: 'auto',
    backgroundColor: THEME.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  devOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  devTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: THEME.accent,
    borderWidth: 1,
    borderColor: THEME.accentDark,
  },
  devOverlayHeaderMid: {
    flex: 1,
    minWidth: 0,
  },
  devCloseHit: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.tagBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devCloseText: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  devOverlayTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  devOverlayScroll: {
    padding: 12,
    maxHeight: 170,
  },
  devTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  devTagKey: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textSecondary,
  },
  devTagValue: {
    fontSize: 12,
    color: THEME.textPrimary,
  },
});
