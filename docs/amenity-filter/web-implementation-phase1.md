# Phase 1: Web Amenity Filter Editor Implementation

This is the project structure and component code for the web-based amenity filter editor.

## Project Structure

```
src/
├── components/
│   ├── web/
│   │   ├── AmenityFilterEditor.tsx          # Main container component
│   │   ├── GlobalControls.tsx               # Show all/Hide all + global distance
│   │   ├── PresetSelector.tsx               # Quick presets dropdown
│   │   ├── CategorySidebar.tsx              # Category list with selection
│   │   ├── CategoryCard.tsx                 # Single category card
│   │   └── DetailPanel.tsx                  # Category detail + distance + subclasses
│   └── ...
├── hooks/
│   ├── useAmenityFilters.ts                 # Core filter state logic
│   ├── useFilterStorage.ts                  # IndexedDB persistence
│   └── useFilterCategories.ts               # Category mapping & organization
├── lib/
│   ├── schema.ts                            # Zod schemas for validation
│   ├── categoryMapping.ts                   # OSM class → category mapping
│   ├── filterLogic.ts                       # Apply filter, compute effective distance
│   ├── export.ts                            # JSON export, URL encoding
│   ├── import.ts                            # JSON import, validation
│   └── storage.ts                           # IndexedDB helpers
├── data/
│   ├── presets.ts                           # Built-in presets (Trailside, Explorer, Multi-day)
│   └── categories.ts                        # Category definitions (icons, colors, order)
├── types/
│   └── amenityFilter.ts                     # TypeScript interfaces
└── styles/
    └── AmenityFilterEditor.module.css        # Scoped styles
```

## Type Definitions

```typescript
// src/types/amenityFilter.ts

/**
 * A single filter rule (enabled, distance, etc.)
 */
export interface FilterRule {
  enabled?: boolean;
  maxDistanceMeters?: number;
}

/**
 * A class-level rule (can have subclass overrides)
 */
export interface ClassRule extends FilterRule {
  subclasses?: Record<string, FilterRule>;
}

/**
 * The root amenity filter configuration
 */
export interface AmenityFilterSettings {
  version: number;
  defaultShowAll: boolean;           // Global default: show/hide
  defaultMaxDistanceMeters: number;  // Global default: max distance
  classes: Record<string, ClassRule>;
}

/**
 * A named, saveable filter (preset or custom)
 */
export interface AmenityFilterPreset {
  id: string;
  name: string;
  isPreset: boolean;     // true = built-in (Trailside, etc.)
  isCustom: boolean;     // true = user-created
  createdAt: number;
  updatedAt: number;
  data: AmenityFilterSettings;
}

/**
 * A category (Water & Toilets, Food & Drink, etc.)
 */
export interface AmenityCategory {
  id: string;
  name: string;
  icon: string;                 // Unicode emoji or icon name
  osmClasses: string[];          // Which OSM classes belong here
  order: number;                 // Display order (1-8)
  defaultEnabled: boolean;       // Show by default?
  defaultDistance: number;       // Suggested max distance (meters)
}

/**
 * Subclass (Restaurant, Cafe, Hotel, etc.)
 */
export interface AmenitySubclass {
  id: string;           // e.g. "food.restaurant"
  categoryId: string;   // Parent category ID
  name: string;         // Display name
  count: number;        // Count of amenities with this subclass
}
```

## Core Hooks

### `hooks/useAmenityFilters.ts`

```typescript
import { useState, useCallback } from 'react';
import { AmenityFilterSettings, AmenityFilterPreset } from '../types/amenityFilter';

interface UseAmenityFiltersReturn {
  // Current state
  currentFilter: AmenityFilterSettings;
  isDirty: boolean;

  // Global controls
  setShowAll: (show: boolean) => void;
  setGlobalDistance: (distance: number) => void;

  // Category controls
  setCategory: (classKey: string, rule: Partial<ClassRule>) => void;
  toggleSubclass: (classKey: string, subclass: string, enabled: boolean) => void;

  // Actions
  applyPreset: (preset: AmenityFilterPreset) => void;
  reset: () => void;
  save: (name: string) => Promise<string>; // Returns filter ID
}

export const useAmenityFilters = (
  initialFilter: AmenityFilterSettings,
  onSave?: (filter: AmenityFilterPreset) => Promise<void>
): UseAmenityFiltersReturn => {
  const [currentFilter, setCurrentFilter] = useState<AmenityFilterSettings>(initialFilter);
  const [originalFilter] = useState<AmenityFilterSettings>(initialFilter);

  const isDirty = JSON.stringify(currentFilter) !== JSON.stringify(originalFilter);

  const setShowAll = useCallback((show: boolean) => {
    setCurrentFilter(prev => ({
      ...prev,
      defaultShowAll: show,
    }));
  }, []);

  const setGlobalDistance = useCallback((distance: number) => {
    setCurrentFilter(prev => ({
      ...prev,
      defaultMaxDistanceMeters: distance,
    }));
  }, []);

  const setCategory = useCallback((classKey: string, rule: Partial<ClassRule>) => {
    setCurrentFilter(prev => ({
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
    setCurrentFilter(prev => {
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

  const applyPreset = useCallback((preset: AmenityFilterPreset) => {
    setCurrentFilter(preset.data);
  }, []);

  const reset = useCallback(() => {
    setCurrentFilter(originalFilter);
  }, [originalFilter]);

  const save = useCallback(async (name: string) => {
    const newPreset: AmenityFilterPreset = {
      id: `custom-${Date.now()}`,
      name,
      isPreset: false,
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: currentFilter,
    };

    if (onSave) {
      await onSave(newPreset);
    }

    return newPreset.id;
  }, [currentFilter, onSave]);

  return {
    currentFilter,
    isDirty,
    setShowAll,
    setGlobalDistance,
    setCategory,
    toggleSubclass,
    applyPreset,
    reset,
    save,
  };
};
```

### `hooks/useFilterStorage.ts`

```typescript
import { useEffect, useState } from 'react';
import { AmenityFilterPreset } from '../types/amenityFilter';

interface UseFilterStorageReturn {
  presets: AmenityFilterPreset[];
  loading: boolean;
  error: string | null;
  savePreset: (preset: AmenityFilterPreset) => Promise<void>;
  loadPreset: (id: string) => Promise<AmenityFilterPreset | null>;
  deletePreset: (id: string) => Promise<void>;
  getBuiltInPresets: () => AmenityFilterPreset[];
}

const DB_NAME = 'itinerarius';
const STORE_NAME = 'amenityFilters';

// IndexedDB helpers
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

const saveToIndexedDB = async (preset: AmenityFilterPreset) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.put(preset);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(void 0);
    transaction.onerror = () => reject(transaction.error);
  });
};

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

const deleteFromIndexedDB = async (id: string) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(void 0);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const useFilterStorage = (): UseFilterStorageReturn => {
  const [presets, setPresets] = useState<AmenityFilterPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load presets on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const allPresets: AmenityFilterPreset[] = [];
        
        return new Promise<void>((resolve, reject) => {
          const request = store.getAll();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            setPresets(request.result);
            resolve();
          };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const savePreset = async (preset: AmenityFilterPreset) => {
    try {
      await saveToIndexedDB(preset);
      setPresets(prev => {
        const existing = prev.findIndex(p => p.id === preset.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = preset;
          return updated;
        }
        return [...prev, preset];
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      throw err;
    }
  };

  const loadPreset = async (id: string): Promise<AmenityFilterPreset | null> => {
    try {
      return await loadFromIndexedDB(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Load failed';
      setError(msg);
      throw err;
    }
  };

  const deletePreset = async (id: string) => {
    try {
      await deleteFromIndexedDB(id);
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
      throw err;
    }
  };

  const getBuiltInPresets = (): AmenityFilterPreset[] => {
    // Return from data/presets.ts (imported separately)
    return []; // TODO: import from data/presets
  };

  return {
    presets,
    loading,
    error,
    savePreset,
    loadPreset,
    deletePreset,
    getBuiltInPresets,
  };
};
```

## Category Definitions

### `data/categories.ts`

```typescript
import { AmenityCategory } from '../types/amenityFilter';

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
    osmClasses: ['food', 'resupply'],
    order: 2,
    defaultEnabled: true,
    defaultDistance: 500,
  },
  {
    id: 'rest-shelter',
    name: 'Rest & Shelter',
    icon: '🪑',
    osmClasses: ['shelter'],
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
    defaultEnabled: false, // Off by default
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

export const sortCategories = (categories: AmenityCategory[]): AmenityCategory[] => {
  return [...categories].sort((a, b) => a.order - b.order);
};

export const getCategoryById = (id: string): AmenityCategory | undefined => {
  return AMENITY_CATEGORIES.find(c => c.id === id);
};
```

### `data/presets.ts`

```typescript
import { AmenityFilterPreset } from '../types/amenityFilter';

export const TRAILSIDE_PRESET: AmenityFilterPreset = {
  id: 'preset-trailside',
  name: 'Trailside',
  isPreset: true,
  isCustom: false,
  createdAt: 0,
  updatedAt: 0,
  data: {
    version: 1,
    defaultShowAll: true,
    defaultMaxDistanceMeters: 100,
    classes: {
      water: { maxDistanceMeters: 50 },
      hygiene: { maxDistanceMeters: 100, subclasses: { toilets: { enabled: true } } },
      shelter: { maxDistanceMeters: 100 },
      street: { maxDistanceMeters: 50, subclasses: { bench: { enabled: true }, picnic_table: { enabled: true } } },
      place: { enabled: false },
      tourism: { enabled: false },
      food: { enabled: false },
      resupply: { enabled: false },
      accom: { enabled: false },
    },
  },
};

export const EXPLORER_PRESET: AmenityFilterPreset = {
  id: 'preset-explorer',
  name: 'Explorer',
  isPreset: true,
  isCustom: false,
  createdAt: 0,
  updatedAt: 0,
  data: {
    version: 1,
    defaultShowAll: true,
    defaultMaxDistanceMeters: 500,
    classes: {
      water: { maxDistanceMeters: 100 },
      hygiene: { maxDistanceMeters: 200 },
      shelter: { maxDistanceMeters: 100 },
      place: { maxDistanceMeters: 1000 },
      tourism: { maxDistanceMeters: 500 },
      food: { maxDistanceMeters: 500 },
      resupply: { maxDistanceMeters: 500 },
      accom: { enabled: false },
    },
  },
};

export const MULTI_DAY_PRESET: AmenityFilterPreset = {
  id: 'preset-multiday',
  name: 'Multi-day',
  isPreset: true,
  isCustom: false,
  createdAt: 0,
  updatedAt: 0,
  data: {
    version: 1,
    defaultShowAll: true,
    defaultMaxDistanceMeters: 1000,
    classes: {
      water: { maxDistanceMeters: 100 },
      hygiene: { maxDistanceMeters: 200 },
      shelter: { maxDistanceMeters: 100 },
      place: { maxDistanceMeters: 1000 },
      tourism: { maxDistanceMeters: 500 },
      food: { maxDistanceMeters: 500 },
      resupply: { maxDistanceMeters: 1000 },
      accom: { enabled: true, maxDistanceMeters: 2000 },
    },
  },
};

export const BUILT_IN_PRESETS = [TRAILSIDE_PRESET, EXPLORER_PRESET, MULTI_DAY_PRESET];
```

## Next: Component Implementation

The above provides the foundational types, hooks, and data structures. Next steps:

1. **Build `AmenityFilterEditor.tsx`** — Main component composing all subcomponents
2. **Build `GlobalControls.tsx`** — Global Show all/Hide all + distance slider
3. **Build `CategorySidebar.tsx`** — List of 8 categories with selection
4. **Build `DetailPanel.tsx`** — Expanded category detail + subclass toggles
5. **Build `PresetSelector.tsx`** — Quick preset dropdown
6. **Wire up import/export** — JSON save/load + URL encoding
7. **Test with real OSM data** — Validate category mappings

Ready to proceed with component implementation?
