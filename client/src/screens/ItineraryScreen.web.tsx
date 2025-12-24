import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ItineraryContent } from './ItineraryContent';
import ItineraryMap from '../components/ItineraryMap.web';

// Web tweaks: keep a subtle backdrop so the user understands this is an overlay.
export const ItineraryScreen = (props: React.ComponentProps<typeof ItineraryContent>) => {
  const [selectedClusterKey, setSelectedClusterKey] = React.useState<string | null>(null);
  return (
    <View style={styles.backdrop}>
      <ItineraryContent
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
