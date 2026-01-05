import {
  shouldShowAmenity,
  getEffectiveEnabled,
  getEffectiveMaxDistance,
  getSubclassEnabled,
  countVisibleAmenities,
  getDisabledAmenities,
} from '../filterLogic';
import { AmenityFilterSchema } from '../../types';

describe('filterLogic', () => {
  const baseFilter: AmenityFilterSchema = {
    defaultEnabled: true,
    defaultMaxDistanceMeters: 500,
    classes: {
      water: { maxDistanceMeters: 100 },
      food: {
        enabled: true,
        maxDistanceMeters: 300,
        subclasses: {
          fast_food: { enabled: false },
          restaurant: { maxDistanceMeters: 500 },
        },
      },
      tourism: { enabled: false },
    },
  };

  describe('shouldShowAmenity', () => {
    it('should show amenity within distance and enabled', () => {
      expect(shouldShowAmenity(baseFilter, 'water', 'drinking_water', 50)).toBe(true);
    });

    it('should not show amenity beyond distance', () => {
      expect(shouldShowAmenity(baseFilter, 'water', 'drinking_water', 200)).toBe(false);
    });

    it('should not show disabled class', () => {
      expect(shouldShowAmenity(baseFilter, 'tourism', 'viewpoint', 50)).toBe(false);
    });

    it('should not show disabled subclass', () => {
      expect(shouldShowAmenity(baseFilter, 'food', 'fast_food', 50)).toBe(false);
    });

    it('should respect subclass distance override', () => {
      expect(shouldShowAmenity(baseFilter, 'food', 'restaurant', 400)).toBe(true);
      expect(shouldShowAmenity(baseFilter, 'food', 'cafe', 400)).toBe(false); // Uses class distance (300m)
    });

    it('should use global defaults when no class rule', () => {
      expect(shouldShowAmenity(baseFilter, 'shelter', null, 400)).toBe(true);
      expect(shouldShowAmenity(baseFilter, 'shelter', null, 600)).toBe(false);
    });
  });

  describe('getEffectiveEnabled', () => {
    it('should return class enabled state', () => {
      expect(getEffectiveEnabled(baseFilter, 'food')).toBe(true);
      expect(getEffectiveEnabled(baseFilter, 'tourism')).toBe(false);
    });

    it('should return global default when no class rule', () => {
      expect(getEffectiveEnabled(baseFilter, 'shelter')).toBe(true);
    });
  });

  describe('getEffectiveMaxDistance', () => {
    it('should return class distance', () => {
      expect(getEffectiveMaxDistance(baseFilter, 'water')).toBe(100);
      expect(getEffectiveMaxDistance(baseFilter, 'food')).toBe(300);
    });

    it('should return global default when no class rule', () => {
      expect(getEffectiveMaxDistance(baseFilter, 'shelter')).toBe(500);
    });
  });

  describe('getSubclassEnabled', () => {
    it('should return subclass enabled state', () => {
      expect(getSubclassEnabled(baseFilter, 'food', 'fast_food')).toBe(false);
    });

    it('should inherit from class when no subclass rule', () => {
      expect(getSubclassEnabled(baseFilter, 'food', 'cafe')).toBe(true);
    });

    it('should inherit from global when no class or subclass rule', () => {
      expect(getSubclassEnabled(baseFilter, 'shelter', 'shelter')).toBe(true);
    });
  });

  describe('countVisibleAmenities', () => {
    it('should count amenities that pass the filter', () => {
      const amenities = [
        { class: 'water', subclass: 'drinking_water', distance: 50 },
        { class: 'water', subclass: 'drinking_water', distance: 150 },
        { class: 'food', subclass: 'restaurant', distance: 200 },
        { class: 'food', subclass: 'fast_food', distance: 50 },
        { class: 'tourism', subclass: 'viewpoint', distance: 100 },
      ];

      const count = countVisibleAmenities(baseFilter, amenities);
      expect(count).toBe(2); // water (50m) and food.restaurant (200m)
    });
  });

  describe('getDisabledAmenities', () => {
    it('should identify disabled classes and subclasses', () => {
      const disabled = getDisabledAmenities(baseFilter);

      expect(disabled.classes).toContain('tourism');
      expect(disabled.subclasses).toContainEqual({
        class: 'food',
        subclass: 'fast_food',
      });
    });

    it('should handle filter with no disabled amenities', () => {
      const emptyFilter: AmenityFilterSchema = {
        defaultEnabled: true,
        defaultMaxDistanceMeters: 500,
        classes: {},
      };

      const disabled = getDisabledAmenities(emptyFilter);

      expect(disabled.classes).toHaveLength(0);
      expect(disabled.subclasses).toHaveLength(0);
    });
  });
});
