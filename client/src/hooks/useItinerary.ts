import * as React from 'react';
import { AmenityCluster, RouteAmenity } from '../types';
import { ItineraryService } from '../services/itineraryService';
import { buildAmenityClusters } from '../screens/itinerary/itineraryModel';

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
        setClusters(buildAmenityClusters(filtered, clusterBucketKm));
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
