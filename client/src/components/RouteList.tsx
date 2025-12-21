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
  ActivityIndicator,
} from 'react-native';
import { Route, RouteFilter } from '../types';
import { NETWORK_MAP } from '../constants';

interface RouteListProps {
  routes: Route[];
  filter: RouteFilter;
  onFilterChange: (newFilter: RouteFilter) => void;
  onSelect: (route: Route) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  totalCount?: number | null;
}

export const RouteList: React.FC<RouteListProps> = ({
  routes,
  filter,
  onFilterChange,
  onSelect,
  onLoadMore,
  hasMore,
  loading,
  totalCount,
}) => {
  const { width, height } = useWindowDimensions();
  // Use the short side so large phones in portrait are treated as small screens.
  const isSmallScreen = Math.min(width, height) < 768;

  const updateFilter = (updates: Partial<RouteFilter>) => {
    onFilterChange({ ...filter, ...updates });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.panelTitle, isSmallScreen && styles.panelTitleSmall]}>
        Routes ({totalCount !== undefined && totalCount !== null ? totalCount : routes.length})
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
        onEndReached={() => {
          if (hasMore && onLoadMore) {
            onLoadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 10 }} /> : null}
        renderItem={({ item }) => {
          const networkInfo = item.network ? NETWORK_MAP[item.network] : null;
          return (
            <TouchableOpacity
              style={[styles.listItem, isSmallScreen && styles.listItemSmall]}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <View style={styles.listItemContent}>
                <View style={styles.listItemHeader}>
                  <Text
                    style={[styles.listItemTitle, isSmallScreen && styles.listItemTitleSmall]}
                    numberOfLines={1}
                  >
                    {item.name || 'Unnamed Route'}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </View>

                <View style={styles.listItemMeta}>
                  {networkInfo ? (
                    <View style={[styles.badge, { backgroundColor: networkInfo.color }]}>
                      <Text style={styles.badgeText}>{networkInfo.label}</Text>
                    </View>
                  ) : (
                    <Text style={styles.listItemBadge}>{item.network || '?'}</Text>
                  )}
                  {/* Route quality indicator: green check when geom_quality starts with ok_, otherwise yellow cross */}
                  {(() => {
                    const q = item.geom_quality || '';
                    const ok = q.startsWith('ok_');
                    return (
                      <Text
                        accessibilityLabel={ok ? 'Route quality OK' : 'Route quality warning'}
                        style={[styles.qualityIcon, ok ? styles.qualityOk : styles.qualityWarn]}
                      >
                        {ok ? '✅' : '✖️'}
                      </Text>
                    );
                  })()}
                  <Text style={styles.listItemSub}>
                    {item.length_m ? `${(item.length_m / 1000).toFixed(1)} km` : ''}
                  </Text>
                </View>
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
    backgroundColor: '#fff',
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
  controls: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
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
  list: {
    flex: 1,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  listItemContent: {
    gap: 6,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    fontWeight: '300',
    lineHeight: 24,
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listItemBadge: {
    fontSize: 11,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    color: '#666',
    overflow: 'hidden',
  },
  listItemSub: {
    fontSize: 14,
    color: '#666',
  },
  qualityIcon: {
    marginLeft: 8,
    marginRight: 8,
    fontSize: 14,
  },
  qualityOk: {
    color: '#16a34a',
  },
  qualityWarn: {
    color: '#f59e0b',
  },
  // Small screen variants
  panelTitleSmall: {
    fontSize: 18,
    padding: 12,
  },
  searchInputSmall: {
    margin: 8,
    padding: 8,
    fontSize: 14,
  },
  controlsSmall: {
    padding: 8,
  },
  controlLabelSmall: {
    fontSize: 13,
  },
  listItemSmall: {
    padding: 14,
  },
  listItemTitleSmall: {
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
