import {
  addItineraryEndpointClusters,
  buildAmenityClusters,
  getAvailableClasses,
  getClusterDisplayTitle,
  getClusterPlaceTitle,
  sanitizeSelectedClusterKey,
} from '../itineraryModel';
import type { AmenityCluster, Route, RouteAmenity } from '../../../types';

const makeAmenity = (partial: Partial<RouteAmenity>): RouteAmenity => ({
  route_osm_id: 1,
  osm_type: 'N',
  osm_id: Math.floor(Math.random() * 1_000_000),
  name: null,
  class: 'food',
  subclass: null,
  lon: 10,
  lat: 20,
  distance_from_trail_m: 50,
  trail_km: 1,
  tags: null,
  ...partial,
});

describe('itineraryModel', () => {
  test('buildAmenityClusters groups by rounded trail bucket and computes counts/centroid', () => {
    const amenities: RouteAmenity[] = [
      makeAmenity({ trail_km: 1.24, lon: 10, lat: 20, class: 'food' }),
      makeAmenity({ trail_km: 1.26, lon: 30, lat: 40, class: 'water' }),
      makeAmenity({ trail_km: 1.49, lon: 50, lat: 60, class: 'food' }),
    ];

    const clusters = buildAmenityClusters(amenities, 0.5);

    // 1.24 rounds to 1.0; 1.26 and 1.49 round to 1.5
    expect(clusters.map((c) => c.trail_km)).toEqual([1.0, 1.5]);

    const c10 = clusters[0];
    expect(c10.key).toBe('1.000');
    expect(c10.size).toBe(1);
    expect(c10.countsByClass).toEqual({ food: 1 });

    const c15 = clusters[1];
    expect(c15.key).toBe('1.500');
    expect(c15.size).toBe(2);
    expect(c15.countsByClass).toEqual({ water: 1, food: 1 });
    expect(c15.lon).toBe((30 + 50) / 2);
    expect(c15.lat).toBe((40 + 60) / 2);
  });

  test('buildAmenityClusters rounds half-up at exact midpoints', () => {
    const amenities: RouteAmenity[] = [makeAmenity({ trail_km: 1.25 })];
    const clusters = buildAmenityClusters(amenities, 0.5);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].trail_km).toBe(1.5);
  });

  test('addItineraryEndpointClusters injects start/end Place clusters when missing', () => {
    const route: Route = {
      osm_id: 123,
      name: 'Test Route',
      network: null,
      length_m: 10_000,
      route_type: null,
      symbol: null,
      merged_geom_type: null,
      tags: { from: 'A', to: 'B' },
    };

    const clusters: AmenityCluster[] = buildAmenityClusters(
      [makeAmenity({ trail_km: 2, lon: 1, lat: 2 }), makeAmenity({ trail_km: 8, lon: 3, lat: 4 })],
      0.5
    );

    const withEndpoints = addItineraryEndpointClusters({ clusters, route });

    expect(withEndpoints[0].trail_km).toBe(0);
    expect(withEndpoints[0].amenities[0].class).toBe('Place');
    expect(withEndpoints[0].amenities[0].name).toBe('A');

    expect(withEndpoints[withEndpoints.length - 1].trail_km).toBe(10);
    expect(withEndpoints[withEndpoints.length - 1].amenities[0].class).toBe('Place');
    expect(withEndpoints[withEndpoints.length - 1].amenities[0].name).toBe('B');

    // Always sorted.
    const kms = withEndpoints.map((c) => c.trail_km);
    expect([...kms].sort((a, b) => a - b)).toEqual(kms);
  });

  test('addItineraryEndpointClusters does not duplicate endpoints already present (epsilon)', () => {
    const route: Route = {
      osm_id: 123,
      name: 'Test Route',
      network: null,
      length_m: 1000,
      route_type: null,
      symbol: null,
      merged_geom_type: null,
      tags: null,
    };

    const clusters: AmenityCluster[] = [
      {
        key: 'near-start',
        trail_km: 0.0005,
        amenities: [makeAmenity({ trail_km: 0.0005 })],
        countsByClass: { food: 1 },
        size: 1,
        lon: 1,
        lat: 1,
      },
      {
        key: 'near-end',
        trail_km: 1.0004,
        amenities: [makeAmenity({ trail_km: 1.0004 })],
        countsByClass: { food: 1 },
        size: 1,
        lon: 2,
        lat: 2,
      },
    ];

    const withEndpoints = addItineraryEndpointClusters({ clusters, route });
    expect(withEndpoints).toHaveLength(2);
  });

  test('getClusterPlaceTitle picks closest Place under threshold and formats subclass', () => {
    const cluster: AmenityCluster = {
      key: 'x',
      trail_km: 1,
      amenities: [
        makeAmenity({ class: 'Place', name: null, subclass: 'village', distance_from_trail_m: 40 }),
        makeAmenity({
          class: 'Place',
          name: 'Named Place',
          subclass: null,
          distance_from_trail_m: 50,
        }),
      ],
      countsByClass: { Place: 2 },
      size: 2,
      lon: 0,
      lat: 0,
    };

    expect(getClusterPlaceTitle(cluster, 1000)).toBe('Village');
  });

  test('getClusterDisplayTitle formats single item as "subclass: name" when available', () => {
    const cluster: AmenityCluster = {
      key: 'x',
      trail_km: 1,
      amenities: [makeAmenity({ class: 'food', name: 'Cafe Central', subclass: 'cafe' })],
      countsByClass: { food: 1 },
      size: 1,
      lon: 0,
      lat: 0,
    };

    expect(getClusterDisplayTitle(cluster)).toEqual({
      title: 'Cafe: Cafe Central',
      isPlaceHeader: false,
    });
  });

  test('getAvailableClasses returns classes sorted by descending frequency', () => {
    const raw = [
      makeAmenity({ class: 'food' }),
      makeAmenity({ class: 'water' }),
      makeAmenity({ class: 'food' }),
    ];

    expect(getAvailableClasses(raw)).toEqual(['food', 'water']);
  });

  test('sanitizeSelectedClusterKey clears selection if cluster disappears', () => {
    const clusters: AmenityCluster[] = [
      {
        key: 'a',
        trail_km: 0,
        amenities: [makeAmenity({ trail_km: 0 })],
        countsByClass: { food: 1 },
        size: 1,
        lon: 0,
        lat: 0,
      },
    ];

    expect(sanitizeSelectedClusterKey({ selectedKey: 'a', clusters })).toBe('a');
    expect(sanitizeSelectedClusterKey({ selectedKey: 'missing', clusters })).toBeNull();
  });
});
