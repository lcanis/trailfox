import React, { forwardRef } from 'react';
import { FlatList, FlatListProps } from 'react-native';

export const ListContainer = forwardRef(function ListContainer<T>(
  props: FlatListProps<T>,
  ref: React.Ref<FlatList<T>>
) {
  return <FlatList ref={ref} {...props} />;
}) as <T>(props: FlatListProps<T> & { ref?: React.Ref<FlatList<T>> }) => React.ReactElement;
