import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { Route, RouteFilter } from '../types';
import { NETWORK_MAP } from '../constants';

interface RouteListProps {
  routes: Route[];
  filter: RouteFilter;
  onFilterChange: (newFilter: RouteFilter) => void;
  onSelect: (route: Route) => void;
}

export const RouteList: React.FC<RouteListProps> = ({
  routes,
  filter,
  onFilterChange,
  onSelect,
}) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  const updateFilter = (updates: Partial<RouteFilter>) => {
    onFilterChange({ ...filter, ...updates });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.panelTitle, isSmallScreen && styles.panelTitleSmall]}>
        Routes ({routes.length})
      </Text>

      <TextInput
        style={[styles.searchInput, isSmallScreen && styles.searchInputSmall]}
        placeholder="Search routes..."
        value={filter.searchQuery}
        onChangeText={(text) => updateFilter({ searchQuery: text })}
      />

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

      <FlatList
        data={routes}
        keyExtractor={(item) => String(item.osm_id)}
        style={styles.list}
        renderItem={({ item }) => {
          const networkInfo = item.network ? NETWORK_MAP[item.network] : null;
          return (
            <TouchableOpacity
              style={[styles.listItem, isSmallScreen && styles.listItemSmall]}
              onPress={() => onSelect(item)}
            >
              <Text
                style={[styles.listItemTitle, isSmallScreen && styles.listItemTitleSmall]}
                numberOfLines={1}
              >
                {item.name || 'Unnamed'}
              </Text>
              <View style={styles.listItemMeta}>
                {networkInfo ? (
                  <View style={[styles.badge, { backgroundColor: networkInfo.color }]}>
                    <Text style={styles.badgeText}>{networkInfo.label}</Text>
                  </View>
                ) : (
                  <Text style={styles.listItemBadge}>{item.network || '?'}</Text>
                )}
                <Text style={styles.listItemSub}>
                  {item.length_m ? `${(item.length_m / 1000).toFixed(1)} km` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const SortButton = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={[styles.sortBtn, active && styles.sortBtnActive]}>
    <Text style={[styles.sortBtnText, active && styles.sortBtnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 20,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    margin: 10,
    padding: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  controls: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  },
  sortButtons: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sortBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sortBtnActive: {
    backgroundColor: '#007bff',
  },
  sortBtnText: {
    fontSize: 12,
    color: '#555',
  },
  sortBtnTextActive: {
    color: 'white',
  },
  list: {
    flex: 1,
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  listItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listItemBadge: {
    fontSize: 10,
    backgroundColor: '#eee',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    color: '#666',
  },
  listItemSub: {
    fontSize: 12,
    color: '#888',
  },
  // Small screen variants
  panelTitleSmall: {
    fontSize: 16,
    padding: 10,
  },
  searchInputSmall: {
    margin: 5,
    padding: 6,
    fontSize: 12,
  },
  controlsSmall: {
    padding: 5,
  },
  controlLabelSmall: {
    fontSize: 12,
  },
  listItemSmall: {
    padding: 8,
  },
  listItemTitleSmall: {
    fontSize: 13,
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
