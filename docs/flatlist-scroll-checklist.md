# FlatList Scroll-to-Current-Location Troubleshooting Checklist

When the "current location" button doesn't scroll the bottom sheet list to the user's location, please check that the following conditions are met.

---

## 1. FlatList Ref Properly Attached

Please check that the FlatList ref is correctly initialized and passed to the component:

```tsx
const listRef = useRef<FlatList>(null);

// Later, in your JSX:
<BottomSheetFlatList 
  ref={listRef}
  data={itinerary}
  renderItem={({ item }) => <ItineraryRow item={item} />}
  keyExtractor={(item, index) => item.id || index.toString()}
/>
```

Verify the ref is accessible by logging:

```tsx
console.log('FlatList ref available:', !!listRef.current);
```

If this logs `false`, the ref was never attached.

---

## 2. scrollToIndex() Called After List is Rendered

Please check that the FlatList has mounted and laid out items before you call `scrollToIndex()`. If called too early, the list may not respond.

```tsx
// ❌ DON'T do this immediately
const handleCurrentLocation = () => {
  listRef.current?.scrollToIndex({ index: closestIndex });
};

// ✅ DO add a small delay to ensure list is ready
const handleCurrentLocation = () => {
  setTimeout(() => {
    listRef.current?.scrollToIndex({ 
      index: closestIndex, 
      animated: true,
      viewPosition: 0.5 // centers the item vertically
    });
  }, 100);
};
```

---

## 3. Item Height Defined with getItemLayout

Please check that you've provided `getItemLayout` to help the FlatList calculate scroll positions accurately. Without this, `scrollToIndex()` is unreliable:

```tsx
// Define a constant for your item height
const ITEM_HEIGHT = 80; // adjust to your actual row height

<BottomSheetFlatList
  data={itinerary}
  renderItem={({ item }) => <ItineraryRow item={item} />}
  keyExtractor={(item, index) => item.id || index.toString()}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

The `getItemLayout` function tells React Native the exact pixel dimensions of each item, enabling reliable scroll calculations.

---

## 4. Scroll Is Enabled on the List

Please check that scrolling is explicitly enabled on the `BottomSheetFlatList`:

```tsx
<BottomSheetFlatList
  data={itinerary}
  renderItem={({ item }) => <ItineraryRow item={item} />}
  scrollEnabled={true}
  nestedScrollEnabled={true}  // critical for nested scrolling in bottom sheets
  getItemLayout={getItemLayout}
  keyExtractor={(item, index) => item.id || index.toString()}
/>
```

Both `scrollEnabled` and `nestedScrollEnabled` are important when your list is nested inside a bottom sheet.

---

## 5. Current Location Index Calculation Is Valid

Please check that the closest-point algorithm returns a valid index and that you validate it before scrolling:

```tsx
// Example closest-point calculation
const findClosestItineraryIndex = (
  userLat: number,
  userLon: number,
  itinerary: ItineraryItem[]
): number => {
  let closestIndex = -1;
  let minDistance = Infinity;

  itinerary.forEach((item, index) => {
    const distance = Math.hypot(
      item.latitude - userLat,
      item.longitude - userLon
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
};

// In your handler:
const handleCurrentLocation = () => {
  const closestIndex = findClosestItineraryIndex(
    userLocation.latitude,
    userLocation.longitude,
    itinerary
  );

  // Validate the index
  if (closestIndex < 0 || closestIndex >= itinerary.length) {
    console.warn('Invalid index:', closestIndex, 'Total items:', itinerary.length);
    return;
  }

  listRef.current?.scrollToIndex({
    index: closestIndex,
    animated: true,
    viewPosition: 0.5,
  });
};
```

---

## 6. Bottom Sheet Is Expanded Enough

Please check that the bottom sheet is in an expanded state where the list is actually visible and scrollable. If the sheet is at a very low snap point (collapsed), scrolling may not be visible:

```tsx
const sheetRef = useRef(null);

const handleCurrentLocation = () => {
  // Step 1: Expand the bottom sheet to a mid or expanded snap point
  sheetRef.current?.snapToIndex(1); // e.g., middle snap point

  // Step 2: After the sheet finishes animating, scroll the list
  setTimeout(() => {
    const closestIndex = findClosestItineraryIndex(
      userLocation.latitude,
      userLocation.longitude,
      itinerary
    );

    if (closestIndex >= 0 && closestIndex < itinerary.length) {
      listRef.current?.scrollToIndex({
        index: closestIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, 300); // 300ms accounts for sheet animation duration
};

// In your JSX:
<BottomSheet
  ref={sheetRef}
  snapPoints={['15%', '40%', '85%']}
>
  <BottomSheetFlatList ref={listRef} ... />
</BottomSheet>
```

---

## 7. Using the Correct Scroll Method

Please check that you're using the appropriate scroll method for your use case:

### For Indexed Items (with getItemLayout):

```tsx
// Use scrollToIndex when you have consistent item heights
listRef.current?.scrollToIndex({
  index: closestIndex,
  animated: true,
  viewPosition: 0.5,
});
```

### For Variable Heights (without getItemLayout):

If your items have variable heights and you don't use `getItemLayout`, use `scrollToOffset()` instead:

```tsx
const ITEM_HEIGHT = 80; // approximate average height
const offset = ITEM_HEIGHT * closestIndex;

listRef.current?.scrollToOffset({
  offset,
  animated: true,
});
```

---

## Diagnostic Logging

Please add comprehensive logging to identify which step is failing:

```tsx
const handleCurrentLocation = () => {
  console.log('=== Current Location Pressed ===');
  console.log('FlatList ref available:', !!listRef.current);
  
  const closestIndex = findClosestItineraryIndex(
    userLocation.latitude,
    userLocation.longitude,
    itinerary
  );
  
  console.log('Closest index:', closestIndex);
  console.log('Total items in list:', itinerary.length);
  console.log('Index is valid:', closestIndex >= 0 && closestIndex < itinerary.length);
  console.log('Bottom sheet snap index:', sheetIndex);

  if (closestIndex < 0 || closestIndex >= itinerary.length) {
    console.warn('Cannot scroll: invalid index');
    return;
  }

  console.log('Attempting to scroll to index:', closestIndex);
  
  listRef.current?.scrollToIndex({
    index: closestIndex,
    animated: true,
    viewPosition: 0.5,
  });
};
```

Check your console output to see which log line appears last. That will tell you where the issue is.

---

## Complete Example Setup

Here's a minimal working example that combines all the pieces:

```tsx
import React, { useRef, useState, useCallback } from 'react';
import { FlatList, View, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

interface ItineraryItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
}

const ITEM_HEIGHT = 80;

const ItineraryScreen: React.FC = () => {
  const listRef = useRef<FlatList>(null);
  const sheetRef = useRef(null);
  const snapPoints = ['15%', '40%', '85%'];

  const [itinerary, setItinerary] = useState<ItineraryItem[]>([
    // your data
  ]);

  const [userLocation, setUserLocation] = useState({
    latitude: 49.6116,
    longitude: 6.1319,
  });

  const [sheetIndex, setSheetIndex] = useState(1);

  const findClosestIndex = useCallback((): number => {
    let closestIndex = -1;
    let minDistance = Infinity;

    itinerary.forEach((item, index) => {
      const distance = Math.hypot(
        item.latitude - userLocation.latitude,
        item.longitude - userLocation.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }, [itinerary, userLocation]);

  const handleCurrentLocation = useCallback(() => {
    console.log('=== Current Location Button Pressed ===');
    
    const closestIndex = findClosestIndex();
    console.log('Closest index:', closestIndex, 'Total items:', itinerary.length);

    if (closestIndex < 0 || closestIndex >= itinerary.length) {
      console.warn('Invalid index, cannot scroll');
      return;
    }

    // Expand the sheet first
    sheetRef.current?.snapToIndex(1);

    // Then scroll after animation completes
    setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: closestIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 300);
  }, [findClosestIndex, itinerary.length]);

  const getItemLayout = useCallback(
    (data: ItineraryItem[] | null, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = ({ item }: { item: ItineraryItem }) => (
    <View style={{ height: ITEM_HEIGHT, padding: 10, borderBottomWidth: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
      <Text style={{ fontSize: 12, color: '#666' }}>
        {item.distance.toFixed(1)} km
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Map area with current location button */}
      <View style={{ flex: 1, backgroundColor: '#e8f5e9' }}>
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 100,
            right: 20,
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: '#2196F3',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={handleCurrentLocation}
        >
          <Text style={{ color: 'white', fontSize: 20 }}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet with Itinerary List */}
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={sheetIndex}
        onChange={setSheetIndex}
      >
        <BottomSheetFlatList
          ref={listRef}
          data={itinerary}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          getItemLayout={getItemLayout}
        />
      </BottomSheet>
    </View>
  );
};

export default ItineraryScreen;
```

---

## 6. Finite Height Constraint (Critical for Bottom Sheets)

Please check that the list container has a finite height. If a `FlatList` is placed inside a container that allows it to expand to its full content height (e.g., 14,000px), the scroll engine will effectively be disabled because the list believes it is already fully visible.

**Common Pitfall**: Using `BottomSheetView` or `BottomSheetScrollView` as a direct parent can sometimes trigger this "infinite height" behavior.

```tsx
// ❌ DON'T: Let the list expand infinitely
<BottomSheet>
  <BottomSheetView>
    <BottomSheetFlatList ... />
  </BottomSheetView>
</BottomSheet>

// ✅ DO: Constrain the height
const { height: screenHeight } = useWindowDimensions();

<BottomSheet>
  <View style={{ flex: 1, maxHeight: screenHeight }}>
    <BottomSheetFlatList ... />
  </View>
</BottomSheet>
```

---

## 7. Jump-then-Scroll Strategy

In some versions of `@gorhom/bottom-sheet`, `scrollToIndex` can be unreliable if the target index is very far from the current scroll position. A more robust approach is to "jump" to the offset first, then "scroll" to the index to ensure alignment.

```tsx
const layout = getItemLayout(data, index);

// 1. Immediate jump (non-animated)
listRef.current?.scrollToOffset({ 
  offset: layout.offset, 
  animated: false 
});

// 2. Follow-up scroll (animated) to ensure viewPosition is respected
setTimeout(() => {
  listRef.current?.scrollToIndex({
    index,
    animated: true,
    viewPosition: 0.05 // Top-aligned is safer for bottom sheets
  });
}, 100);
```

---

## 8. Fabric / New Architecture Compatibility

If you encounter a crash like `Assertion failure in ... RCTComponentViewFactory` or `ComponentView with componentHandle (View) not found`, it may be due to how `BottomSheetView` interacts with the Fabric renderer.

**Solution**: Replace `BottomSheetView` with a standard `View` and ensure `flex: 1` and `overflow: 'hidden'` are applied to the parent.

---

## 9. ViewPosition for Partially Visible Sheets

When using `viewPosition: 0.5` (center), the target item might be hidden behind the map if the bottom sheet is in a "Mid" or "Collapsed" snap point.

**Recommendation**: Use `viewPosition: 0.05` to place the item near the top of the visible list area, which is always visible regardless of the sheet's snap point.

---

## Summary Checklist

Before investigating further, please confirm:

- [ ] FlatList ref is initialized and passed correctly
- [ ] `scrollToIndex()` is called with a small delay (100–300ms)
- [ ] `getItemLayout` is provided with correct item height
- [ ] `scrollEnabled={true}` and `nestedScrollEnabled={true}` are set
- [ ] Closest index calculation returns a valid value (0 to length-1)
- [ ] Bottom sheet snap points allow the list to be visible
- [ ] **Container height is constrained (not infinite)**
- [ ] **Jump-then-scroll strategy is used for long distances**
- [ ] Console logs show which step is failing

If all of these are verified and scrolling still doesn't work, share your code and logs, and I can help pinpoint the exact issue.
