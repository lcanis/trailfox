import * as React from 'react';
import { AmenityCluster, RouteAmenity } from '../types';
import { ItineraryService } from '../services/itineraryService';

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

const buildClusters = (amenities: RouteAmenity[], bucketKm: number): AmenityCluster[] => {
  const map = new Map<string, AmenityCluster>();

  for (const amenity of amenities) {
    const bucket = roundTo(amenity.trail_km, bucketKm);
    const key = `${bucket.toFixed(3)}`;

    let cluster = map.get(key);
    if (!cluster) {
      cluster = {
        key,
        trail_km: bucket,
        amenities: [],
        countsByClass: {},
        size: 0,
        lon: 0,
        lat: 0,
      };
      map.set(key, cluster);
    }

    cluster.amenities.push(amenity);
    cluster.countsByClass[amenity.class] = (cluster.countsByClass[amenity.class] ?? 0) + 1;
  }

  for (const cluster of map.values()) {
    cluster.size = cluster.amenities.length;
    const lonSum = cluster.amenities.reduce((sum, a) => sum + a.lon, 0);
    const latSum = cluster.amenities.reduce((sum, a) => sum + a.lat, 0);
    cluster.lon = lonSum / cluster.size;
    cluster.lat = latSum / cluster.size;
  }

  return [...map.values()].sort((a, b) => a.trail_km - b.trail_km);
};

export const useItinerary = (params: {
  routeOsmId: number | null;
  maxDistanceFromTrailM?: number;
  clusterBucketKm?: number;
  timeoutMs?: number;
  allowedClasses?: string[];
}) => {
  const {
    routeOsmId,
    maxDistanceFromTrailM = 1000,
    clusterBucketKm = 0.5,
    timeoutMs = 8000,
    allowedClasses,
  } = params;

  const [rawAmenities, setRawAmenities] = React.useState<RouteAmenity[]>([]);
  const [clusters, setClusters] = React.useState<AmenityCluster[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!routeOsmId) {
        setRawAmenities([]);
        setClusters([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await ItineraryService.fetchRouteAmenities({
          routeOsmId,
          maxDistanceFromTrailM,
          timeoutMs,
        });
        if (cancelled) return;
        setRawAmenities(data);
        const filtered =
          allowedClasses && allowedClasses.length > 0
            ? data.filter((a) => allowedClasses.includes(a.class))
            : data;
        setClusters(buildClusters(filtered, clusterBucketKm));
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
        setRawAmenities([]);
        setClusters([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [routeOsmId, maxDistanceFromTrailM, clusterBucketKm, timeoutMs, allowedClasses]);

  return { rawAmenities, clusters, loading, error };
};
