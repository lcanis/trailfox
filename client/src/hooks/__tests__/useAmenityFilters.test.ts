import { renderHook, act } from '@testing-library/react-native';
import { useAmenityFilters } from '../useAmenityFilters';
import { AmenityFilterSchema, AmenityFilterPreset } from '../../types';

describe('useAmenityFilters', () => {
  const initialFilter: AmenityFilterSchema = {
    defaultEnabled: true,
    defaultMaxDistanceMeters: 500,
    classes: {
      water: { maxDistanceMeters: 100 },
      food: { enabled: true, maxDistanceMeters: 200 },
    },
  };

  describe('initialization', () => {
    it('should initialize with provided filter', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      expect(result.current.currentFilter).toEqual(initialFilter);
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('global controls', () => {
    it('should toggle show all', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      act(() => {
        result.current.setShowAll(false);
      });

      expect(result.current.currentFilter.defaultEnabled).toBe(false);
      expect(result.current.isDirty).toBe(true);
    });

    it('should set global distance', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      act(() => {
        result.current.setGlobalDistance(1000);
      });

      expect(result.current.currentFilter.defaultMaxDistanceMeters).toBe(1000);
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('class rules', () => {
    it('should set class rule', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      act(() => {
        result.current.setClassRule('tourism', { enabled: false, maxDistanceMeters: 300 });
      });

      expect(result.current.currentFilter.classes.tourism).toEqual({
        enabled: false,
        maxDistanceMeters: 300,
      });
    });

    it('should merge class rule with existing', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      act(() => {
        result.current.setClassRule('food', { maxDistanceMeters: 500 });
      });

      expect(result.current.currentFilter.classes.food).toEqual({
        enabled: true,
        maxDistanceMeters: 500,
      });
    });

    it('should get effective distance from class rule', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      expect(result.current.getEffectiveDistance('water')).toBe(100);
      expect(result.current.getEffectiveDistance('food')).toBe(200);
      expect(result.current.getEffectiveDistance('tourism')).toBe(500); // Global default
    });

    it('should get effective enabled from class rule', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      expect(result.current.getEffectiveEnabled('food')).toBe(true);
      expect(result.current.getEffectiveEnabled('tourism')).toBe(true); // Global default
    });
  });

  describe('subclass controls', () => {
    it('should toggle subclass', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      act(() => {
        result.current.toggleSubclass('food', 'fast_food', false);
      });

      expect(result.current.currentFilter.classes.food.subclasses?.fast_food).toEqual({
        enabled: false,
      });
    });

    it('should get subclass enabled state', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      act(() => {
        result.current.toggleSubclass('food', 'restaurant', true);
        result.current.toggleSubclass('food', 'fast_food', false);
      });

      expect(result.current.getSubclassEnabled('food', 'restaurant')).toBe(true);
      expect(result.current.getSubclassEnabled('food', 'fast_food')).toBe(false);
      expect(result.current.getSubclassEnabled('food', 'cafe')).toBe(true); // Inherits from class
    });
  });

  describe('preset management', () => {
    it('should apply preset', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      const preset: AmenityFilterPreset = {
        id: 'test-preset',
        name: 'Test Preset',
        isPreset: true,
        isCustom: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: {
          defaultEnabled: false,
          defaultMaxDistanceMeters: 200,
          classes: {},
        },
      };

      act(() => {
        result.current.applyPreset(preset);
      });

      expect(result.current.currentFilter).toEqual(preset.data);
      expect(result.current.isDirty).toBe(false);
    });

    it('should reset to original filter', () => {
      const { result } = renderHook(() => useAmenityFilters(initialFilter));

      act(() => {
        result.current.setShowAll(false);
        result.current.setGlobalDistance(1000);
      });

      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.currentFilter).toEqual(initialFilter);
      expect(result.current.isDirty).toBe(false);
    });
  });
});
