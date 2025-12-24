import React from 'react';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { FlatListProps } from 'react-native';

export function ListContainer<T>(props: FlatListProps<T> & { ref?: React.Ref<any> }) {
  return <BottomSheetFlatList {...(props as any)} />;
}
