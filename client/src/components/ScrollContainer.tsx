import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

export const ScrollContainer = React.forwardRef<ScrollView, ScrollViewProps>((props, ref) => {
  return <ScrollView ref={ref} {...props} />;
});
ScrollContainer.displayName = 'ScrollContainer';
