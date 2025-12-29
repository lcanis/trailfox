import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, Text, Image } from 'react-native';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AmenityCluster } from '../types';
import { RouteService } from '../services/routeService';
import { getBounds } from '../utils/geo';
import { ITINERARY_THEME } from '../styles/itineraryTheme';
import { DEVELOPER_MODE } from '../constants';
import { WEB_BASEMAP_STYLE_URL } from '../config/settings';
import { getAmenityIconName } from '../screens/itinerary/itineraryModel';
import { ICON_REGISTRY } from '../assets/iconRegistry';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const clustersRef = useRef<AmenityCluster[]>(clusters);
  const [devTagsOverlay, setDevTagsOverlay] = useState<{
    title: string;
    tags: Record<string, string> | null;
  } | null>(null);

  const amenitiesGeoJSON = useMemo(() => {
    const features: any[] = [];

    // Clusters
    clusters.forEach((c) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
        properties: {
          type: 'cluster',
          key: c.key,
          size: c.size,
          marker: String(c.marker ?? ''),
          trail_km: c.trail_km,
        },
      });

      // Individual amenities (for high zoom)
      c.amenities.forEach((a, i) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
          properties: {
            type: 'individual',
            amenityId: `${c.key}-${i}`,
            key: c.key,
            icon: getAmenityIconName(a.class, a.subclass),
            marker: '',
          },
        });
      });
    });

    return {
      type: 'FeatureCollection',
      features,
    } as const;
  }, [clusters]);

  useEffect(() => {
    clustersRef.current = clusters;
  }, [clusters]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const styleUrl = WEB_BASEMAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
    let resizeObserver: ResizeObserver | undefined;

    const initMap = (style: any) => {
      if (!mapContainer.current) return;

      const m = new maplibregl.Map({
        container: mapContainer.current,
        style: style,
        center: [6.1, 49.7],
        zoom: 10,
      });
      map.current = m;

      // Resize map when container size changes (crucial for flex layouts)
      resizeObserver = new ResizeObserver(() => {
        m.resize();
      });
      resizeObserver.observe(mapContainer.current);

      m.on('load', () => {
        if (!map.current) return;

        // Load individual SVG icons in the background
        const uniqueIcons = new Set<string>();
        clustersRef.current.forEach((c) => {
          c.amenities.forEach((a) => {
            uniqueIcons.add(getAmenityIconName(a.class, a.subclass));
          });
        });

        uniqueIcons.forEach(async (iconName) => {
          const iconSource = ICON_REGISTRY[iconName];
          if (!iconSource) return;

          const asset = Image.resolveAssetSource(iconSource);
          const url = asset?.uri;
          if (!url) return;

          try {
            const image = await m.loadImage(url);
            if (map.current && !map.current.hasImage(iconName)) {
              map.current.addImage(iconName, image.data);
            }
          } catch (err) {
            console.warn(`Failed to load icon: ${iconName} from ${url}`, err);
          }
        });

        let hoverKey: string | null = null;

        m.addSource('selected-route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        m.addLayer({
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

        // Ensure the route line is below the amenities
        // (amenities layers are added after this, so they will be on top by default)

        m.addSource('itinerary-amenities', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        m.addLayer({
          id: 'itinerary-amenities-circles',
          type: 'circle',
          source: 'itinerary-amenities',
          maxzoom: 15.9,
          filter: ['==', ['get', 'type'], 'cluster'],
          paint: {
            'circle-color': '#ffffff',
            'circle-opacity': 0.8,
            'circle-radius': 12,
            'circle-stroke-color': THEME.accent,
            'circle-stroke-width': 1,
          },
        });

        m.addLayer({
          id: 'itinerary-amenities-markers',
          type: 'symbol',
          source: 'itinerary-amenities',
          maxzoom: 15.9,
          filter: ['==', ['get', 'type'], 'cluster'],
          layout: {
            'text-field': ['get', 'marker'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 14,
            'text-allow-overlap': true,
            'text-anchor': 'center',
          },
          paint: {
            'text-color': THEME.textPrimary,
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        });

        m.addLayer({
          id: 'itinerary-amenities-individual',
          type: 'symbol',
          source: 'itinerary-amenities',
          minzoom: 16,
          filter: ['==', ['get', 'type'], 'individual'],
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': 1.2,
            'icon-allow-overlap': true,
            'icon-anchor': 'center',
          },
        });

        m.addLayer({
          id: 'itinerary-amenities-selected',
          type: 'circle',
          source: 'itinerary-amenities',
          filter: ['all', ['==', ['get', 'type'], 'cluster'], ['==', ['get', 'key'], '']],
          paint: {
            'circle-color': 'transparent',
            'circle-radius': 14,
            'circle-stroke-color': THEME.accent,
            'circle-stroke-width': 3,
          },
        });

        m.on('mouseenter', 'itinerary-amenities-circles', () => {
          m.getCanvas().style.setProperty('cursor', 'pointer');
        });
        m.on('mouseenter', 'itinerary-amenities-individual', () => {
          m.getCanvas().style.setProperty('cursor', 'pointer');
        });

        m.on('mouseleave', 'itinerary-amenities-circles', () => {
          m.getCanvas().style.removeProperty('cursor');
          hoverKey = null;
          setDevTagsOverlay(null);
        });
        m.on('mouseleave', 'itinerary-amenities-individual', () => {
          m.getCanvas().style.removeProperty('cursor');
          hoverKey = null;
          setDevTagsOverlay(null);
        });

        m.on('mousemove', 'itinerary-amenities-circles', (e) => {
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

        m.on('mousemove', 'itinerary-amenities-individual', (e) => {
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

        m.on('click', (e) => {
          const features = m.queryRenderedFeatures(e.point, {
            layers: ['itinerary-amenities-circles', 'itinerary-amenities-individual'],
          });
          if (!features || features.length === 0) {
            onSelectClusterKey(null);
            setDevTagsOverlay(null);
          } else {
            const feature = features[0];
            const key = feature.properties?.key;
            if (typeof key === 'string') {
              onSelectClusterKey(key);
            }
          }
        });

        setIsMapLoaded(true);
        setTimeout(() => m.resize(), 100);
      });
    };

    if (typeof styleUrl === 'string' && styleUrl.startsWith('http')) {
      fetch(styleUrl)
        .then((r) => r.json())
        .then((style) => {
          initMap(style);
        })
        .catch(() => {
          initMap(styleUrl);
        });
    } else {
      initMap(styleUrl);
    }

    return () => {
      resizeObserver?.disconnect();
      map.current?.remove();
      map.current = null;
      setIsMapLoaded(false);
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
        if (src) {
          src.setData(geojson as any);
          const bounds = getBounds(geojson);
          if (bounds) {
            map.current.fitBounds(bounds, { padding: 20 });
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load route geojson for itinerary', err);
      });
  }, [routeOsmId, isMapLoaded]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    map.current.setFilter('itinerary-amenities-selected', [
      'all',
      ['==', ['get', 'type'], 'cluster'],
      ['==', ['get', 'key'], selectedClusterKey ?? ''],
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
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f3f4f6',
        }}
      />
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
