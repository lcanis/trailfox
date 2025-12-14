import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ItineraryScreen as BaseItineraryScreen } from './ItineraryScreenBase';
import ItineraryMap from '../components/ItineraryMap';

export const ItineraryScreen = (props: React.ComponentProps<typeof BaseItineraryScreen>) => {
  const [selectedClusterKey, setSelectedClusterKey] = React.useState<string | null>(null);
  return (
    <View style={styles.backdrop}>
      <BaseItineraryScreen
        {...props}
        split
        selectedClusterKey={selectedClusterKey}
        onSelectClusterKey={setSelectedClusterKey}
        renderRightPane={({ route, clusters, selectedClusterKey, setSelectedClusterKey }) => (
          <ItineraryMap
            routeOsmId={route.osm_id}
            clusters={clusters}
            selectedClusterKey={selectedClusterKey}
            onSelectClusterKey={setSelectedClusterKey}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.06)',
    zIndex: 99,
  },
});
