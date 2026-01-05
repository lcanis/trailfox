import { AmenityFilterSchema, AmenityClassRule } from '../types';

/**
 * Apply a filter to determine if an amenity should be shown.
 *
 * @param filter The current filter configuration
 * @param osmClass The OSM class (e.g., "food", "water", "tourism")
 * @param subclass The OSM subclass (e.g., "restaurant", "drinking_water", "viewpoint")
 * @param distance Distance from the trail in meters
 * @returns true if the amenity should be shown, false otherwise
 */
export const shouldShowAmenity = (
  filter: AmenityFilterSchema,
  osmClass: string,
  subclass: string | null,
  distance: number
): boolean => {
  // Get the class rule (or use defaults)
  const classRule: AmenityClassRule | undefined = filter.classes[osmClass];

  // Determine if enabled
  let enabled: boolean;
  if (subclass && classRule?.subclasses?.[subclass]?.enabled !== undefined) {
    // Use subclass-specific enabled setting
    enabled = classRule.subclasses[subclass].enabled!;
  } else if (classRule?.enabled !== undefined) {
    // Use class-level enabled setting
    enabled = classRule.enabled;
  } else {
    // Use global default
    enabled = filter.defaultEnabled;
  }

  if (!enabled) {
    return false;
  }

  // Determine max distance
  let maxDistance: number;
  if (subclass && classRule?.subclasses?.[subclass]?.maxDistanceMeters !== undefined) {
    // Use subclass-specific distance
    maxDistance = classRule.subclasses[subclass].maxDistanceMeters!;
  } else if (classRule?.maxDistanceMeters !== undefined) {
    // Use class-level distance
    maxDistance = classRule.maxDistanceMeters;
  } else {
    // Use global default
    maxDistance = filter.defaultMaxDistanceMeters;
  }

  return distance <= maxDistance;
};

/**
 * Get the effective enabled state for a class.
 */
export const getEffectiveEnabled = (filter: AmenityFilterSchema, osmClass: string): boolean => {
  const classRule = filter.classes[osmClass];
  return classRule?.enabled ?? filter.defaultEnabled;
};

/**
 * Get the effective max distance for a class.
 */
export const getEffectiveMaxDistance = (filter: AmenityFilterSchema, osmClass: string): number => {
  const classRule = filter.classes[osmClass];
  return classRule?.maxDistanceMeters ?? filter.defaultMaxDistanceMeters;
};

/**
 * Get the effective enabled state for a subclass.
 */
export const getSubclassEnabled = (
  filter: AmenityFilterSchema,
  osmClass: string,
  subclass: string
): boolean => {
  const classRule = filter.classes[osmClass];
  const subclassRule = classRule?.subclasses?.[subclass];

  if (subclassRule?.enabled !== undefined) {
    return subclassRule.enabled;
  }

  return getEffectiveEnabled(filter, osmClass);
};

/**
 * Count how many amenities would be shown with the current filter.
 * Used for debugging/analytics.
 */
export const countVisibleAmenities = (
  filter: AmenityFilterSchema,
  amenities: { class: string; subclass: string | null; distance: number }[]
): number => {
  return amenities.filter((amenity) =>
    shouldShowAmenity(filter, amenity.class, amenity.subclass, amenity.distance)
  ).length;
};

/**
 * Get a list of all disabled classes and subclasses.
 * Useful for generating "hidden amenities" messages.
 */
export const getDisabledAmenities = (
  filter: AmenityFilterSchema
): { classes: string[]; subclasses: { class: string; subclass: string }[] } => {
  const disabledClasses: string[] = [];
  const disabledSubclasses: { class: string; subclass: string }[] = [];

  Object.entries(filter.classes).forEach(([osmClass, classRule]) => {
    // Check if the entire class is disabled
    const classEnabled = classRule.enabled ?? filter.defaultEnabled;
    if (!classEnabled) {
      disabledClasses.push(osmClass);
      return;
    }

    // Check for disabled subclasses
    if (classRule.subclasses) {
      Object.entries(classRule.subclasses).forEach(([subclass, subclassRule]) => {
        if (subclassRule.enabled === false) {
          disabledSubclasses.push({ class: osmClass, subclass });
        }
      });
    }
  });

  return { classes: disabledClasses, subclasses: disabledSubclasses };
};
