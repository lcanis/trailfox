import { AmenityCluster, RouteAmenity } from '../types';
import { getMapIconName } from '../screens/itinerary/itineraryModel';

export interface ClusterProperties {
  type: 'cluster';
  key: string;
  size: number;
  marker: string;
  trail_km: number;
  selected?: boolean;
}

export interface IndividualAmenityProperties {
  type: 'individual';
  amenityId: string;
  key: string;
  icon: string;
  marker: string;
}

export const createClusterFeature = (c: AmenityCluster, selectedClusterKey?: string | null) => {
  const properties: ClusterProperties = {
    type: 'cluster',
    key: c.key,
    size: c.size,
    marker: String(c.marker ?? ''),
    trail_km: c.trail_km,
  };

  if (selectedClusterKey !== undefined && selectedClusterKey !== null) {
    properties.selected = c.key === selectedClusterKey;
  }

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [c.lon, c.lat] as [number, number],
    },
    properties,
  };
};

/**
 * Creates a GeoJSON Feature for an individual amenity.
 */
export const createIndividualAmenityFeature = (
  c: AmenityCluster,
  a: RouteAmenity,
  index: number
) => {
  const { class: cls, subclass } = a.properties;
  const properties: IndividualAmenityProperties = {
    type: 'individual',
    amenityId: `${c.key}-${index}`,
    key: c.key,
    icon: getMapIconName(cls, subclass),
    marker: '',
  };

  return {
    type: 'Feature' as const,
    geometry: a.geometry,
    properties,
  };
};

/**
 * Creates a combined FeatureCollection containing both clusters and individual amenities.
 */
export const getAmenitiesGeoJSON = (
  clusters: AmenityCluster[],
  selectedClusterKey?: string | null
) => {
  const features: (
    | ReturnType<typeof createClusterFeature>
    | ReturnType<typeof createIndividualAmenityFeature>
  )[] = [];

  clusters.forEach((c) => {
    features.push(createClusterFeature(c, selectedClusterKey));
    c.amenities.forEach((a, i) => {
      features.push(createIndividualAmenityFeature(c, a, i));
    });
  });

  return {
    type: 'FeatureCollection' as const,
    features,
  };
};
