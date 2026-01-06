import { useState, useCallback } from 'react';
import { AmenityFilterSchema, AmenityFilterPreset, AmenityClassRule } from '../types';

export interface UseAmenityFiltersReturn {
  // Current state
  currentFilter: AmenityFilterSchema;
  isDirty: boolean;

  // Replace the entire filter (e.g., load from storage)
  replaceFilter: (next: AmenityFilterSchema, opts?: { markAsBaseline?: boolean }) => void;

  // Global controls
  setShowAll: (show: boolean) => void;
  setGlobalDistance: (distance: number) => void;

  // Category/class controls
  setClassRule: (classKey: string, rule: Partial<AmenityClassRule>) => void;
  toggleSubclass: (classKey: string, subclass: string, enabled: boolean) => void;
  getEffectiveDistance: (classKey: string) => number;
  getEffectiveEnabled: (classKey: string) => boolean;
  getSubclassEnabled: (classKey: string, subclass: string) => boolean;

  // Actions
  applyPreset: (preset: AmenityFilterPreset) => void;
  reset: () => void;
}

/**
 * Hook for managing amenity filter state.
 * Provides methods for updating global defaults, class rules, and subclass overrides.
 */
export const useAmenityFilters = (initialFilter: AmenityFilterSchema): UseAmenityFiltersReturn => {
  const [currentFilter, setCurrentFilter] = useState<AmenityFilterSchema>(initialFilter);
  const [baselineFilter, setBaselineFilter] = useState<AmenityFilterSchema>(initialFilter);

  const isDirty = JSON.stringify(currentFilter) !== JSON.stringify(baselineFilter);

  const replaceFilter = useCallback(
    (next: AmenityFilterSchema, opts?: { markAsBaseline?: boolean }) => {
      setCurrentFilter(next);
      if (opts?.markAsBaseline) {
        setBaselineFilter(next);
      }
    },
    []
  );

  const setShowAll = useCallback((show: boolean) => {
    setCurrentFilter((prev) => ({
      ...prev,
      defaultEnabled: show,
    }));
  }, []);

  const setGlobalDistance = useCallback((distance: number) => {
    setCurrentFilter((prev) => ({
      ...prev,
      defaultMaxDistanceMeters: distance,
    }));
  }, []);

  const setClassRule = useCallback((classKey: string, rule: Partial<AmenityClassRule>) => {
    setCurrentFilter((prev) => ({
      ...prev,
      classes: {
        ...prev.classes,
        [classKey]: {
          ...prev.classes[classKey],
          ...rule,
        },
      },
    }));
  }, []);

  const toggleSubclass = useCallback((classKey: string, subclass: string, enabled: boolean) => {
    setCurrentFilter((prev) => {
      const classRule = prev.classes[classKey] || {};
      return {
        ...prev,
        classes: {
          ...prev.classes,
          [classKey]: {
            ...classRule,
            subclasses: {
              ...classRule.subclasses,
              [subclass]: { enabled },
            },
          },
        },
      };
    });
  }, []);

  const getEffectiveDistance = useCallback(
    (classKey: string): number => {
      const classRule = currentFilter.classes[classKey];
      return classRule?.maxDistanceMeters ?? currentFilter.defaultMaxDistanceMeters;
    },
    [currentFilter]
  );

  const getEffectiveEnabled = useCallback(
    (classKey: string): boolean => {
      const classRule = currentFilter.classes[classKey];
      return classRule?.enabled ?? currentFilter.defaultEnabled;
    },
    [currentFilter]
  );

  const getSubclassEnabled = useCallback(
    (classKey: string, subclass: string): boolean => {
      const classRule = currentFilter.classes[classKey];
      const subclassRule = classRule?.subclasses?.[subclass];
      return subclassRule?.enabled ?? getEffectiveEnabled(classKey);
    },
    [currentFilter, getEffectiveEnabled]
  );

  const applyPreset = useCallback((preset: AmenityFilterPreset) => {
    setCurrentFilter(preset.data);
    setBaselineFilter(preset.data);
  }, []);

  const reset = useCallback(() => {
    setCurrentFilter(baselineFilter);
  }, [baselineFilter]);

  return {
    currentFilter,
    isDirty,
    replaceFilter,
    setShowAll,
    setGlobalDistance,
    setClassRule,
    toggleSubclass,
    getEffectiveDistance,
    getEffectiveEnabled,
    getSubclassEnabled,
    applyPreset,
    reset,
  };
};
