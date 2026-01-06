import { useEffect, useState, useCallback } from 'react';

// @ts-ignore - MMKV is a value constructor, TypeScript sometimes has trouble with ESM/CJS mix
import { MMKV } from 'react-native-mmkv';
import type { AmenityFilterPreset, AmenityFilterSchema } from '../types';

export interface UseFilterStorageReturn {
  presets: AmenityFilterPreset[];
  loading: boolean;
  error: string | null;
  savePreset: (preset: AmenityFilterPreset) => Promise<void>;
  loadPreset: (id: string) => Promise<AmenityFilterPreset | null>;
  deletePreset: (id: string) => Promise<void>;
  getActiveFilterId: () => string | null;
  setActiveFilterId: (id: string) => void;
  getActiveFilter: () => AmenityFilterSchema | null;
  setActiveFilter: (filter: AmenityFilterSchema) => void;
}

// @ts-expect-error - MMKV is a value constructor, TypeScript sometimes has trouble with ESM/CJS mix
const storage = new MMKV({ id: 'amenityFilters' });
const PRESETS_KEY = 'presets';
const ACTIVE_FILTER_KEY = 'activeFilterId';
const ACTIVE_FILTER_SCHEMA_KEY = 'activeFilterSchema';

/**
 * Hook for managing amenity filter storage on native (MMKV).
 * This is the native-specific implementation.
 */
export const useFilterStorage = (): UseFilterStorageReturn => {
  const [presets, setPresets] = useState<AmenityFilterPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load presets on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const presetsJson = storage.getString(PRESETS_KEY);
        if (presetsJson) {
          const loaded: AmenityFilterPreset[] = JSON.parse(presetsJson);
          setPresets(loaded.filter((p) => p.isCustom)); // Only custom presets
        }
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const savePreset = useCallback(async (preset: AmenityFilterPreset) => {
    try {
      setPresets((prev) => {
        const existing = prev.findIndex((p) => p.id === preset.id);
        let updated: AmenityFilterPreset[];
        if (existing >= 0) {
          updated = [...prev];
          updated[existing] = preset;
        } else {
          updated = [...prev, preset];
        }
        storage.set(PRESETS_KEY, JSON.stringify(updated));
        return updated;
      });
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      throw err;
    }
  }, []);

  const loadPreset = useCallback(async (id: string): Promise<AmenityFilterPreset | null> => {
    try {
      const presetsJson = storage.getString(PRESETS_KEY);
      if (!presetsJson) return null;

      const allPresets: AmenityFilterPreset[] = JSON.parse(presetsJson);
      const preset = allPresets.find((p) => p.id === id);
      setError(null);
      return preset || null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Load failed';
      setError(msg);
      throw err;
    }
  }, []);

  const deletePreset = useCallback(async (id: string) => {
    try {
      setPresets((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        storage.set(PRESETS_KEY, JSON.stringify(updated));
        return updated;
      });
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
      throw err;
    }
  }, []);

  const getActiveFilterId = useCallback((): string | null => {
    return storage.getString(ACTIVE_FILTER_KEY) || null;
  }, []);

  const setActiveFilterId = useCallback((id: string) => {
    storage.set(ACTIVE_FILTER_KEY, id);
  }, []);

  const getActiveFilter = useCallback((): AmenityFilterSchema | null => {
    try {
      const raw = storage.getString(ACTIVE_FILTER_SCHEMA_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AmenityFilterSchema;
    } catch {
      return null;
    }
  }, []);

  const setActiveFilter = useCallback((filter: AmenityFilterSchema) => {
    try {
      storage.set(ACTIVE_FILTER_SCHEMA_KEY, JSON.stringify(filter));
    } catch {
      // ignore
    }
  }, []);

  return {
    presets,
    loading,
    error,
    savePreset,
    loadPreset,
    deletePreset,
    getActiveFilterId,
    setActiveFilterId,
    getActiveFilter,
    setActiveFilter,
  };
};
