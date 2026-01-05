# ✅ CORRECTED: Amenity Filter for Expo (Native + Web)

## What Changed

You pointed out: **This is Expo with web support, not a pure web app.**

**Old approach (WRONG):** TailwindCSS + IndexedDB for web only  
**New approach (CORRECT):** Platform-specific implementations using Expo's native resolution

---

## Architecture (Corrected)

### Single Codebase, Platform-Specific UI

```
imports:
  AmenityFilterEditor.tsx (platform wrapper)
          ↓ (bundler auto-selects)
    ┌─────┴─────┐
    ↓           ↓
iOS/Android    Web
AmenityFilterEditor.native.tsx    AmenityFilterEditor.web.tsx
    ↓                                ↓
React Native Paper             TailwindCSS + HTML
    ↓                                ↓
MMKV Storage                   IndexedDB Storage
```

### File Organization

```
src/
├── components/
│   ├── AmenityFilterEditor.tsx           ← Platform wrapper
│   ├── AmenityFilterEditor.native.tsx    ← iOS/Android
│   ├── AmenityFilterEditor.web.tsx       ← Web
│   ├── GlobalControls.native.tsx
│   ├── GlobalControls.web.tsx
│   ├── DetailPanel.native.tsx
│   ├── DetailPanel.web.tsx
│   └── ... (all UI components have .native + .web variants)
├── hooks/
│   ├── useAmenityFilters.ts              ← Shared (platform-agnostic)
│   ├── useFilterStorage.native.ts        ← iOS/Android: MMKV
│   ├── useFilterStorage.web.ts           ← Web: IndexedDB
│   └── useFilterStorage.ts               ← Platform wrapper
├── lib/
│   ├── categoryMapping.ts                ← Shared
│   ├── filterLogic.ts                    ← Shared
│   ├── export.ts                         ← Shared (JSON logic)
│   └── import.ts                         ← Shared (validation)
├── data/
│   ├── categories.ts                     ← Shared
│   └── presets.ts                        ← Shared
└── types/
    └── amenityFilter.ts                  ← Shared
```

---

## Tech Stack (Corrected)

| Component | iOS/Android | Web |
|-----------|-----|-----|
| **Framework** | React Native | React |
| **UI Library** | React Native Paper | TailwindCSS + HTML |
| **Styling** | StyleSheet.create() | className="" |
| **Storage** | MMKV (sync key-value) | IndexedDB (async) |
| **Navigation** | React Navigation | React Router / built-in |
| **Forms** | Paper TextInput | HTML inputs |

---

## Key Differences: Native vs Web

### Storage

```typescript
// Native (MMKV - synchronous)
const filterStorage = new MMKV({ id: 'amenityFilters' });
filterStorage.setString('preset_1', JSON.stringify(preset)); // sync
const data = filterStorage.getString('preset_1'); // sync

// Web (IndexedDB - asynchronous)
const db = await openDB();
const transaction = db.transaction('amenityFilters', 'readwrite');
const store = transaction.objectStore('amenityFilters');
store.put(preset); // async, returns Promise
```

### UI Components

```typescript
// Native (React Native Paper)
<View style={styles.container}>
  <Text variant="headlineMedium">Amenity Filters</Text>
  <Button mode="contained" onPress={handleSave}>Save</Button>
</View>

// Web (HTML + TailwindCSS)
<div className="p-4">
  <h1 className="text-2xl font-bold">Amenity Filters</h1>
  <button className="bg-blue-600 text-white px-4 py-2">Save</button>
</div>
```

### Layouts

```typescript
// Native (Flexbox via View)
<View style={{ flex: 1, flexDirection: 'column' }}>
  <View style={{ flex: 1 }}>Content</View>
  <View style={{ height: 100 }}>Footer</View>
</View>

// Web (Flexbox via Tailwind)
<div className="flex flex-col h-screen">
  <div className="flex-1">Content</div>
  <div className="h-24">Footer</div>
</div>
```

---

## How Expo Bundler Auto-Selects

**You don't need conditionals.** Expo's bundler (Metro) automatically selects the right file:

```typescript
// src/hooks/useFilterStorage.ts (platform wrapper)
export { useFilterStorage } from './useFilterStorage.native';
// ^ This file ONLY exists on disk, but when you build:
// - iOS/Android: Metro loads useFilterStorage.native.ts
// - Web: Webpack loads useFilterStorage.web.ts
```

**Import pattern (same for all platforms):**
```typescript
import { useFilterStorage } from './hooks/useFilterStorage';
import AmenityFilterEditor from './components/AmenityFilterEditor';

// Bundler automatically selects:
// - native variant for iOS/Android build
// - web variant for web build
```

---

## Implementation Steps

### Step 1: Create Shared Types & Logic

```typescript
// src/types/amenityFilter.ts (shared, one copy)
export interface AmenityFilterSettings { ... }
export interface AmenityCategory { ... }
// etc.

// src/lib/categoryMapping.ts (shared, one copy)
export const SUBCLASS_DATA = { ... }
export const getSubclassesForCategory = (...) => { ... }

// src/data/categories.ts (shared, one copy)
export const AMENITY_CATEGORIES = [ ... ]

// src/hooks/useAmenityFilters.ts (shared, one copy)
export const useAmenityFilters = (...) => { ... }
```

### Step 2: Create Platform-Specific Storage

```typescript
// src/hooks/useFilterStorage.native.ts
import { MMKV } from 'react-native-mmkv';
export const useFilterStorage = (): UseFilterStorageReturn => {
  // MMKV implementation
};

// src/hooks/useFilterStorage.web.ts
export const useFilterStorage = (): UseFilterStorageReturn => {
  // IndexedDB implementation
};

// src/hooks/useFilterStorage.ts (wrapper)
export { useFilterStorage } from './useFilterStorage.native';
```

### Step 3: Create Platform-Specific UI

```typescript
// src/components/AmenityFilterEditor.native.tsx
import { View, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
export default function AmenityFilterEditor() { ... }

// src/components/AmenityFilterEditor.web.tsx
export default function AmenityFilterEditor() {
  return <div className="...">...</div>;
}

// src/components/AmenityFilterEditor.tsx (wrapper)
export { AmenityFilterEditor as default } from './AmenityFilterEditor.native';
```

### Step 4: Use Anywhere (No Conditionals)

```typescript
// Works identically on iOS, Android, and Web
import AmenityFilterEditor from './components/AmenityFilterEditor';

export default function App() {
  return <AmenityFilterEditor />;
}
```

---

## What You Get

✅ **One codebase** with shared business logic  
✅ **Platform-optimized UI** (native feel on iOS/Android, web feel on web)  
✅ **Correct storage** (MMKV for native, IndexedDB for web)  
✅ **Zero runtime overhead** (decision at build time)  
✅ **Scales easily** (add .ios.tsx, .android.tsx, .web.tsx as needed)  
✅ **Type-safe** (TypeScript across all platforms)  

---

## File Checklist

**Create these files:**
- [ ] `src/types/amenityFilter.ts` (shared)
- [ ] `src/data/categories.ts` (shared)
- [ ] `src/data/presets.ts` (shared)
- [ ] `src/lib/categoryMapping.ts` (shared)
- [ ] `src/lib/filterLogic.ts` (shared)
- [ ] `src/lib/export.ts` (shared)
- [ ] `src/lib/import.ts` (shared)
- [ ] `src/hooks/useAmenityFilters.ts` (shared)
- [ ] `src/hooks/useFilterStorage.native.ts` (MMKV)
- [ ] `src/hooks/useFilterStorage.web.ts` (IndexedDB)
- [ ] `src/hooks/useFilterStorage.ts` (wrapper)
- [ ] `src/components/AmenityFilterEditor.native.tsx` (RN Paper)
- [ ] `src/components/AmenityFilterEditor.web.tsx` (HTML + Tailwind)
- [ ] `src/components/AmenityFilterEditor.tsx` (wrapper)
- [ ] `src/components/GlobalControls.native.tsx`
- [ ] `src/components/GlobalControls.web.tsx`
- [ ] `src/components/GlobalControls.tsx` (wrapper)
- [ ] ... (repeat for DetailPanel, CategorySidebar, etc.)

---

## Dependencies to Install

```bash
npm install react-native-mmkv  # for native storage
npm install react-native-paper # for native UI (if not already there)
```

TailwindCSS and Expo should already be in your project.

---

## No Changes Needed For:
- `useAmenityFilters.ts` — works on all platforms
- `lib/categoryMapping.ts` — works on all platforms
- `lib/export.ts` — works on all platforms
- `lib/import.ts` — works on all platforms
- `data/categories.ts` — works on all platforms
- `data/presets.ts` — works on all platforms

---

## Summary

This is the **industry-standard pattern for cross-platform apps** (React Native + Web). You write shared logic once, implement platform-specific UI twice, and the bundler handles everything else.

Ready to build? 🚀
