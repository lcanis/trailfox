import React from 'react';
import { ScrollViewProps } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

export const ScrollContainer = React.forwardRef<any, ScrollViewProps>((props, ref) => {
  return <BottomSheetScrollView ref={ref} {...(props as any)} />;
});
ScrollContainer.displayName = 'ScrollContainer';
