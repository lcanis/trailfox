import React, { useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';

// const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NativeBottomSheetProps {
  mapComponent: React.ReactNode;
  children: React.ReactNode;
  snapPoints?: string[];
  index?: number;
}

export const NativeBottomSheet = ({
  mapComponent,
  children,
  snapPoints = ['12%', '50%', '95%'],
  index = 1,
}: NativeBottomSheetProps) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const animatedIndex = useSharedValue(index);

  // Background animation style (Apple Maps effect)
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    // Interpolate based on the index (0 to 2)
    // 0 = 12% (Collapsed)
    // 1 = 50% (Mid)
    // 2 = 95% (Expanded)

    // We want the scale effect to happen when moving from Mid (1) to Expanded (2)
    const scale = interpolate(animatedIndex.value, [1, 2], [1, 0.92], Extrapolation.CLAMP);

    const borderRadius = interpolate(animatedIndex.value, [1, 2], [0, 20], Extrapolation.CLAMP);

    return {
      transform: [{ scale }],
      borderRadius,
      overflow: 'hidden',
    };
  });

  // Overlay opacity style
  const animatedOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(animatedIndex.value, [1, 2], [0, 0.3], Extrapolation.CLAMP);

    return {
      opacity,
    };
  });

  // Custom Background Component with Blur
  const CustomBackground = ({ style }: any) => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView
          style={[style, styles.blurView]}
          blurType="chromeMaterial"
          blurAmount={20}
          reducedTransparencyFallbackColor="white"
        />
      );
    }
    return <View style={[style, { backgroundColor: 'white' }]} />;
  };

  return (
    <View style={styles.container}>
      {/* Map Container with Animation */}
      <Animated.View style={[styles.mapContainer, animatedBackgroundStyle]}>
        {mapComponent}
        {/* Dark Overlay for focus effect */}
        <Animated.View style={[styles.overlay, animatedOverlayStyle]} pointerEvents="none" />
      </Animated.View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={index}
        snapPoints={snapPoints}
        animatedIndex={animatedIndex}
        backgroundComponent={CustomBackground}
        handleIndicatorStyle={styles.handleIndicator}
        enablePanDownToClose={false}
      >
        {children}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black', // Background color visible when map scales down
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    overflow: 'hidden',
  },
  handleIndicator: {
    backgroundColor: '#C7C7CC',
    width: 40,
  },
  contentContainer: {
    flex: 1,
  },
});
