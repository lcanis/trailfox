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
      <Text style={styles.text}>Map Pending...</Text>
      <Text style={styles.subtext}>(Requires Native Build)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 10,
    borderRadius: 8,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
  },
  subtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
});
