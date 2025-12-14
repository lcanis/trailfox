## iOS App Design Recommendations for Trailfox Discovery Screen

Looking at your web design and the constraints of iOS, here are my strategic recommendations:

### **Core Problem: The Hover Pattern Doesn't Exist on Mobile**

Your current design relies on **hover reveal** for route details—excellent for desktop but impossible on touch. On iOS, you need an **explicit affordance** that says "tap to see more."

***

### **🎯 Recommended Architecture: Three-Layer Pattern**

Instead of hover reveal, use a **progressive disclosure pattern** optimized for thumbs and visual hierarchy:

```
┌─────────────────────────────┐
│  MAP (40% of screen)        │  ← Always visible for context
│  [Mini map or distance viz] │
├─────────────────────────────┤
│  ROUTE LIST (60%)           │
│  ┌─────────────────────────┐│
│  │ Route Item (collapsed) ││  ← Swipeable, tappable
│  │ ╰─ Tap for details     ││
│  ├─────────────────────────┤│
│  │ Route Item             ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```


#### **Key Changes:**

1. **Invert the layout ratio** (currently map-dominant on iOS)
    - Map: ~30-40% at top (provides context, not primary interaction)
    - List: ~60-70% (primary interaction surface)
    - This gives fingers room to swipe/tap without hitting map controls
2. **Replace hover with tap + sheet modal**
    - Tap any route → slides up a **bottom sheet** with full details
    - Sheet shows: elevation profile, difficulty, amenities, network info
    - User can dismiss by swiping down or tapping outside
3. **Add visual weight to list items**
    - Current design: minimal, relies on hover for richness
    - iOS version: each item should feel **tappable**
    - Use color indicators (difficulty badges: green/yellow/red)
    - Show length + elevation gain as baseline info (don't hide until hover)

***

### **🏗️ Detailed Layout Recommendations**

#### **Option A: Bottom Sheet (Recommended)**

```
DISCOVERY SCREEN:
┌──────────────────────────────┐
│   [Map view - 35% height]    │  Mapbox/MapLibre at top
│   - Current location pinned   │  - Tap to expand full screen
│   - Route visualization       │  - Pinch to zoom
├──────────────────────────────┤
│   ROUTES (Scrollable List)    │  Main interaction area
│   ┌──────────────────────────┐│
│   │ 🟢 Deer Ridge Trail      ││  Each item:
│   │ 7.3 km • 340m elev gain  ││  - Color-coded difficulty
│   │ ⭐ Hard • 2.5h            ││  - Quick stats inline
│   │ [Tap for details →]      ││  - Clear tap target
│   └──────────────────────────┘│
│   ┌──────────────────────────┐│
│   │ 🟡 Canyon Loop           ││
│   │ 5.2 km • 120m            ││
│   └──────────────────────────┘│
└──────────────────────────────┘

[USER TAPS ROUTE]

┌──────────────────────────────┐  
│   ▼ DEER RIDGE TRAIL         │  ← Drag handle to dismiss
├──────────────────────────────┤
│  📍 7.3 km | 340m | Hard     │
│  🥾 Auto-Pédestre Network    │
│                              │
│  [Elevation Chart]           │
│                              │
│  📋 Highlights:              │
│     • Forest trail           │
│     • Mountain views         │
│     • Water source @ 4km     │
│                              │
│  [Download GPX] [More Info]  │
│                              │
│  [Map View - Full Screen]    │
└──────────────────────────────┘
```


#### **Option B: Split-View with Interactive List**

```
┌──────────────────────┬──────────────────┐
│    MAP (50%)         │   DETAILS (50%)   │
│                      │                   │
│  [Minimap showing    │  • Name           │
│   selected route]    │  • Distance       │
│                      │  • Elevation      │
│                      │  • Difficulty     │
│                      │  • Type           │
│                      │  [Download]       │
├──────────────────────┼──────────────────┤
│ ROUTE LIST (50%)     │                   │
│ • Route A (selected) │  [Details of A]   │
│ • Route B            │                   │
│ • Route C            │                   │
└──────────────────────┴──────────────────┘
```

**Issue**: iPad-optimized but cramped on iPhone SE or older phones. Better for iPad first, then optimize iPhone separately.

***

### **📱 Mobile-First Interaction Patterns**

#### **1. The "Swipeable List" Approach** ✅ Recommended

```swift
// Pseudo-code for React Native:
<FlatList
  data={routes}
  renderItem={({ item }) => (
    <Pressable onPress={() => showBottomSheet(item)}>
      <RouteCard 
        name={item.name}
        distance={item.distance}
        elevation={item.elevation}
        difficulty={getDifficultyColor(item)}
      />
    </Pressable>
  )}
  scrollEnabled={true}
/>
```

**Why this works:**

- Fingers naturally expect vertical scroll
- Tap opens details (standard iOS pattern)
- No hover needed
- Touch target: 44x44pt minimum (Apple HIG standard)


#### **2. Pull-to-Expand Route Details**

When user taps a route:

```
Initial → Expanded
[List] → [Bottom Sheet covering 70% of screen]
       → [User swipes down or taps outside to collapse]
       → [Returning to list view]
```

**Implementation**: Use React Native's `BottomSheetModal` from `@gorhom/bottom-sheet` or native Expo library.

#### **3. Map Integration - Two Modes**

**Mode 1: Compact Map (35% height, tap-aware)**

- Shows all routes in current region
- Tap route on map = select that route in list
- Route becomes highlighted in list below
- Prevents accidental map panning when trying to interact with list

**Mode 2: Expand to Fullscreen**

- Tap "View on Map" in bottom sheet
- Full-screen map appears
- Show selected route highlighted
- Easy back button to return to discovery

***

### **🎨 Visual Design Updates for iOS**

#### **Current Web Issues:**

1. **Hover reveals detail** → No equivalent on touch
2. **Horizontal scrolling hints** → Less discoverable on mobile
3. **Density** → Too many items visible, hard to tap accurately
4. **Color system** → Good, but add **difficulty badges** more prominently

#### **iOS Improvements:**

| Aspect | Web | iOS |
| :-- | :-- | :-- |
| **Route Item** | Minimal text, hover reveal | Bold difficulty badge, key stats always visible |
| **Touch Targets** | Hover area (~full item) | Entire item is 60pt min height |
| **Detail Access** | Hover over list | Tap item → bottom sheet |
| **Map Integration** | Right side, always visible | Top card, tappable for expand |
| **Scrolling** | Vertical (list) + horizontal (map) | Vertical only (conflicts with map) |
| **Color Coding** | Yes, but subtle | Larger badges: 🟢 Easy / 🟡 Moderate / 🔴 Hard |

#### **New Route Item Design**

```
┌───────────────────────────────────┐
│ 🟢 Deer Ridge Trail              │  ← Difficulty badge (tappable)
│ 7.3 km • 340m elev • 2.5h        │  ← Key metrics inline
│ Auto-Pédestre Bertrange Network  │  ← Route network/brand
│                                   │
│ ⭐⭐⭐⭐⭐ 4.8/5 (42 ratings)     │  ← Social proof (optional)
│                                   │
│ Forest trail with scenic views    │  ← 1-line description
│ [→ Tap for full details]         │  ← Affordance hint
└───────────────────────────────────┘
  Height: 120-140pt (thumbs comfortable)
```


***

### **🔄 Filtering \& Discovery on Mobile**

Your current **shuffle** feature is great, but filtering needs adjustment:

**Current**: Filter dropdown + shuffled list

**iOS Improved**:

```
┌─────────────────────────────────┐
│ [Filters] [💾 Saved]  [🔄 Random] │  ← Segmented tabs
├─────────────────────────────────┤
│ Show: Distance | Difficulty | Type│  ← Expandable filters
│ ▾ Difficulty: Easy, Moderate    │
│ ▾ Distance: 5-15km              │
│ ▾ Type: Trail, Road             │
└─────────────────────────────────┘
[Route List Below]
```

**Key UX improvements:**

- Filters as **persistent horizontal chips** (not dropdown)
- Clear visual state (selected = bold, unselected = light)
- Shuffle button always accessible
- "Clear Filters" obvious when active

***

### **📊 Screen Real-Estate Budget (iPhone 14 Pro)**

```
Vertical Space: 812pt

[Status Bar]         16pt
[Navigation Bar]     44pt
──────────────────────
[Map Card]          280pt  (includes safe area insets)
[Route List]        472pt  (scrollable)
[Home Indicator]     34pt
──────────────────────
TOTAL:              812pt
```

**Allocation Strategy:**

- **Map**: 30% (context, not primary)
- **List**: 60% (primary interaction)
- **Bottom sheet**: Covers 70% when expanded (not full screen to show dismiss affordance)

***

### **⚡ Key Implementation Priorities**

1. **Bottom Sheet Component** (highest impact)
    - Replace hover reveal with tap → modal pattern
    - Implement using `@react-native-menu/menu` or `@gorhom/bottom-sheet`
    - Show full details: elevation profile, amenities, network info
2. **Visual Hierarchy on List Items**
    - Make routes look tappable (shadow, highlight on press)
    - Show difficulty badge prominently
    - Include key metrics (distance, elevation, time estimate)
3. **Map Integration**
    - Reduce to 30-40% height (provide context, not primary interaction)
    - Add "View Full Map" action in bottom sheet
    - Show selected route highlighted
4. **Touch-Safe Interactions**
    - Min 44x44pt for all tappable areas
    - Remove hover-based interactions entirely
    - Add visual feedback (highlight, animation) on tap
5. **Responsive Text**
    - iOS: Larger fonts (body text 16pt min)
    - Web: Can stay 14pt
    - Use system fonts (`-apple-system`) for iOS native feel

***

### **📝 Bottom Sheet Content Structure** (Recommended)

```markdown
### Header Section (Sticky)
- Route name + difficulty badge
- Quick stats: distance | elevation | time

### Scrollable Content
- Elevation profile chart
- Description & route type
- Amenities / points of interest
- Safety notes / difficulty details

### Action Buttons (Sticky at bottom)
- [📍 Navigate]  [💾 Save]  [⬇️ Download GPX]
- [View on Map (full screen)]
- [More Details / Website]
```


***

### **🚀 Migration Path**

1. **Phase 1**: Keep web layout unchanged (it's good for desktop)
2. **Phase 2**: Create iOS-specific Discovery screen
    - Bottom sheet for details
    - Adjusted map size
    - Mobile-first list items
3. **Phase 3**: Add Android version (similar but system-specific)
4. **Phase 4**: Share common components where possible

***

### **Final Recommendation**

**Go with Option A (Bottom Sheet) for iPhone-first approach:**

✅ Leverages iOS design patterns
✅ Solves the hover problem elegantly
✅ Maximizes screen real-estate efficiently
✅ Proven pattern in Strava, AllTrails, Maps
✅ Easy to implement with existing libraries

Would you like me to create a wireframe prototype or detailed component specs for any of these sections?
<span style="display:none">[^1][^2][^3][^4]</span>

<div align="center">⁂</div>

[^1]: Screenshot-2025-12-14-at-10.36.27.jpg

[^2]: Screenshot-2025-12-14-at-10.35.50.jpg

[^3]: plan.md

[^4]: itinerary-pitch.md

