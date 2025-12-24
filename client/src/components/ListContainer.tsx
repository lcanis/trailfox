import React from 'react';
import { FlatList, FlatListProps } from 'react-native';

export function ListContainer<T>(props: FlatListProps<T> & { ref?: React.Ref<FlatList<T>> }) {
  return <FlatList {...props} />;
}
