import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ItineraryContent } from './ItineraryContent';
import ItineraryMap from '../components/ItineraryMap';
import { NativeBottomSheet } from '../components/NativeBottomSheet';
import { useUserLocation } from '../hooks/useUserLocation';

export const ItineraryScreen = (props: React.ComponentProps<typeof ItineraryContent>) => {
  const [selectedClusterKey, setSelectedClusterKey] = React.useState<string | null>(null);
  const { location: userLocation } = useUserLocation();
  const [isFollowingUser, setIsFollowingUser] = React.useState(false);

  const snapPoints = React.useMemo(() => ['8%', '50%', '95%'], []);

  const handleToggleFollowUser = () => {
    setIsFollowingUser((prev) => !prev);
  };

  const handleSelectClusterKey = (key: string | null) => {
    setSelectedClusterKey(key);
    if (key) {
      setIsFollowingUser(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <ItineraryContent
        {...props}
        selectedClusterKey={selectedClusterKey}
        onSelectClusterKey={handleSelectClusterKey}
        userLocation={userLocation}
        isFollowingUser={isFollowingUser}
        onToggleFollowUser={handleToggleFollowUser}
        renderWrapper={({
          content,
          clusters,
          selectedClusterKey,
          setSelectedClusterKey,
          route,
          onOpenFilters,
        }) => (
          <NativeBottomSheet
            index={2}
            snapPoints={snapPoints}
            mapComponent={
              <ItineraryMap
                routeOsmId={route.osm_id}
                clusters={clusters}
                selectedClusterKey={selectedClusterKey}
                onSelectClusterKey={handleSelectClusterKey}
                userLocation={userLocation}
                isFollowingUser={isFollowingUser}
                onToggleFollowUser={handleToggleFollowUser}
                onOpenFilters={onOpenFilters}
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
