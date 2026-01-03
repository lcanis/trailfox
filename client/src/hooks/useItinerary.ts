import * as React from 'react';
import { AmenityCluster, RouteAmenity, AmenityFilterPreset } from '../types';
import { ItineraryService } from '../services/itineraryService';
import { buildAmenityClusters } from '../screens/itinerary/itineraryModel';
import { shouldShowAmenity } from '../config/amenityFilter';

export const useItinerary = (params: {
  routeOsmId: number | null;
  filterPreset?: AmenityFilterPreset;
  clusterBucketKm?: number;
  timeoutMs?: number;
  allowedClasses?: string[];
}) => {
  const {
    routeOsmId,
    filterPreset,
    clusterBucketKm = 0.05,
    timeoutMs = 8000,
    allowedClasses,
  } = params;

  const [rawAmenities, setRawAmenities] = React.useState<RouteAmenity[]>([]);
  const [presetFilteredAmenities, setPresetFilteredAmenities] = React.useState<RouteAmenity[]>([]);
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
          timeoutMs,
        });
        if (cancelled) return;
        setRawAmenities(data.features);
      } catch (e) {
        if (cancelled) return;
        setError(e as Error);
        setRawAmenities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [routeOsmId, timeoutMs]);

  React.useEffect(() => {
    let filteredByPreset = rawAmenities;

    // 1. Apply Filter Preset (Offline)
    if (filterPreset) {
      filteredByPreset = filteredByPreset.filter((a) => shouldShowAmenity(a, filterPreset));
    }
    setPresetFilteredAmenities(filteredByPreset);

    // 2. Apply Manual Class Filters
    let finalFiltered = filteredByPreset;
    if (allowedClasses && allowedClasses.length > 0) {
      finalFiltered = finalFiltered.filter((a) => allowedClasses.includes(a.properties.class));
    }

    setClusters(buildAmenityClusters(finalFiltered, clusterBucketKm));
  }, [rawAmenities, filterPreset, allowedClasses, clusterBucketKm]);

  return { rawAmenities, presetFilteredAmenities, clusters, loading, error };
};
