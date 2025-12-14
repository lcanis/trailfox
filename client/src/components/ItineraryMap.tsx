import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AmenityCluster } from '../types';

interface ItineraryMapProps {
  routeOsmId: number;
  clusters: AmenityCluster[];
  selectedClusterKey: string | null;
  onSelectClusterKey: (key: string | null) => void;
}

export default function ItineraryMap(props: ItineraryMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Itinerary Map Pending...</Text>
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
    minHeight: 200,
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});
