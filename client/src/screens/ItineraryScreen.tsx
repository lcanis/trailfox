import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ItineraryScreen as BaseItineraryScreen } from './ItineraryScreenBase';
import ItineraryMap from '../components/ItineraryMap';

export const ItineraryScreen = (props: React.ComponentProps<typeof BaseItineraryScreen>) => {
  const [selectedClusterKey, setSelectedClusterKey] = React.useState<string | null>(null);
  const showMapPane = Platform.OS === 'web';

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.backdrop}>
        <BaseItineraryScreen
          {...props}
          split={false}
          selectedClusterKey={selectedClusterKey}
          onSelectClusterKey={setSelectedClusterKey}
        />
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <BaseItineraryScreen
        {...props}
        split={showMapPane}
        selectedClusterKey={selectedClusterKey}
        onSelectClusterKey={setSelectedClusterKey}
        renderRightPane={
          showMapPane
            ? ({ route, clusters, selectedClusterKey, setSelectedClusterKey }) => (
                <ItineraryMap
                  routeOsmId={route.osm_id}
                  clusters={clusters}
                  selectedClusterKey={selectedClusterKey}
                  onSelectClusterKey={setSelectedClusterKey}
                />
              )
            : undefined
        }
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
    flex: 1, // Ensure it takes space
  },
});
