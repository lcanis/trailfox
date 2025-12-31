import {
  createClusterFeature,
  createIndividualAmenityFeature,
  getAmenitiesGeoJSON,
} from '../itineraryGeoJSON';
import { AmenityCluster, RouteAmenity } from '../../types';

describe('itineraryGeoJSON', () => {
  const mockAmenity: RouteAmenity = {
    route_osm_id: 1,
    osm_type: 'node',
    osm_id: 101,
    name: 'Test Amenity',
    class: 'food',
    subclass: 'restaurant',
    lon: 6.1,
    lat: 49.7,
    distance_from_trail_m: 10,
    trail_km: 1.5,
    tags: {},
  };

  const mockCluster: AmenityCluster = {
    key: 'cluster-1',
    trail_km: 1.5,
    marker: 'A',
    amenities: [mockAmenity],
    countsByClass: { food: 1 },
    countsByIcon: { restaurant: 1 },
    size: 1,
    lon: 6.1,
    lat: 49.7,
  };

  const clusters = [mockCluster];

  test('createClusterFeature', () => {
    const feature = createClusterFeature(mockCluster, 'cluster-1');
    expect(feature.type).toBe('Feature');
    expect(feature.geometry.coordinates).toEqual([6.1, 49.7]);
    expect(feature.properties.key).toBe('cluster-1');
    expect(feature.properties.selected).toBe(true);
    expect(feature.properties.type).toBe('cluster');
  });

  test('createIndividualAmenityFeature', () => {
    const feature = createIndividualAmenityFeature(mockCluster, mockAmenity, 0);
    expect(feature.type).toBe('Feature');
    expect(feature.geometry.coordinates).toEqual([6.1, 49.7]);
    expect(feature.properties.amenityId).toBe('cluster-1-0');
    expect(feature.properties.type).toBe('individual');
    expect(feature.properties.icon).toBe('restaurant');
  });

  test('getAmenitiesGeoJSON', () => {
    const geojson = getAmenitiesGeoJSON(clusters, 'cluster-1');
    expect(geojson.type).toBe('FeatureCollection');
    // 1 cluster + 1 amenity
    expect(geojson.features).toHaveLength(2);

    const clusterFeature = geojson.features.find((f) => f.properties.type === 'cluster');
    expect(clusterFeature).toBeDefined();
    if (clusterFeature && clusterFeature.properties.type === 'cluster') {
      expect(clusterFeature.properties.selected).toBe(true);
    }

    const individualFeature = geojson.features.find((f) => f.properties.type === 'individual');
    expect(individualFeature).toBeDefined();
    expect(individualFeature?.properties.type).toBe('individual');
  });
});
