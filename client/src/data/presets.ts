import { AmenityFilterPreset } from '../types';

/**
 * Trailside preset: Only show amenities very close to the trail.
 * Ideal for quick breaks, short hikes, and when you want minimal distraction.
 */
export const TRAILSIDE_PRESET: AmenityFilterPreset = {
  id: 'preset-trailside',
  name: 'Trailside',
  isPreset: true,
  isCustom: false,
  createdAt: 0,
  updatedAt: 0,
  data: {
    defaultEnabled: true,
    defaultMaxDistanceMeters: 100,
    classes: {
      water: { maxDistanceMeters: 50 },
      hygiene: { maxDistanceMeters: 100, subclasses: { toilets: { enabled: true } } },
      shelter: { maxDistanceMeters: 100 },
      street: {
        maxDistanceMeters: 50,
        subclasses: { bench: { enabled: true }, picnic_table: { enabled: true } },
      },
      place: { enabled: false },
      tourism: { enabled: false },
      food: { enabled: false },
      resupply: { enabled: false },
      accom: { enabled: false },
      transport: { enabled: false },
      religious: { enabled: false },
      cash: { enabled: false },
      medical: { enabled: false },
      other: { maxDistanceMeters: 100 },
    },
  },
};

/**
 * Explorer preset: Show amenities within reasonable walking distance.
 * Ideal for day hikes where you might explore nearby towns or attractions.
 */
export const EXPLORER_PRESET: AmenityFilterPreset = {
  id: 'preset-explorer',
  name: 'Explorer',
  isPreset: true,
  isCustom: false,
  createdAt: 0,
  updatedAt: 0,
  data: {
    defaultEnabled: true,
    defaultMaxDistanceMeters: 500,
    classes: {
      water: { maxDistanceMeters: 100 },
      hygiene: { maxDistanceMeters: 200 },
      shelter: { maxDistanceMeters: 100 },
      street: { maxDistanceMeters: 100 },
      place: { maxDistanceMeters: 1000 },
      tourism: { maxDistanceMeters: 500 },
      food: { maxDistanceMeters: 500 },
      resupply: { maxDistanceMeters: 500 },
      accom: { enabled: false },
      transport: { maxDistanceMeters: 1000 },
      religious: { maxDistanceMeters: 500 },
      cash: { maxDistanceMeters: 1000 },
      medical: { maxDistanceMeters: 1000 },
      other: { maxDistanceMeters: 500 },
    },
  },
};

/**
 * Multi-day preset: Show all amenities including accommodation.
 * Ideal for multi-day treks where you need lodging, resupply, and services.
 */
export const MULTI_DAY_PRESET: AmenityFilterPreset = {
  id: 'preset-multiday',
  name: 'Multi-day',
  isPreset: true,
  isCustom: false,
  createdAt: 0,
  updatedAt: 0,
  data: {
    defaultEnabled: true,
    defaultMaxDistanceMeters: 1000,
    classes: {
      water: { maxDistanceMeters: 100 },
      hygiene: { maxDistanceMeters: 200 },
      shelter: { maxDistanceMeters: 100 },
      street: { maxDistanceMeters: 100 },
      place: { maxDistanceMeters: 1000 },
      tourism: { maxDistanceMeters: 500 },
      food: { maxDistanceMeters: 500 },
      resupply: { maxDistanceMeters: 1000 },
      accom: { enabled: true, maxDistanceMeters: 2000 },
      transport: { maxDistanceMeters: 1000 },
      religious: { maxDistanceMeters: 500 },
      cash: { maxDistanceMeters: 1000 },
      medical: { maxDistanceMeters: 1000 },
      other: { maxDistanceMeters: 1000 },
    },
  },
};

/**
 * All built-in presets in display order.
 */
export const BUILT_IN_PRESETS = [TRAILSIDE_PRESET, EXPLORER_PRESET, MULTI_DAY_PRESET];

/**
 * Get a preset by ID (including built-in presets).
 */
export const getPresetById = (id: string): AmenityFilterPreset | undefined => {
  return BUILT_IN_PRESETS.find((p) => p.id === id);
};
