import * as turf from '@turf/turf';
import { calculateUserMetrics } from '../itineraryMetrics';

describe('itineraryMetrics', () => {
  const line = turf.lineString([
    [0, 0],
    [1, 0],
  ]); // ~111km long at equator
  const routeGeoJSON = {
    type: 'Feature',
    geometry: line.geometry,
    properties: {},
  };

  it('calculates kmOnTrail correctly (distance along line, not distance to line)', () => {
    // Point is at [0.5, 0.1]
    // Distance along line should be ~55.5km
    // Distance to line should be ~11.1km
    const userLocation = { latitude: 0.1, longitude: 0.5 };
    const metrics = calculateUserMetrics(userLocation, routeGeoJSON, null);

    expect(metrics).not.toBeNull();
    if (metrics) {
      // kmOnTrail should be around 55.5km
      expect(metrics.kmOnTrail).toBeGreaterThan(50);
      expect(metrics.kmOnTrail).toBeLessThan(60);

      // distanceOffTrail should be around 11.1km
      expect(metrics.distanceOffTrail).toBeGreaterThan(10);
      expect(metrics.distanceOffTrail).toBeLessThan(12);
    }
  });

  it('handles points at the start of the line', () => {
    const userLocation = { latitude: 0.001, longitude: 0.001 };
    const metrics = calculateUserMetrics(userLocation, routeGeoJSON, null);
    expect(metrics?.kmOnTrail).toBeLessThan(1);
  });

  it('handles points at the end of the line', () => {
    const userLocation = { latitude: 0.001, longitude: 0.999 };
    const metrics = calculateUserMetrics(userLocation, routeGeoJSON, null);
    expect(metrics?.kmOnTrail).toBeGreaterThan(110);
  });

  describe('isRouteCircular', () => {
    const { isRouteCircular } = require('../itineraryMetrics');

    it('returns true for circular routes', () => {
      const circular = turf.lineString([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ]);
      expect(isRouteCircular(circular)).toBe(true);
    });

    it('returns false for linear routes', () => {
      const linear = turf.lineString([
        [0, 0],
        [1, 0],
      ]);
      expect(isRouteCircular(linear)).toBe(false);
    });

    it('returns true for pseudo-circular routes (within 200m)', () => {
      const pseudo = turf.lineString([
        [0, 0],
        [1, 0],
        [0.001, 0.001], // very close to [0,0]
      ]);
      expect(isRouteCircular(pseudo)).toBe(true);
    });
  });
});
