import { useEffect, useState, useCallback } from 'react';
import { AmenityFilterPreset, AmenityFilterSchema } from '../types';

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

const DB_NAME = 'trailfox';
const STORE_NAME = 'amenityFilters';
const ACTIVE_FILTER_KEY = 'activeFilterId';
const ACTIVE_FILTER_SCHEMA_KEY = 'activeFilterSchema';

/**
 * Open IndexedDB connection.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Save a preset to IndexedDB.
 */
const saveToIndexedDB = async (preset: AmenityFilterPreset): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.put(preset);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

/**
 * Load a preset from IndexedDB.
 */
const loadFromIndexedDB = async (id: string): Promise<AmenityFilterPreset | null> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
};

/**
 * Delete a preset from IndexedDB.
 */
const deleteFromIndexedDB = async (id: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

/**
 * Load all presets from IndexedDB.
 */
const loadAllFromIndexedDB = async (): Promise<AmenityFilterPreset[]> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
};

/**
 * Hook for managing amenity filter storage on web (IndexedDB + localStorage).
 * This is the web-specific implementation.
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
        const loaded = await loadAllFromIndexedDB();
        setPresets(loaded.filter((p) => p.isCustom)); // Only custom presets
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
      await saveToIndexedDB(preset);
      setPresets((prev) => {
        const existing = prev.findIndex((p) => p.id === preset.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = preset;
          return updated;
        }
        return [...prev, preset];
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
      const preset = await loadFromIndexedDB(id);
      setError(null);
      return preset;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Load failed';
      setError(msg);
      throw err;
    }
  }, []);

  const deletePreset = useCallback(async (id: string) => {
    try {
      await deleteFromIndexedDB(id);
      setPresets((prev) => prev.filter((p) => p.id !== id));
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
      throw err;
    }
  }, []);

  const getActiveFilterId = useCallback((): string | null => {
    return localStorage.getItem(ACTIVE_FILTER_KEY);
  }, []);

  const setActiveFilterId = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_FILTER_KEY, id);
  }, []);

  const getActiveFilter = useCallback((): AmenityFilterSchema | null => {
    try {
      const raw = localStorage.getItem(ACTIVE_FILTER_SCHEMA_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AmenityFilterSchema;
    } catch {
      return null;
    }
  }, []);

  const setActiveFilter = useCallback((filter: AmenityFilterSchema) => {
    try {
      localStorage.setItem(ACTIVE_FILTER_SCHEMA_KEY, JSON.stringify(filter));
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
