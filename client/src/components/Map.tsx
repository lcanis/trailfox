import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MapProps {
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
  onViewChange: (visibleIds: Set<number>) => void;
  selectedId: number | null;
  highlightedId: number | null;
}

export default function Map(props: MapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map is not yet implemented for native.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#666',
  },
});
