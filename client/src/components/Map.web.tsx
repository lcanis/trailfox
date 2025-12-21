import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import debounce from 'lodash.debounce';
import { RouteService } from '../services/routeService';
import { getBounds } from '../utils/geo';
import {
  START_LOCATION_MODE,
  PREDEFINED_LOCATIONS,
  DEVELOPER_MODE,
  TILES_BASE_URL,
  WEB_BASEMAP_STYLE_URL,
} from '../config/settings';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [zoom, setZoom] = useState<number>(0);

  // Callback refs so event listeners can call latest prop callbacks without
  // needing to re-register listeners when props change.
  const onHoverRef = useRef(onHover);
  const onSelectRef = useRef(onSelect);
  const onViewChangeRef = useRef(onViewChange);
  const onBboxChangeRef = useRef(onBboxChange);

  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  useEffect(() => {
    onBboxChangeRef.current = onBboxChange;
  }, [onBboxChange]);

  // Debounced hover handler uses the ref to always call the latest callback.
  const handleHoverRef = useRef(
    debounce((id: number | null) => {
      onHoverRef.current(id);
    }, 50)
  );

  useEffect(() => {
    const h = handleHoverRef.current;
    return () => {
      // Cancel pending debounce when unmounting
      h?.cancel?.();
    };
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    let initialCenter: [number, number] = PREDEFINED_LOCATIONS.munich.center;
    let initialZoom = PREDEFINED_LOCATIONS.munich.zoom;

    if (START_LOCATION_MODE !== 'user' && PREDEFINED_LOCATIONS[START_LOCATION_MODE]) {
      initialCenter = PREDEFINED_LOCATIONS[START_LOCATION_MODE].center;
      initialZoom = PREDEFINED_LOCATIONS[START_LOCATION_MODE].zoom;
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: WEB_BASEMAP_STYLE_URL,
      center: initialCenter,
      zoom: initialZoom,
    });

    setZoom(initialZoom);
    map.current.on('zoom', () => setZoom(map.current!.getZoom()));

    if (START_LOCATION_MODE === 'user') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.current?.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 12,
          });
        },
        (error) => {
          console.warn('Geolocation failed', error);
        }
      );
    }

    map.current.on('load', () => {
      if (!map.current) return;
      setIsMapLoaded(true);

      map.current.addSource('routes', {
        type: 'vector',
        tiles: [TILES_BASE_URL + '/mvt_routes/{z}/{x}/{y}'],
        minzoom: 0,
        maxzoom: 20,
      });

      map.current.addLayer({
        id: 'routes-hit-area',
        type: 'line',
        source: 'routes',
        'source-layer': 'routes',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-width': 20,
          'line-opacity': 0,
        },
      });

      map.current.addLayer({
        id: 'routes-highlight',
        type: 'line',
        source: 'routes',
        'source-layer': 'routes',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#FF00FF', // Magenta
          'line-width': 10,
          'line-opacity': 0.6,
        },
        filter: ['==', 'osm_id', -1],
      });

      // Major routes (International/National) - Always visible
      map.current.addLayer({
        id: 'routes-line-major',
        type: 'line',
        source: 'routes',
        'source-layer': 'routes',
        minzoom: 6,
        filter: ['match', ['get', 'network'], ['iwn', 'nwn'], true, false],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['match', ['get', 'network'], 'iwn', '#e41a1c', 'nwn', '#377eb8', '#333'],
          'line-width': ['match', ['get', 'network'], 'iwn', 6, 'nwn', 5, 3],
          'line-opacity': 0.8,
        },
      });

      // Regional routes - Visible from zoom 8
      map.current.addLayer({
        id: 'routes-line-regional',
        type: 'line',
        source: 'routes',
        'source-layer': 'routes',
        minzoom: 8,
        filter: ['==', ['get', 'network'], 'rwn'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#4daf4a',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });

      // Local routes - Visible from zoom 10
      map.current.addLayer({
        id: 'routes-line-local',
        type: 'line',
        source: 'routes',
        'source-layer': 'routes',
        minzoom: 10,
        filter: ['==', ['get', 'network'], 'lwn'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ff7f00',
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });

      // Other routes - Visible from zoom 11
      map.current.addLayer({
        id: 'routes-line-other',
        type: 'line',
        source: 'routes',
        'source-layer': 'routes',
        minzoom: 11,
        filter: ['!in', 'network', 'iwn', 'nwn', 'rwn', 'lwn'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#999999',
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });

      // Events
      map.current.on('mouseenter', 'routes-hit-area', () => {
        map.current?.getCanvas().style.setProperty('cursor', 'pointer');
      });

      map.current.on('mouseleave', 'routes-hit-area', () => {
        map.current?.getCanvas().style.removeProperty('cursor');
        handleHoverRef.current(null);
      });

      map.current.on('mousemove', 'routes-hit-area', (e) => {
        if (e.features && e.features.length > 0) {
          const id = e.features[0].properties.osm_id;
          handleHoverRef.current(id);
        }
      });

      map.current.on('click', 'routes-hit-area', (e) => {
        if (e.features && e.features.length > 0) {
          const id = e.features[0].properties.osm_id;
          onSelectRef.current(id);
        }
      });

      map.current.on('click', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, {
          layers: ['routes-hit-area'],
        });
        if (!features || features.length === 0) {
          onSelectRef.current(null);
        }
      });

      const updateVisible = debounce(() => {
        if (!map.current) return;
        const visibleFeatures = map.current.queryRenderedFeatures({ layers: ['routes-hit-area'] });
        const visibleIds = new Set(visibleFeatures.map((f) => f.properties.osm_id));
        onViewChangeRef.current(visibleIds);

        const bounds = map.current.getBounds();
        const bbox: [number, number, number, number] = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ];
        onBboxChangeRef.current?.(bbox);
      }, 500);

      map.current.on('moveend', updateVisible);
      map.current.on('zoomend', updateVisible);
      map.current.on('sourcedata', (e) => {
        if (e.sourceId === 'routes' && map.current?.isSourceLoaded('routes')) {
          updateVisible();
        }
      });

      // Initial check
      updateVisible();
    });
  }, []);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    if (highlightedId) {
      map.current.setFilter('routes-highlight', ['==', 'osm_id', highlightedId]);
    } else {
      map.current.setFilter('routes-highlight', ['==', 'osm_id', -1]);
    }
  }, [highlightedId, isMapLoaded]);

  useEffect(() => {
    if (!map.current || !isMapLoaded || !selectedId) return;

    // Fetch geometry to pan to it
    RouteService.fetchGeoJSON(selectedId)
      .then((geojson) => {
        const bounds = getBounds(geojson);
        if (bounds) {
          map.current?.fitBounds(bounds, { padding: 50 });
        }
      })
      .catch((err) => console.error('Failed to fit bounds', err));
  }, [selectedId, isMapLoaded]);

  return (
    <View style={styles.container}>
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
      {DEVELOPER_MODE && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>Zoom: {zoom.toFixed(2)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
    position: 'relative',
  },
  map: {
    flex: 1,
    height: '100%',
    width: '100%',
  } as any,
  debugOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 1000,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
