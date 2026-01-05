import { AmenityFilterPreset, RouteAmenity, AmenityFilterSchema } from '../types';

/**
 * Trailside: Focus on items on or very near the trail.
 */
export const TRAILSIDE_FILTER: AmenityFilterPreset = {
  id: 'low',
  name: 'Trailside',
  isPreset: true,
  isCustom: false,
  createdAt: 0,
  updatedAt: 0,
  data: {
    defaultEnabled: true,
    defaultMaxDistanceMeters: 30,
    classes: {
      place: { enabled: true, maxDistanceMeters: 1000 },
      street: {
        subclasses: {
          bench: { enabled: true, maxDistanceMeters: 30 },
        },
      },
      water: {
        subclasses: {
          drinking_water: { enabled: true, maxDistanceMeters: 100 },
        },
      },
      shelter: {
        subclasses: {
          shelter: { enabled: true, maxDistanceMeters: 100 },
        },
      },
      hygiene: {
        subclasses: {
          toilets: { enabled: true, maxDistanceMeters: 100 },
        },
      },
      tourism: {
        subclasses: {
          viewpoint: { enabled: true, maxDistanceMeters: 100 },
        },
      },
      other: {
        subclasses: {
          information: { enabled: true, maxDistanceMeters: 100 },
        },
      },
    },
  },
};

/**
 * Explorer: Balanced view for day trips.
 */
export const EXPLORER_FILTER: AmenityFilterPreset = {
  id: 'mid',
  name: 'Explorer',
  isPreset: true,
  isCustom: false,
  createdAt: 0,
  updatedAt: 0,
  data: {
    defaultEnabled: true,
    defaultMaxDistanceMeters: 50,
    classes: {
      place: { maxDistanceMeters: 1000 },
      resupply: { maxDistanceMeters: 500 },
      accom: { enabled: false },
    },
  },
};

/**
 * Multi-day: Focus on accommodation and long-distance needs.
 */
export const MULTI_DAY_FILTER: AmenityFilterPreset = {
  id: 'high',
  name: 'Multi-day',
  isPreset: true,
  isCustom: false,
  createdAt: 0,
  updatedAt: 0,
  data: {
    defaultEnabled: false,
    defaultMaxDistanceMeters: 50,
    classes: {
      place: { enabled: true, maxDistanceMeters: 1000 },
      accom: {
        subclasses: {
          hotel: { enabled: true, maxDistanceMeters: 1000 },
          guest_house: { enabled: true, maxDistanceMeters: 1000 },
          hostel: { enabled: true, maxDistanceMeters: 1000 },
          camp_site: { enabled: true, maxDistanceMeters: 1000 },
          alpine_hut: { enabled: true, maxDistanceMeters: 1000 },
          wilderness_hut: { enabled: true, maxDistanceMeters: 1000 },
          caravan_site: { enabled: true, maxDistanceMeters: 1000 },
          chalet: { enabled: true, maxDistanceMeters: 1000 },
        },
      },
    },
  },
};

export const AMENITY_FILTER_PRESETS = [TRAILSIDE_FILTER, EXPLORER_FILTER, MULTI_DAY_FILTER];

/**
 * Checks if an amenity should be shown based on the filter preset.
 */
export const shouldShowAmenity = (amenity: RouteAmenity, filter: AmenityFilterSchema): boolean => {
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
