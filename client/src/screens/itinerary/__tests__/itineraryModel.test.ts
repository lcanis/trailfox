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
  test('buildAmenityClusters groups by spatial proximity using DBSCAN', () => {
    const amenities: RouteAmenity[] = [
      // Cluster 1: two points very close to each other
      makeAmenity({ trail_km: 1.0, lon: 6.1234, lat: 49.5678, class: 'food' }),
      makeAmenity({ trail_km: 1.1, lon: 6.1235, lat: 49.5679, class: 'water' }),
      // Cluster 2: one point far away
      makeAmenity({ trail_km: 5.0, lon: 6.2, lat: 49.6, class: 'food' }),
    ];

    const clusters = buildAmenityClusters(amenities, 0.5);

    expect(clusters).toHaveLength(2);

    // First cluster should have 2 items
    expect(clusters[0].size).toBe(2);
    expect(clusters[0].trail_km).toBeCloseTo(1.05);
    expect(clusters[0].countsByClass).toEqual({ food: 1, water: 1 });

    // Second cluster should have 1 item
    expect(clusters[1].size).toBe(1);
    expect(clusters[1].trail_km).toBe(5.0);
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
        countsByIcon: { food_generic: 1 },
        size: 1,
        lon: 1,
        lat: 1,
      },
      {
        key: 'near-end',
        trail_km: 1.0004,
        amenities: [makeAmenity({ trail_km: 1.0004 })],
        countsByClass: { food: 1 },
        countsByIcon: { food_generic: 1 },
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
      countsByIcon: {},
      size: 2,
      lon: 0,
      lat: 0,
    };

    expect(getClusterPlaceTitle(cluster, 1000)).toBe('Village');
  });

  test('getClusterDisplayTitle formats single item as name when available', () => {
    const cluster: AmenityCluster = {
      key: 'x',
      trail_km: 1,
      amenities: [makeAmenity({ class: 'food', name: 'Cafe Central', subclass: 'cafe' })],
      countsByClass: { food: 1 },
      countsByIcon: {},
      size: 1,
      lon: 0,
      lat: 0,
    };

    expect(getClusterDisplayTitle(cluster)).toEqual({
      title: 'Cafe Central',
      isPlaceHeader: false,
    });
  });

  test('getClusterDisplayTitle prefers Place even if multiple items exist', () => {
    const cluster: AmenityCluster = {
      key: 'x',
      trail_km: 1,
      amenities: [
        makeAmenity({ class: 'food', name: 'Cafe Central', subclass: 'cafe' }),
        makeAmenity({ class: 'Place', name: 'Village', subclass: 'village' }),
      ],
      countsByClass: { food: 1, Place: 1 },
      countsByIcon: {},
      size: 2,
      lon: 0,
      lat: 0,
    };

    expect(getClusterDisplayTitle(cluster)).toEqual({
      title: 'Village',
      isPlaceHeader: true,
    });
  });

  test('getClusterDisplayTitle prefers subclass over class for multiple items', () => {
    const cluster: AmenityCluster = {
      key: 'x',
      trail_km: 1,
      amenities: [
        makeAmenity({ class: 'tourism', subclass: 'bench' }),
        makeAmenity({ class: 'tourism', subclass: 'bench' }),
      ],
      countsByClass: { tourism: 2 },
      countsByIcon: {},
      size: 2,
      lon: 0,
      lat: 0,
    };

    expect(getClusterDisplayTitle(cluster)).toEqual({
      title: 'Bench',
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
        countsByIcon: {},
        size: 1,
        lon: 0,
        lat: 0,
      },
    ];

    expect(sanitizeSelectedClusterKey({ selectedKey: 'a', clusters })).toBe('a');
    expect(sanitizeSelectedClusterKey({ selectedKey: 'missing', clusters })).toBeNull();
  });
});
