import React from 'react';
import { StyleSheet, View } from 'react-native';

interface NativeBottomSheetProps {
  mapComponent: React.ReactNode;
  children: React.ReactNode;
  snapPoints?: string[];
  index?: number;
}

export const NativeBottomSheet = ({ mapComponent, children }: NativeBottomSheetProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>{mapComponent}</View>
      <View style={styles.sheetContainer}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row', // Side-by-side on web might be better, but let's stick to overlay for now
    backgroundColor: '#000',
  },
  mapContainer: {
    flex: 1,
    height: '100%',
  },
  sheetContainer: {
    width: 400,
    height: '100%',
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#ccc',
    zIndex: 10,
  },
});
