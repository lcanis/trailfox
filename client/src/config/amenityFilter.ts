import { AmenityFilterPreset, RouteAmenity } from '../types';

/**
 * Trailside: Focus on items on or very near the trail.
 */
export const TRAILSIDE_FILTER: AmenityFilterPreset = {
  id: 'low',
  label: 'Trailside',
  icon: 'footsteps',
  defaultEnabled: false,
  defaultMaxDistanceMeters: 50,
  classes: {
    place: { enabled: true, maxDistanceMeters: 1000 },
    amenity: {
      subclasses: {
        bench: { enabled: true, maxDistanceMeters: 30 },
        drinking_water: { enabled: true, maxDistanceMeters: 100 },
        shelter: { enabled: true, maxDistanceMeters: 100 },
        toilets: { enabled: true, maxDistanceMeters: 100 },
      },
    },
    tourism: {
      subclasses: {
        viewpoint: { enabled: true, maxDistanceMeters: 100 },
        information: { enabled: true, maxDistanceMeters: 100 },
      },
    },
  },
};

/**
 * Explorer: Balanced view for day trips.
 */
export const EXPLORER_FILTER: AmenityFilterPreset = {
  id: 'mid',
  label: 'Explorer',
  icon: 'map',
  defaultEnabled: true,
  defaultMaxDistanceMeters: 300,
  classes: {
    place: { maxDistanceMeters: 1000 },
    shop: { maxDistanceMeters: 500 },
    tourism: {
      subclasses: {
        hotel: { enabled: false },
        guest_house: { enabled: false },
        hostel: { enabled: false },
      },
    },
  },
};

/**
 * Multi-day: Focus on accommodation and long-distance needs.
 */
export const MULTI_DAY_FILTER: AmenityFilterPreset = {
  id: 'high',
  label: 'Multi-day',
  icon: 'bed',
  defaultEnabled: true,
  defaultMaxDistanceMeters: 1000,
  classes: {
    place: { maxDistanceMeters: 1000 },
    tourism: {
      subclasses: {
        hotel: { maxDistanceMeters: 2000 },
        guest_house: { maxDistanceMeters: 2000 },
        hostel: { maxDistanceMeters: 2000 },
        camp_site: { maxDistanceMeters: 2000 },
      },
    },
  },
};

export const AMENITY_FILTER_PRESETS = [TRAILSIDE_FILTER, EXPLORER_FILTER, MULTI_DAY_FILTER];

/**
 * Checks if an amenity should be shown based on the filter preset.
 */
export const shouldShowAmenity = (amenity: RouteAmenity, filter: AmenityFilterPreset): boolean => {
  const { class: cls, subclass, distance_from_trail_m } = amenity.properties;

  const classRule = filter.classes[cls];
  const subclassRule = subclass ? classRule?.subclasses?.[subclass] : undefined;

  // 1. Determine if enabled
  const isEnabled = subclassRule?.enabled ?? classRule?.enabled ?? filter.defaultEnabled;
  if (!isEnabled) return false;

  // 2. Determine max distance
  const maxDist =
    subclassRule?.maxDistanceMeters ??
    classRule?.maxDistanceMeters ??
    filter.defaultMaxDistanceMeters;

  return distance_from_trail_m <= maxDist;
};
