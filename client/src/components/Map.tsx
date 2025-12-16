import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MapProps {
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
  onViewChange: (visibleIds: Set<number>) => void;
  selectedId: number | null;
  highlightedId: number | null;
  compact?: boolean; // when true render a compact (small-height) variant
}

export default function Map({ compact = false, ...props }: MapProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {!compact ? (
        <>
          <Text style={styles.text}>Map Pending...</Text>
          <Text style={styles.subtext}>(Requires Native Build)</Text>
        </>
      ) : (
        // Compact display: still indicate this is the (placeholder) map.
        <Text style={styles.compactText}>Map Pending…</Text>
      )}
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
  containerCompact: {
    // Compact variant: remove margins/borders so it fits a small parent height
    flex: 0,
    margin: 0,
    borderWidth: 0,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
  },
  compactText: {
    fontSize: 12,
    color: '#666',
    paddingVertical: 2,
  },
  subtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
});
