import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ItineraryContent } from './ItineraryContent';
import ItineraryMap from '../components/ItineraryMap';
import { NativeBottomSheet } from '../components/NativeBottomSheet';
import { useUserLocation } from '../hooks/useUserLocation';

export const ItineraryScreen = (props: React.ComponentProps<typeof ItineraryContent>) => {
  const [selectedClusterKey, setSelectedClusterKey] = React.useState<string | null>(null);
  const [isFollowingUser, setIsFollowingUser] = React.useState(false);
  const { location: userLocation, isLocating } = useUserLocation({ enabled: isFollowingUser });
  const followDisableGuardUntilRef = React.useRef(0);

  const snapPoints = React.useMemo(() => ['8%', '50%', '85%'], []);

  const handleToggleFollowUser = () => {
    setIsFollowingUser((prev) => {
      const next = !prev;
      if (next) {
        // Prevent immediate disable from map touch events triggered by the button tap.
        followDisableGuardUntilRef.current = Date.now() + 800;
      }
      return next;
    });
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
        isLocating={isLocating}
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
            index={1}
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
                followDisableGuardUntil={followDisableGuardUntilRef.current}
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
