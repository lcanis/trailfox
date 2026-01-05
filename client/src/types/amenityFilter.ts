/**
 * Configuration for filtering amenities based on their classification and distance from the trail.
 */
export interface AmenityFilterRule {
  /**
   * Whether amenities matching this rule should be shown in the itinerary.
   */
  enabled?: boolean;
  /**
   * Maximum allowed distance from the trail in meters.
   */
  maxDistanceMeters?: number;
}

/**
 * Rule for a specific class, which can include overrides for its subclasses.
 */
export interface AmenityClassRule extends AmenityFilterRule {
  /**
   * Subclass-specific overrides.
   * Key is the subclass name (e.g., "cafe", "supermarket").
   */
  subclasses?: Record<string, AmenityFilterRule>;
}

/**
 * The root schema for amenity filtering.
 * Allows hierarchical configuration: Global -> Class -> Subclass.
 */
export interface AmenityFilterSchema {
  /**
   * Global default for whether an amenity is enabled if not specified elsewhere.
   */
  defaultEnabled: boolean;
  /**
   * Global default for max distance if not specified elsewhere.
   */
  defaultMaxDistanceMeters: number;
  /**
   * Rules keyed by class name (e.g., "amenity", "shop", "tourism").
   */
  classes: Record<string, AmenityClassRule>;
}

/**
 * A named preset for amenity filtering.
 */
export interface AmenityFilterPreset {
  id: string;
  name: string;
  isPreset: boolean; // true = built-in (Trailside, etc.)
  isCustom: boolean; // true = user-created
  createdAt: number;
  updatedAt: number;
  data: AmenityFilterSchema;
}

/**
 * A category grouping multiple OSM classes together (Water & Toilets, Food & Drink, etc.)
 */
export interface AmenityCategory {
  id: string;
  name: string;
  icon: string; // Unicode emoji or icon name
  osmClasses: string[]; // Which OSM classes belong here
  order: number; // Display order (1-8)
  defaultEnabled: boolean; // Show by default?
  defaultDistance: number; // Suggested max distance (meters)
}

/**
 * A subclass within a category (Restaurant, Cafe, Hotel, etc.)
 */
export interface AmenitySubclass {
  id: string; // e.g. "food.restaurant"
  categoryId: string; // Parent category ID
  name: string; // Display name
  count: number; // Count of amenities with this subclass
}

/**
 * Example configuration:
 *
 * {
 *   "defaultEnabled": true,
 *   "defaultMaxDistanceMeters": 500,
 *   "classes": {
 *     "shop": {
 *       "maxDistanceMeters": 1000,
 *       "subclasses": {
 *         "supermarket": { "maxDistanceMeters": 2000 },
 *         "kiosk": { "enabled": false }
 *       }
 *     },
 *     "amenity": {
 *       "subclasses": {
 *         "toilets": { "maxDistanceMeters": 100 }
 *       }
 *     }
 *   }
 * }
 */
