import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Route, RouteFilter } from '../types';
import { NETWORK_MAP } from '../constants';
import { ListContainer } from './ListContainer';
import { RouteListHeader } from './RouteListHeader';

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

  const header = (
    <RouteListHeader
      totalCount={totalCount}
      routesLength={routes.length}
      filter={filter}
      onFilterChange={onFilterChange}
      loading={loading}
      isSmallScreen={isSmallScreen}
    />
  );

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? header : null}

      <ListContainer
        data={routes}
        keyExtractor={(item) => String(item.osm_id)}
        style={styles.list}
        ListHeaderComponent={Platform.OS !== 'web' ? header : null}
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
