import React from 'react';
import { View } from 'react-native';

interface NativeBottomSheetProps {
  mapComponent: React.ReactNode;
  children: React.ReactNode;
  snapPoints?: string[];
  index?: number;
}

export const NativeBottomSheet = ({ mapComponent, children }: NativeBottomSheetProps) => {
  return (
    <View style={{ flex: 1 }}>
      {mapComponent}
      {children}
    </View>
  );
};
