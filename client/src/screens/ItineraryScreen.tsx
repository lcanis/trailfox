import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ItineraryContent } from './ItineraryContent';
import ItineraryMap from '../components/ItineraryMap';
import { NativeBottomSheet } from '../components/NativeBottomSheet';

export const ItineraryScreen = (props: React.ComponentProps<typeof ItineraryContent>) => {
  const [selectedClusterKey, setSelectedClusterKey] = React.useState<string | null>(null);

  const snapPoints = React.useMemo(() => ['12%', '50%', '95%'], []);

  return (
    <View style={styles.backdrop}>
      <ItineraryContent
        {...props}
        selectedClusterKey={selectedClusterKey}
        onSelectClusterKey={setSelectedClusterKey}
        renderWrapper={({
          content,
          clusters,
          selectedClusterKey,
          setSelectedClusterKey,
          route,
        }) => (
          <NativeBottomSheet
            index={2}
            snapPoints={snapPoints}
            mapComponent={
              <ItineraryMap
                routeOsmId={route.osm_id}
                clusters={clusters}
                selectedClusterKey={selectedClusterKey}
                onSelectClusterKey={setSelectedClusterKey}
              />
            }
          >
            {content}
          </NativeBottomSheet>
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
    zIndex: 100,
  },
});
