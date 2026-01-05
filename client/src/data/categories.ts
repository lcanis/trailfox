import { AmenityCategory } from '../types';

/**
 * The 8 main amenity categories, organized by frequency of use.
 * Order reflects typical hiker needs: Water → Food → Rest → Navigation → Tourism → Services → Accommodation → Safety
 */
export const AMENITY_CATEGORIES: AmenityCategory[] = [
  {
    id: 'water-toilets',
    name: 'Water & Toilets',
    icon: '💧',
    osmClasses: ['water', 'hygiene'],
    order: 1,
    defaultEnabled: true,
    defaultDistance: 100,
  },
  {
    id: 'food-drink',
    name: 'Food & Drink',
    icon: '🍽️',
    osmClasses: ['food'],
    order: 2,
    defaultEnabled: true,
    defaultDistance: 500,
  },
  {
    id: 'rest-shelter',
    name: 'Rest & Shelter',
    icon: '🪑',
    osmClasses: ['shelter', 'street'],
    order: 3,
    defaultEnabled: true,
    defaultDistance: 100,
  },
  {
    id: 'navigation',
    name: 'Navigation',
    icon: '🗺️',
    osmClasses: ['transport', 'place'],
    order: 4,
    defaultEnabled: true,
    defaultDistance: 2000,
  },
  {
    id: 'tourism-culture',
    name: 'Tourism & Culture',
    icon: '🏛️',
    osmClasses: ['tourism', 'religious'],
    order: 5,
    defaultEnabled: true,
    defaultDistance: 2000,
  },
  {
    id: 'services',
    name: 'Services',
    icon: '🛒',
    osmClasses: ['cash', 'resupply', 'medical'],
    order: 6,
    defaultEnabled: true,
    defaultDistance: 2000,
  },
  {
    id: 'accommodation',
    name: 'Accommodation',
    icon: '🛏️',
    osmClasses: ['accom'],
    order: 7,
    defaultEnabled: false, // Off by default - only needed for multi-day trips
    defaultDistance: 5000,
  },
  {
    id: 'safety-info',
    name: 'Safety & Info',
    icon: '⚠️',
    osmClasses: ['other'],
    order: 8,
    defaultEnabled: true,
    defaultDistance: 2000,
  },
];

/**
 * Get categories sorted by their display order.
 */
export const sortCategories = (categories: AmenityCategory[]): AmenityCategory[] => {
  return [...categories].sort((a, b) => a.order - b.order);
};

/**
 * Find a category by its ID.
 */
export const getCategoryById = (id: string): AmenityCategory | undefined => {
  return AMENITY_CATEGORIES.find((c) => c.id === id);
};

/**
 * Find which category an OSM class belongs to.
 */
export const getCategoryForOsmClass = (osmClass: string): AmenityCategory | undefined => {
  return AMENITY_CATEGORIES.find((c) => c.osmClasses.includes(osmClass));
};
