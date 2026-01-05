# Amenity Filter Settings: Concept & Implementation (Updated)

## Problem Statement

The current three-icon preset model (Trailside, Explorer, Multi-day) is **opaque and inflexible**:
- Users can't intuitively understand why certain amenities are shown/hidden
- Preset selection hides the underlying schema complexity
- No way for users to create custom filters that suit their specific trip type
- iOS and web experiences are fundamentally different, making it hard to sync/export settings across platforms

## Proposed Solution: Progressive Disclosure UI

**Core principle:** Show category-level controls by default with sane defaults; let users drill down to fine-grained (class/subclass) settings only when they want depth. **Organize by frequency of use, not by amenity type.**

---

## Information Architecture

### Tier 1: Categories (Organized by Hiker Needs, Not by OSM Type)

**Key insight:** Users filter by *need* (hungry, tired, emergency), not by "OSM class." Reorder by frequency of access + group related categories.

| Category | OSM Classes | Default Enabled? | Typical Distance | Why This Order? |
|----------|-------------|------------------|-------------------|-----------------|
| **Water & Toilets** | `water`, `hygiene` (select) | ✅ | 50–100m | Most frequent need on trail |
| **Food & Drink** | `food`, `resupply` (select) | ✅ | 200–500m | Regular need, many options |
| **Rest & Shelter** | `shelter`, `street` (bench, table) | ✅ | 30–100m | Frequent breaks |
| **Navigation** | `transport`, `place`, `other` (info) | ✅ | 500m–2km | Checkpoints, village awareness |
| **Tourism & Culture** | `tourism`, `religious` | ✅ | 500m–2km | Context & exploration |
| **Services & Supplies** | `cash`, `resupply` (detail), `medical` | ✅ (cash/medical off by default) | 500m–2km | Less frequent, situational |
| **Accommodation** | `accom` | ❌ (off by default) | 1000m–5km | Needed once per day, multi-day trips only |
| **Other Essentials** | `other` (defibrillator, phone) | ✅ | 500m–2km | Safety critical |

**Removed:** `bike` (for later iteration)

### Tier 2: Global Defaults (Applies to ALL Categories)

**New:** Three global controls at the top of settings:

```typescript
interface AmenityFilterSettings {
  // Global defaults for all categories (unless overridden)
  defaultShowAll: boolean;         // Master on/off for entire filter
  defaultMaxDistanceMeters: number; // Fallback distance (e.g., 500m)
  
  // Per-category overrides
  categories: Record<string, CategoryConfig>;
}

interface CategoryConfig {
  enabled?: boolean;        // Inherits from defaultShowAll if undefined
  maxDistanceMeters?: number; // Inherits from defaultMaxDistanceMeters if undefined
  subclasses?: Record<string, { enabled?: boolean }>; // Per-item toggle only
}
```

**Example:**
- Global default: `defaultShowAll: true, defaultMaxDistanceMeters: 500m`
- User toggles "Accommodation" OFF
- User tweaks "Food & Drink" distance to 300m
- Everything else inherits the global 500m

### Tier 3: Per-Category Distance (No Per-Subclass Distance)

You're right—per-subclass distance would be overload. **One distance per category is the right call.**

However, users *can* toggle specific subclasses on/off (e.g., "Show Restaurants, but not Fast Food"). This gives granular *visibility* without distance complexity.

---

## UI/UX: Web Editor (Priority 1)

### Layout: Two-Column + Global Controls

```
┌─────────────────────────────────────────────────────┐
│ Amenity Filters       [Quick Presets ▼] [Export] [Import]     │
├─────────────────────────────────────────────────────┤
│ Global Settings:                                    │
│  ☑ Show all amenities    ☐ Hide all              │
│  Max Distance: [  500m  ▼ ] [50m] [200m] [500m] [2km] │
│                                                     │
├─────────────────────────────────────────────────────┤
│ CATEGORIES (Left Sidebar, 30%)                      │
│                                                     │
│ 💧 Water & Toilets      [30 items]                 │
│ 🍽️ Food & Drink        [40 items]     ← Selected │
│ 🪑 Rest & Shelter       [10 items]                 │
│ 🗺️ Navigation          [50 items]                 │
│ 🏛️ Tourism & Culture   [70 items]                 │
│ 🛒 Services & Supplies [60 items]                 │
│ 🛏️ Accommodation       [200 items]    (off)       │
│ ⚠️ Other Essentials    [5 items]                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│ DETAIL PANEL (Right, 70%)                          │
│                                                     │
│ 🍽️ Food & Drink                                   │
│ Show this category: [✓ ON]                        │
│ Distance from trail: 500m [||||====] [Set: 200m] │
│                                                     │
│ Show subclasses:                                   │
│  ☑ Restaurant (1304)                             │
│  ☑ Cafe (277)                                     │
│  ☑ Pub (383)                                      │
│  ☑ Fast Food (239)                                │
│  ☑ Bar (113)                                      │
│  ☑ Biergarten (2)                                 │
│                                                    │
│ ────────────────────────────────                  │
│ [Apply Changes] [Reset to Preset] [Save Preset]  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Key Components

1. **Global Defaults** (top)
   - "Show all / Hide all" toggle (quick reset)
   - Default distance slider + preset buttons (50m, 200m, 500m, 2km)
   - "Quick Presets" dropdown (Trailside, Explorer, Multi-day)

2. **Category Sidebar**
   - Scrollable list, organized by frequency of use (Water → Food → Rest → Navigation → Tourism → Services → Accommodation → Other)
   - Each category shows: icon, name, count of subclasses, enabled/disabled indicator (faint if off)
   - Click to select for detail editing

3. **Detail Panel**
   - Category name + icon
   - Master toggle: "Show this category" (checkboxes for subclasses appear only if category is on)
   - Distance slider per category (inherits global default if not set)
   - Subclass checkboxes (alphabetical or by popularity)
   - "Apply" / "Reset" / "Save as Custom Preset" buttons at bottom

4. **Top Actions**
   - Quick Presets dropdown (Trailside, Explorer, Multi-day)
   - Export as JSON
   - Import from JSON / Paste JSON / Scan QR code (later)

---

## User Flows (Web)

### Flow A: Quick Preset Switch
1. User loads settings page
2. Clicks "Quick Presets" dropdown → selects "Multi-day"
3. All settings updated instantly, page reflects changes
4. Button: "Customize" opens detail panel if they want to tweak

### Flow B: Custom Filter (Typical)
1. Load page → see global defaults (e.g., "Show all, 500m")
2. Scroll sidebar, click "Water & Toilets"
3. Detail panel opens: set distance to 50m (they want toilets very close)
4. Click "Food & Drink" → distance slider at 500m (inherit global)
5. Toggle off "Fast Food" (personal preference)
6. Click "Accommodation" → toggle ON (it's off by default)
7. Click "Save as Custom Preset" → name it "Multi-day + Fine Dining"
8. Presets dropdown now includes the custom filter

### Flow C: Quick Needs-Based Switch (Future UI, not in this scope)
- Context button (not settings): "I'm hungry" → applies preset with Food on, Water/Toilets on, rest minimal
- "I'm tired" → Accommodation + Rest + Shelter highlighted
- "Where am I?" → Navigation prominent
- These are *preset combinations*, not a new settings UI

---

## Technical: Storage & Sync (Web + iOS)

### Web: IndexedDB + localStorage

**Primary:** IndexedDB for structured data (presets, per-category overrides)
**Fallback:** localStorage for quick access to "current active filter"

```typescript
// Schema in IndexedDB
interface StoredFilter {
  id: string;
  name: string;
  isPreset: boolean;      // true = built-in (Trailside, etc.)
  isCustom: boolean;      // true = user-created
  createdAt: number;
  updatedAt: number;
  data: AmenityFilterSettings;
}

// Example: "current active filter" in localStorage
localStorage.setItem('activeFilterId', 'custom-1');
```

**No cookies, no consent needed.** Footer text: *"Your filter preferences are saved locally."*

### iOS: MMKV (TBD on web later if needed for SQLite tiles)

```typescript
import { MMKV } from 'react-native-mmkv';
const filterStorage = new MMKV({ id: 'amenityFilters' });

// Same schema, just persisted to MMKV instead of IndexedDB
filterStorage.setString(
  `filter_${filterId}`,
  JSON.stringify(filterSettings)
);
```

---

## Sharing Filters Between Users

### Option A: Export/Import (Simple, No Backend)
- **Web:** Button → "Export" → Downloads `my-filter-name.json`
- **iOS:** "Share" → Native share sheet with JSON attachment
- **Recipient:** Drag-drop JSON to web editor OR upload in iOS app
- **Advantage:** No server, no auth, instant, portable

### Option B: URL Shortlinks (Web, Clever)
- Filter encoded as gzipped base64 in URL: `itinerarius.app/filter?p=H4sIAAABAAAA...`
- Share link in trail communities, social media
- **Advantage:** No download/upload, QR-friendly
- **Future:** Could add click tracking to see popular filters

### Option C: Backend Sync + QR Codes (Inspired by bikerouter)
- Server endpoint: `POST /api/filters/share` (optional, requires auth)
- Generates a shareable QR code that encodes the filter ID or URL shortlink
- Recipient scans QR → filter auto-applies
- **No cookies:** Use Bearer token in `Authorization` header (treated as "personal data," but minimal)
- **For now:** Combine A + B (JSON export + URL shortlinks), add C later if needed

**Re: Personal Data & Auth:** Correct—if you store filters server-side associated with a user account, that's personal data. But you don't need to store the filters *themselves* on the server for sharing. Just store metadata (who shared, when, visibility). The filter data lives in the user's JSON or URL. This keeps GDPR footprint minimal.

---

## Categories: Clarity & Icons

### Facilities vs. Services vs. Essentials?

You're right—there's overlap. Let me clarify:

- **Facilities:** Physical infrastructure on/near trail (bench, picnic table, shelter, toilets, shower)
- **Services & Supplies:** Transactional (buy food, get cash, repair bike, medical help)
- **Other Essentials:** Safety-critical (defibrillator, phone, emergency info)

**Better names:**
- **"Rest & Shelter"** (benches, tables, shelters) — very clear
- **"Services"** (cash, shops, medical, bike repair) — clear
- **"Other Essentials"** → **"Safety & Info"** (defibrillator, emergency phone, info kiosk) — clearer intent

Updated order:
1. Water & Toilets
2. Food & Drink
3. Rest & Shelter
4. Navigation
5. Tourism & Culture
6. Services
7. Safety & Info
8. Accommodation

---

## Implementation: Phase 1 (Web Editor)

### Deliverables

1. **`AmenityFilterEditor.tsx`** — Main web component
   - Global controls (Show all / Hide all, global distance slider)
   - Category sidebar with selection state
   - Detail panel for editing
   - Save/Export/Import buttons

2. **`hooks/useAmenityFilters.ts`** — State management
   - Load presets (Trailside, Explorer, Multi-day) from JSON
   - Apply preset, update category, toggle subclass
   - Computed: effective distance for each category (inherits global if not set)

3. **`hooks/useFilterStorage.ts`** — IndexedDB persistence
   - Save/load filters
   - Migrate old format to new schema (Zod validation)
   - List saved presets

4. **`lib/categoryMapping.ts`** — OSM class → category mapping
   ```typescript
   export const CLASS_TO_CATEGORY = {
     water: 'Water & Toilets',
     hygiene: 'Water & Toilets',
     food: 'Food & Drink',
     resupply: 'Food & Drink',
     shelter: 'Rest & Shelter',
     street: 'Rest & Shelter', // benches, tables, picnic areas
     transport: 'Navigation',
     place: 'Navigation',
     tourism: 'Tourism & Culture',
     religious: 'Tourism & Culture',
     cash: 'Services',
     medical: 'Services',
     bike: 'Services', // (for later)
     other: 'Safety & Info',
   };

   export const SUBCLASS_DISPLAY_NAMES = {
     'food.restaurant': 'Restaurant',
     'food.cafe': 'Cafe',
     // ... etc
   };
   ```

5. **`data/presets.ts`** — Built-in presets (Trailside, Explorer, Multi-day)
   ```typescript
   export const TRAILSIDE_PRESET = {
     id: 'trailside',
     name: 'Trailside',
     isPreset: true,
     data: {
       defaultShowAll: true,
       defaultMaxDistanceMeters: 100,
       categories: {
         'Water & Toilets': { maxDistanceMeters: 50 },
         'Rest & Shelter': { maxDistanceMeters: 50 },
         'Safety & Info': { maxDistanceMeters: 200 },
         'Navigation': { enabled: false },
         'Tourism & Culture': { enabled: false },
         'Services': { enabled: false },
         'Accommodation': { enabled: false },
       }
     }
   };
   ```

6. **`lib/export.ts`** — JSON export
   - Serialize current filter to JSON
   - Optionally encode as base64 URL shortlink
   - Generate QR code (later)

7. **`lib/import.ts`** — JSON import
   - Validate against Zod schema
   - Apply with migration if needed
   - Error messaging

### Tech Stack (Web)

- **React hooks** for state
- **IndexedDB** (via `idb` library) for persistence
- **Zod** for schema validation + migration
- **React Hook Form** (optional, for form interactions if needed)
- **qrcode.react** (for future QR generation)
- **UI Kit:** React Native Paper (web) or custom styled-components

---

## Next Steps (In Order)

### 1. Validate Category Taxonomy
- [ ] Review final 8 categories + icons
- [ ] Confirm "Water & Toilets" should be #1, "Accommodation" last
- [ ] Decide on "Services" vs "Supplies & Services" name

### 2. Build Web Editor (Phase 1)
- [ ] Scaffold component structure
- [ ] Implement global controls (Show all / Hide all)
- [ ] Build category sidebar with click selection
- [ ] Build detail panel with distance slider + subclass checkboxes
- [ ] Wire up IndexedDB persistence
- [ ] Add preset dropdown (Trailside, Explorer, Multi-day)
- [ ] Add JSON export button
- [ ] Add JSON import input
- [ ] Test with real OSM class/subclass data

### 3. (Later) Add Presets UI
- Quick preset switcher not in settings editor, but on main map/route screen
- One-tap apply without opening settings modal

### 4. (Later) iOS Native Screen
- Port web component logic to React Native
- Use native toggles, sliders, picker for distance
- MMKV storage
- Native share sheet for JSON export

### 5. (Future) Backend Sharing
- Server endpoint for QR code generation
- Optional user auth + filter history
- Popular filter analytics

---

## Decision Summary

| Decision | Rationale |
|----------|-----------|
| **Web first** | Faster iteration, easier feedback loops |
| **Global defaults** | Saner UX, less decision fatigue |
| **One distance per category** | Prevents overload, users toggle subclasses instead |
| **Order by frequency** | Water → Food → Rest (not by OSM taxonomy) |
| **No per-subclass distance** | ✅ Confirmed |
| **Removed bike stuff** | ✅ For later |
| **Export/Import + URL shortlinks** | No backend needed to start; QR codes in Phase 3 |
| **No cookies** | Use IndexedDB; footer text explains local storage |
| **Quick presets** | Separate UI component on map screen, not in settings |
| **iOS native feel** | MMKV storage, native components (Phase 2+) |

---

## Questions Before Implementation

1. **Colors & Icons:** Do you have a design system or icon set in mind for the 8 categories?
2. **Preset names:** Should "Trailside, Explorer, Multi-day" stay, or rename to "Quick Break, Day Hike, Multi-day Trek"?
3. **JSON preview:** On import, should users see a preview of what's being imported before applying?
4. **Mobile web:** Should the web editor work on mobile (single column layout), or assume desktop only for settings?

Ready to start building? 🚀
