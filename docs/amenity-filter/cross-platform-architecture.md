# Amenity Filter Editor: Cross-Platform (Expo + Web)

## Critical Architecture Change

**The issue:** Previous docs assumed web-only (TailwindCSS, IndexedDB). But your `client/` is **React Native + Expo with web support**.

**The solution:** Platform-specific implementations using Expo's `.native.tsx` and `.web.tsx` pattern.

---

## New Tech Stack

| Layer | Native (iOS/Android) | Web |
|-------|---------------------|-----|
| **Styling** | React Native Paper or NativeWind | TailwindCSS or styled-components |
| **Storage** | MMKV (via react-native-mmkv) | IndexedDB |
| **Navigation** | React Navigation (already in Expo) | React Router or built-in routing |
| **Forms** | React Hook Form + React Native Paper | React Hook Form + HTML inputs |

---

## New File Structure

```
src/
├── components/
│   ├── AmenityFilterEditor.tsx           # Platform wrapper (imports .native/.web)
│   ├── AmenityFilterEditor.native.tsx    # iOS/Android implementation
│   ├── AmenityFilterEditor.web.tsx       # Web implementation
│   ├── GlobalControls.native.tsx         # RN + Paper components
│   ├── GlobalControls.web.tsx            # HTML + TailwindCSS
│   ├── DetailPanel.native.tsx
│   ├── DetailPanel.web.tsx
│   └── ... (same pattern for other components)
├── hooks/
│   ├── useAmenityFilters.ts              # Shared logic (platform-agnostic)
│   ├── useFilterStorage.native.ts        # MMKV (iOS/Android)
│   ├── useFilterStorage.web.ts           # IndexedDB (web)
│   └── useFilterStorage.ts               # Platform wrapper
├── lib/
│   ├── categoryMapping.ts                # Shared
│   ├── export.ts                         # Shared (JSON logic)
│   ├── import.ts                         # Shared (validation)
│   └── filterLogic.ts                    # Shared
├── data/
│   ├── categories.ts                     # Shared
│   └── presets.ts                        # Shared
└── types/
    └── amenityFilter.ts                  # Shared
```

---

## Platform Detection Pattern

### Example: useFilterStorage Hook

```typescript
// src/hooks/useFilterStorage.ts (wrapper)
export { useFilterStorage } from './useFilterStorage.native';
```

When Bundler (Metro/Webpack) sees `.ts` file with `.native.ts` and `.web.ts` variants, it automatically selects the right one at build time.

---

## Native Implementation (iOS/Android)

### useFilterStorage.native.ts

```typescript
import { useEffect, useState } from 'react';
import { MMKV } from 'react-native-mmkv';
import { AmenityFilterPreset, AmenityFilterSettings } from '../types/amenityFilter';

const filterStorage = new MMKV({ id: 'amenityFilters' });

export interface UseFilterStorageReturn {
  presets: AmenityFilterPreset[];
  loading: boolean;
  error: string | null;
  savePreset: (preset: AmenityFilterPreset) => Promise<void>;
  loadPreset: (id: string) => Promise<AmenityFilterPreset | null>;
  deletePreset: (id: string) => Promise<void>;
}

export const useFilterStorage = (): UseFilterStorageReturn => {
  const [presets, setPresets] = useState<AmenityFilterPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from MMKV on mount
  useEffect(() => {
    try {
      setLoading(true);
      const allKeys = filterStorage.getAllKeys();
      const loaded: AmenityFilterPreset[] = [];

      allKeys.forEach(key => {
        if (key.startsWith('preset_')) {
          const data = filterStorage.getString(key);
          if (data) {
            loaded.push(JSON.parse(data));
          }
        }
      });

      setPresets(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const savePreset = async (preset: AmenityFilterPreset) => {
    try {
      filterStorage.setString(`preset_${preset.id}`, JSON.stringify(preset));
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
      const data = filterStorage.getString(`preset_${id}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Load failed';
      setError(msg);
      throw err;
    }
  };

  const deletePreset = async (id: string) => {
    try {
      filterStorage.delete(`preset_${id}`);
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
      throw err;
    }
  };

  return {
    presets,
    loading,
    error,
    savePreset,
    loadPreset,
    deletePreset,
  };
};
```

### AmenityFilterEditor.native.tsx

```typescript
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Dialog, Portal } from 'react-native-paper';
import { useAmenityFilters } from '../../hooks/useAmenityFilters';
import { useFilterStorage } from '../../hooks/useFilterStorage';
import { BUILT_IN_PRESETS } from '../../data/presets';
import { AMENITY_CATEGORIES, sortCategories } from '../../data/categories';
import GlobalControls from './GlobalControls.native';
import PresetSelector from './PresetSelector.native';
import CategoryList from './CategoryList.native';
import DetailPanel from './DetailPanel.native';
import { AmenityFilterPreset } from '../../types/amenityFilter';

export default function AmenityFilterEditor() {
  const [selectedCategoryId, setSelectedCategoryId] = useState('water-toilets');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');

  const storage = useFilterStorage();
  const filter = useAmenityFilters(
    BUILT_IN_PRESETS[0].data,
    storage.savePreset
  );

  const allPresets = [...BUILT_IN_PRESETS, ...storage.presets.filter(p => p.isCustom)];
  const sortedCategories = sortCategories(AMENITY_CATEGORIES);
  const selectedCategory = AMENITY_CATEGORIES.find(c => c.id === selectedCategoryId);

  const handlePresetSelect = (presetId: string) => {
    const preset = allPresets.find(p => p.id === presetId);
    if (preset) {
      filter.applyPreset(preset);
    }
  };

  const handleSavePreset = async () => {
    if (!savePresetName.trim()) return;
    try {
      await filter.save(savePresetName);
      setSavePresetName('');
      setShowSaveDialog(false);
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  if (storage.loading) {
    return (
      <View style={styles.container}>
        <Text>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Amenity Filters
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Show & hide trail amenities by category
        </Text>

        {/* Global Controls */}
        <View style={styles.section}>
          <GlobalControls
            showAll={filter.currentFilter.defaultShowAll}
            onShowAllChange={filter.setShowAll}
            distance={filter.currentFilter.defaultMaxDistanceMeters}
            onDistanceChange={filter.setGlobalDistance}
          />
        </View>

        {/* Preset Selector */}
        <View style={styles.section}>
          <PresetSelector presets={allPresets} onSelect={handlePresetSelect} />
        </View>

        {/* Category List */}
        <View style={styles.section}>
          <CategoryList
            categories={sortedCategories}
            filter={filter.currentFilter}
            selectedId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </View>

        {/* Detail Panel */}
        {selectedCategory && (
          <View style={styles.section}>
            <DetailPanel
              category={selectedCategory}
              filter={filter.currentFilter}
              onToggleCategory={(enabled) =>
                filter.setCategory(selectedCategory.osmClasses[0], { enabled })
              }
              onSetDistance={(distance) =>
                filter.setCategory(selectedCategory.osmClasses[0], {
                  maxDistanceMeters: distance,
                })
              }
              onToggleSubclass={(subclass, enabled) =>
                filter.toggleSubclass(selectedCategory.osmClasses[0], subclass, enabled)
              }
            />
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button mode="contained" onPress={() => console.log('Apply')}>
          Apply Changes
        </Button>
        <Button mode="outlined" onPress={filter.reset}>
          Reset
        </Button>
        <Button mode="contained-tonal" onPress={() => setShowSaveDialog(true)}>
          Save Preset
        </Button>
      </View>

      {/* Save Dialog */}
      <Portal>
        <Dialog visible={showSaveDialog} onDismiss={() => setShowSaveDialog(false)}>
          <Dialog.Title>Save as Custom Preset</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Preset name"
              value={savePresetName}
              onChangeText={setSavePresetName}
              placeholder="e.g., Day Hike + Fine Dining"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onPress={handleSavePreset}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 24,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  actions: {
    padding: 16,
    gap: 8,
  },
});
```

---

## Web Implementation

### useFilterStorage.web.ts

```typescript
import { useEffect, useState } from 'react';
import { AmenityFilterPreset } from '../types/amenityFilter';

const DB_NAME = 'itinerarius';
const STORE_NAME = 'amenityFilters';

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

export interface UseFilterStorageReturn {
  presets: AmenityFilterPreset[];
  loading: boolean;
  error: string | null;
  savePreset: (preset: AmenityFilterPreset) => Promise<void>;
  loadPreset: (id: string) => Promise<AmenityFilterPreset | null>;
  deletePreset: (id: string) => Promise<void>;
}

export const useFilterStorage = (): UseFilterStorageReturn => {
  const [presets, setPresets] = useState<AmenityFilterPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

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
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(preset);

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (err) {
      throw err;
    }
  };

  const loadPreset = async (id: string): Promise<AmenityFilterPreset | null> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (err) {
      throw err;
    }
  };

  const deletePreset = async (id: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (err) {
      throw err;
    }
  };

  return {
    presets,
    loading,
    error,
    savePreset,
    loadPreset,
    deletePreset,
  };
};
```

### AmenityFilterEditor.web.tsx

```typescript
import React, { useState } from 'react';
import { useAmenityFilters } from '../../hooks/useAmenityFilters';
import { useFilterStorage } from '../../hooks/useFilterStorage';
import { BUILT_IN_PRESETS } from '../../data/presets';
import { AMENITY_CATEGORIES, sortCategories } from '../../data/categories';
import GlobalControls from './GlobalControls.web';
import PresetSelector from './PresetSelector.web';
import CategorySidebar from './CategorySidebar.web';
import DetailPanel from './DetailPanel.web';

export default function AmenityFilterEditor() {
  const [selectedCategoryId, setSelectedCategoryId] = useState('water-toilets');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');

  const storage = useFilterStorage();
  const filter = useAmenityFilters(BUILT_IN_PRESETS[0].data, storage.savePreset);

  const allPresets = [...BUILT_IN_PRESETS, ...storage.presets.filter(p => p.isCustom)];
  const sortedCategories = sortCategories(AMENITY_CATEGORIES);
  const selectedCategory = AMENITY_CATEGORIES.find(c => c.id === selectedCategoryId);

  const handlePresetSelect = (presetId: string) => {
    const preset = allPresets.find(p => p.id === presetId);
    if (preset) {
      filter.applyPreset(preset);
    }
  };

  const handleSavePreset = async () => {
    if (!savePresetName.trim()) return;
    try {
      await filter.save(savePresetName);
      setSavePresetName('');
      setShowSaveDialog(false);
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  if (storage.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Amenity Filters</h1>
          <p className="text-sm text-gray-600 mt-1">Show & hide trail amenities by category</p>
        </div>
      </div>

      {/* Global Controls */}
      <div className="border-b border-gray-200 bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <GlobalControls
            showAll={filter.currentFilter.defaultShowAll}
            onShowAllChange={filter.setShowAll}
            distance={filter.currentFilter.defaultMaxDistanceMeters}
            onDistanceChange={filter.setGlobalDistance}
          />
        </div>
      </div>

      {/* Preset Selector */}
      <div className="border-b border-gray-200 bg-white p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <PresetSelector presets={allPresets} onSelect={handlePresetSelect} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex">
          {/* Sidebar */}
          <div className="hidden lg:w-64 lg:border-r lg:border-gray-200 lg:overflow-y-auto lg:flex lg:flex-col">
            <CategorySidebar
              categories={sortedCategories}
              filter={filter.currentFilter}
              selectedId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
            />
          </div>

          {/* Mobile Category Selector */}
          <div className="lg:hidden flex-1 overflow-y-auto p-4">
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.currentTarget.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {sortedCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Detail Panel */}
          {selectedCategory && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 border-l border-gray-200">
              <DetailPanel
                category={selectedCategory}
                filter={filter.currentFilter}
                onToggleCategory={(enabled) =>
                  filter.setCategory(selectedCategory.osmClasses[0], { enabled })
                }
                onSetDistance={(distance) =>
                  filter.setCategory(selectedCategory.osmClasses[0], {
                    maxDistanceMeters: distance,
                  })
                }
                onToggleSubclass={(subclass, enabled) =>
                  filter.toggleSubclass(selectedCategory.osmClasses[0], subclass, enabled)
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => console.log('Apply')}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
          >
            Apply Changes
          </button>
          <button
            onClick={filter.reset}
            className="flex-1 bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400 font-medium"
          >
            Reset
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium"
          >
            Save as Custom
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-4">
          Your settings are saved locally. No data sent to servers.
        </p>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Save as Custom Preset</h3>
            <input
              type="text"
              value={savePresetName}
              onChange={(e) => setSavePresetName(e.target.value)}
              placeholder="e.g., Day Hike + Fine Dining"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSavePresetName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Key Differences

| Aspect | Native (.native.tsx) | Web (.web.tsx) |
|--------|---------------------|-----|
| **Components** | React Native Paper | HTML + TailwindCSS |
| **Styling** | StyleSheet.create() | className="" |
| **Storage** | MMKV (key-value, sync) | IndexedDB (async) |
| **Containers** | View | div |
| **Text** | Text (Paper) | HTML elements |
| **Inputs** | TextInput (Paper) | HTML input |
| **Layout** | Flexbox (View) | Flexbox (Tailwind) |

---

## Setup Instructions

### 1. Install Platform-Specific Dependencies

```bash
# For native
npm install react-native-mmkv

# For web (should already be there)
npm install tailwindcss
```

### 2. Update package.json

```json
{
  "dependencies": {
    "react-native-mmkv": "^2.11.0",
    "react-native-paper": "^5.x.x"
  }
}
```

### 3. File Organization

Create the `.native.tsx` and `.web.tsx` variants of each component. Expo's bundler will automatically select the right one based on the platform.

### 4. Shared Logic

Keep `useAmenityFilters.ts`, `lib/`, `data/`, and `types/` platform-agnostic. They import from the shared `.ts` files, not platform-specific ones.

---

## Import Pattern

```typescript
// Always import the base name, bundler auto-selects variant
import { useFilterStorage } from './hooks/useFilterStorage';
import AmenityFilterEditor from './components/AmenityFilterEditor';

// Bundler sees:
// - iOS/Android: imports useFilterStorage.native.ts, AmenityFilterEditor.native.tsx
// - Web: imports useFilterStorage.web.ts, AmenityFilterEditor.web.tsx
```

---

## Why This Works

1. **Single codebase** — shared logic in `.ts` files
2. **Platform-specific UI** — each platform uses its native/web components
3. **Automatic selection** — Expo/Metro/Webpack bundlers handle it
4. **No runtime checks** — decision made at build time, zero overhead
5. **Scales well** — add `.native.tsx`, `.web.tsx`, or even `.ios.tsx`, `.android.tsx` as needed

This is the **correct** pattern for Expo apps that support both native and web.
