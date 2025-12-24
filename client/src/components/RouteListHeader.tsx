import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { RouteFilter } from '../types';

interface RouteListHeaderProps {
  totalCount: number | null | undefined;
  routesLength: number;
  filter: RouteFilter;
  onFilterChange: (newFilter: RouteFilter) => void;
  loading?: boolean;
  isSmallScreen: boolean;
}

const SortButton = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={[styles.sortBtn, active && styles.sortBtnActive]} onPress={onPress}>
    <Text style={[styles.sortBtnText, active && styles.sortBtnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export const RouteListHeader: React.FC<RouteListHeaderProps> = ({
  totalCount,
  routesLength,
  filter,
  onFilterChange,
  loading,
  isSmallScreen,
}) => {
  const updateFilter = (updates: Partial<RouteFilter>) => {
    onFilterChange({ ...filter, ...updates });
  };

  // Use BottomSheetTextInput on native to ensure it works with the bottom sheet gestures
  const InputComponent = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

  return (
    <View>
      <Text style={[styles.panelTitle, isSmallScreen && styles.panelTitleSmall]}>
        Routes ({totalCount !== undefined && totalCount !== null ? totalCount : routesLength})
      </Text>

      <InputComponent
        style={[styles.searchInput, isSmallScreen && styles.searchInputSmall]}
        placeholder="Search routes..."
        value={filter.searchQuery}
        onChangeText={(text) => updateFilter({ searchQuery: text })}
        placeholderTextColor="#999"
      />

      {routesLength === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No routes found.</Text>
        </View>
      )}

      <View style={[styles.controls, isSmallScreen && styles.controlsSmall]}>
        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, isSmallScreen && styles.controlLabelSmall]}>
            Current View Only
          </Text>
          <Switch
            value={filter.viewboxOnly}
            onValueChange={(val) => updateFilter({ viewboxOnly: val })}
          />
        </View>
        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, isSmallScreen && styles.controlLabelSmall]}>
            Sort by:
          </Text>
          <View style={styles.sortButtons}>
            <SortButton
              label="Name"
              active={filter.sortBy === 'name'}
              onPress={() => updateFilter({ sortBy: filter.sortBy === 'name' ? null : 'name' })}
            />
            <SortButton
              label="Length"
              active={filter.sortBy === 'length'}
              onPress={() => updateFilter({ sortBy: filter.sortBy === 'length' ? null : 'length' })}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  panelTitleSmall: {
    fontSize: 18,
    padding: 12,
  },
  searchInput: {
    margin: 10,
    padding: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16,
  },
  searchInputSmall: {
    margin: 8,
    padding: 8,
    fontSize: 14,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
  controls: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  controlsSmall: {
    padding: 8,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  controlLabelSmall: {
    fontSize: 13,
  },
  sortButtons: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    overflow: 'hidden',
  },
  sortBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sortBtnActive: {
    backgroundColor: '#007bff',
  },
  sortBtnText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  sortBtnTextActive: {
    color: 'white',
  },
});
