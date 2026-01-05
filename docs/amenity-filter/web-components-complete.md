# AmenityFilterEditor.tsx — Web Implementation

## Overview
Main container component for the amenity filter editor. Uses React hooks, TailwindCSS, and IndexedDB for persistence.

## Component Code

```typescript
// src/components/web/AmenityFilterEditor.tsx

import React, { useState, useEffect } from 'react';
import { useAmenityFilters } from '../../hooks/useAmenityFilters';
import { useFilterStorage } from '../../hooks/useFilterStorage';
import { BUILT_IN_PRESETS } from '../../data/presets';
import { AMENITY_CATEGORIES, sortCategories } from '../../data/categories';
import GlobalControls from './GlobalControls';
import PresetSelector from './PresetSelector';
import CategorySidebar from './CategorySidebar';
import DetailPanel from './DetailPanel';
import { AmenityFilterPreset } from '../../types/amenityFilter';
import { exportFilterAsJSON, importFilterFromJSON } from '../../lib/export';

export default function AmenityFilterEditor() {
  const [selectedCategoryId, setSelectedCategoryId] = useState('water-toilets');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const storage = useFilterStorage();
  const filter = useAmenityFilters(
    BUILT_IN_PRESETS[0].data, // Start with Trailside
    storage.savePreset
  );

  // Combine built-in + custom presets
  const allPresets = [...BUILT_IN_PRESETS, ...storage.presets.filter(p => p.isCustom)];
  const sortedCategories = sortCategories(AMENITY_CATEGORIES);
  const selectedCategory = AMENITY_CATEGORIES.find(c => c.id === selectedCategoryId);

  const handlePresetSelect = (presetId: string) => {
    const preset = allPresets.find(p => p.id === presetId);
    if (preset) {
      filter.applyPreset(preset);
    }
  };

  const handleApply = () => {
    // In a real app, would trigger filter application on map
    console.log('Apply filter:', filter.currentFilter);
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

  const handleExport = () => {
    const json = exportFilterAsJSON(filter.currentFilter);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amenity-filter-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = importFilterFromJSON(text);
      filter.applyPreset({
        id: `imported-${Date.now()}`,
        name: 'Imported Filter',
        isPreset: false,
        isCustom: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: imported,
      });
      setImportError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setImportError(msg);
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

      {/* Main Content: Sidebar + Detail Panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex">
          {/* Sidebar: Category List (hidden on mobile) */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  filter.setCategory(selectedCategory.osmClasses[0], { maxDistanceMeters: distance })
                }
                onToggleSubclass={(subclass, enabled) =>
                  filter.toggleSubclass(selectedCategory.osmClasses[0], subclass, enabled)
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer: Actions */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleApply}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition"
          >
            Apply Changes
          </button>
          <button
            onClick={filter.reset}
            className="flex-1 bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400 font-medium transition"
          >
            Reset to Preset
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium transition"
          >
            Save as Custom
          </button>
          <button
            onClick={handleExport}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium transition"
          >
            Export JSON
          </button>
          <label className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium transition cursor-pointer">
            Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {importError && (
          <p className="text-red-600 text-sm mt-3">{importError}</p>
        )}

        <p className="text-xs text-gray-600 mt-4">
          Your filter preferences are saved locally in your browser. No data is sent to our servers.
        </p>
      </div>

      {/* Save Dialog Modal */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Save as Custom Preset</h3>
            <input
              type="text"
              value={savePresetName}
              onChange={(e) => setSavePresetName(e.target.value)}
              placeholder="Enter preset name (e.g., 'Day Hike + Fine Dining')"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSavePresetName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!savePresetName.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

## Supporting Components

### GlobalControls.tsx

```typescript
// src/components/web/GlobalControls.tsx

import React from 'react';

interface GlobalControlsProps {
  showAll: boolean;
  onShowAllChange: (show: boolean) => void;
  distance: number;
  onDistanceChange: (distance: number) => void;
}

const DISTANCE_PRESETS = [50, 200, 500, 2000];

export default function GlobalControls({
  showAll,
  onShowAllChange,
  distance,
  onDistanceChange,
}: GlobalControlsProps) {
  return (
    <div className="space-y-4">
      {/* Show All / Hide All */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => onShowAllChange(e.currentTarget.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900">
            {showAll ? 'Show all amenities' : 'Hide all amenities'}
          </span>
        </label>
      </div>

      {/* Distance Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="distance" className="text-sm font-medium text-gray-900">
            Max Distance from Trail
          </label>
          <span className="text-sm font-bold text-blue-600">{distance}m</span>
        </div>
        <input
          id="distance"
          type="range"
          min="50"
          max="5000"
          step="50"
          value={distance}
          onChange={(e) => onDistanceChange(Number(e.currentTarget.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex gap-2">
          {DISTANCE_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => onDistanceChange(preset)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                distance === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              {preset}m
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### PresetSelector.tsx

```typescript
// src/components/web/PresetSelector.tsx

import React from 'react';
import { AmenityFilterPreset } from '../../types/amenityFilter';

interface PresetSelectorProps {
  presets: AmenityFilterPreset[];
  onSelect: (presetId: string) => void;
}

export default function PresetSelector({ presets, onSelect }: PresetSelectorProps) {
  const builtInPresets = presets.filter(p => p.isPreset);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900">Quick Presets</label>
      <div className="flex gap-2 flex-wrap">
        {builtInPresets.map(preset => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className="px-4 py-2 bg-blue-100 text-blue-900 rounded-md hover:bg-blue-200 font-medium text-sm transition"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### CategorySidebar.tsx

```typescript
// src/components/web/CategorySidebar.tsx

import React from 'react';
import { AmenityCategory } from '../../types/amenityFilter';
import { AmenityFilterSettings } from '../../types/amenityFilter';
import CategoryCard from './CategoryCard';

interface CategorySidebarProps {
  categories: AmenityCategory[];
  filter: AmenityFilterSettings;
  selectedId: string;
  onSelectCategory: (id: string) => void;
}

export default function CategorySidebar({
  categories,
  filter,
  selectedId,
  onSelectCategory,
}: CategorySidebarProps) {
  return (
    <div className="divide-y divide-gray-200 overflow-y-auto">
      {categories.map(category => {
        // Determine if this category is enabled
        const classKey = category.osmClasses[0];
        const classRule = filter.classes[classKey];
        const isEnabled = classRule?.enabled ?? filter.defaultShowAll;

        return (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedId === category.id}
            isEnabled={isEnabled}
            onSelect={() => onSelectCategory(category.id)}
          />
        );
      })}
    </div>
  );
}
```

### CategoryCard.tsx

```typescript
// src/components/web/CategoryCard.tsx

import React from 'react';
import { AmenityCategory } from '../../types/amenityFilter';

interface CategoryCardProps {
  category: AmenityCategory;
  isSelected: boolean;
  isEnabled: boolean;
  onSelect: () => void;
}

export default function CategoryCard({
  category,
  isSelected,
  isEnabled,
  onSelect,
}: CategoryCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 transition ${
        isSelected
          ? 'bg-blue-50 border-l-4 border-blue-600'
          : 'hover:bg-gray-50'
      } ${!isEnabled ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{category.icon}</span>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{category.name}</h3>
          <p className="text-xs text-gray-500">
            {isEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <span className="text-gray-400">›</span>
      </div>
    </button>
  );
}
```

### DetailPanel.tsx

```typescript
// src/components/web/DetailPanel.tsx

import React, { useMemo } from 'react';
import { AmenityCategory } from '../../types/amenityFilter';
import { AmenityFilterSettings, ClassRule } from '../../types/amenityFilter';
import { getSubclassesForCategory, countSubclasses } from '../../lib/categoryMapping';

interface DetailPanelProps {
  category: AmenityCategory;
  filter: AmenityFilterSettings;
  onToggleCategory: (enabled: boolean) => void;
  onSetDistance: (distance: number) => void;
  onToggleSubclass: (subclass: string, enabled: boolean) => void;
}

export default function DetailPanel({
  category,
  filter,
  onToggleCategory,
  onSetDistance,
  onToggleSubclass,
}: DetailPanelProps) {
  // Get the class rule for this category
  const classKey = category.osmClasses[0];
  const classRule = filter.classes[classKey];
  
  const isEnabled = classRule?.enabled ?? filter.defaultShowAll;
  const distance = classRule?.maxDistanceMeters ?? filter.defaultMaxDistanceMeters;
  
  // Get subclasses, sorted by count (descending)
  const subclasses = useMemo(() => {
    return getSubclassesForCategory(classKey, filter).sort((a, b) => b.count - a.count);
  }, [classKey, filter]);

  const getSubclassEnabled = (subclass: string): boolean => {
    return classRule?.subclasses?.[subclass]?.enabled ?? isEnabled;
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Category Header */}
      <div className="pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{category.icon}</span>
          <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
        </div>
      </div>

      {/* Toggle: Show/Hide Category */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggleCategory(e.currentTarget.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium text-gray-900">
            Show this category
          </span>
        </label>
      </div>

      {/* Distance Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={`distance-${classKey}`} className="text-sm font-medium text-gray-900">
            Distance from Trail
          </label>
          <span className="text-sm font-bold text-blue-600">{distance}m</span>
        </div>
        <input
          id={`distance-${classKey}`}
          type="range"
          min="50"
          max="5000"
          step="50"
          value={distance}
          onChange={(e) => onSetDistance(Number(e.currentTarget.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex gap-2">
          {[50, 200, 500, 2000].map(preset => (
            <button
              key={preset}
              onClick={() => onSetDistance(preset)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                distance === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              {preset}m
            </button>
          ))}
        </div>
      </div>

      {/* Subclass Toggles */}
      {isEnabled && subclasses.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <h3 className="font-medium text-gray-900">Show subclasses:</h3>
          <div className="space-y-2">
            {subclasses.map(subclass => (
              <label
                key={subclass.id}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition"
              >
                <input
                  type="checkbox"
                  checked={getSubclassEnabled(subclass.id)}
                  onChange={(e) => onToggleSubclass(subclass.id, e.currentTarget.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">
                  {subclass.name}
                  <span className="text-gray-500 ml-2">({subclass.count})</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!isEnabled && (
        <p className="text-gray-500 italic text-sm pt-4 border-t border-gray-200">
          Enable this category to customize subclasses.
        </p>
      )}
    </div>
  );
}
```

## Helper Functions

### lib/categoryMapping.ts

```typescript
// src/lib/categoryMapping.ts

import { AmenitySubclass, AmenityFilterSettings } from '../types/amenityFilter';

// OSM subclass data (would come from your amenities database)
export const SUBCLASS_DATA: Record<string, Record<string, number>> = {
  water: {
    drinking_water: 144,
    fountain: 210,
    water_tap: 1,
    watering_place: 1,
  },
  hygiene: {
    toilets: 310,
    shower: 28,
    swimming_pool: 145,
    public_bath: 2,
  },
  food: {
    restaurant: 1304,
    cafe: 277,
    pub: 383,
    fast_food: 239,
    bar: 113,
    biergarten: 2,
  },
  resupply: {
    supermarket: 196,
    bakery: 179,
    convenience: 149,
    vending_machine: 105,
    butcher: 64,
    department_store: 11,
    general: 9,
    greengrocer: 7,
  },
  shelter: {
    shelter: 1312,
  },
  street: {
    bench: 9080,
    waste_basket: 3345,
    picnic_table: 1484,
    waste_disposal: 28,
    lounger: 21,
  },
  transport: {
    bus_stop: 4863,
    station: 59,
    bus_station: 31,
    halt: 24,
    rest_area: 8,
    aerodrome: 3,
  },
  place: {
    village: 463,
    hamlet: 214,
    farm: 69,
    isolated_dwelling: 47,
    town: 15,
    city: 1,
  },
  tourism: {
    memorial: 784,
    viewpoint: 417,
    artwork: 366,
    attraction: 131,
    monument: 19,
    castle: 6,
    archaeological_site: 2,
  },
  religious: {
    church: 356,
    chapel: 155,
    monastery: 2,
  },
  cash: {
    bank: 210,
    atm: 144,
    bureau_de_change: 1,
  },
  medical: {
    pharmacy: 106,
    hospital: 15,
    physiotherapist: 1,
    clinic: 1,
  },
  other: {
    information: 2266,
    defibrillator: 212,
    phone: 132,
  },
};

export const getSubclassesForCategory = (
  osmClass: string,
  _filter: AmenityFilterSettings
): AmenitySubclass[] => {
  const subclassData = SUBCLASS_DATA[osmClass] || {};
  return Object.entries(subclassData).map(([subclass, count]) => ({
    id: `${osmClass}.${subclass}`,
    categoryId: osmClass,
    name: formatSubclassName(subclass),
    count,
  }));
};

export const formatSubclassName = (subclass: string): string => {
  return subclass
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const countSubclasses = (osmClass: string): number => {
  return Object.keys(SUBCLASS_DATA[osmClass] || {}).length;
};
```

### lib/export.ts

```typescript
// src/lib/export.ts

import { AmenityFilterSettings } from '../types/amenityFilter';

export const exportFilterAsJSON = (filter: AmenityFilterSettings): string => {
  return JSON.stringify(filter, null, 2);
};

export const importFilterFromJSON = (json: string): AmenityFilterSettings => {
  const parsed = JSON.parse(json);
  // TODO: Validate with Zod schema
  return parsed;
};

export const encodeFilterAsURL = (filter: AmenityFilterSettings): string => {
  // TODO: gzip + base64 encode for URL shortlinks
  const json = JSON.stringify(filter);
  return btoa(json); // Simple base64 for now
};

export const decodeFilterFromURL = (encoded: string): AmenityFilterSettings => {
  // TODO: Decode gzip + base64
  const json = atob(encoded);
  return JSON.parse(json);
};
```

## Usage

```typescript
// In your main app
import AmenityFilterEditor from './components/web/AmenityFilterEditor';

export default function App() {
  return <AmenityFilterEditor />;
}
```

## Next Steps

1. Install Tailwind CSS if not already in project
2. Test with real OSM amenity data
3. Add proper Zod validation for import
4. Implement QR code generation (later phase)
5. Add analytics for popular filters (later phase)
