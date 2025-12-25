import React, { forwardRef } from 'react';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { FlatListProps, FlatList } from 'react-native';

export const ListContainer = forwardRef(function ListContainer<T>(
  props: FlatListProps<T>,
  ref: React.Ref<FlatList<T>>
) {
  return <BottomSheetFlatList ref={ref as any} {...(props as any)} />;
}) as <T>(props: FlatListProps<T> & { ref?: React.Ref<FlatList<T>> }) => React.ReactElement;
