import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Route } from '../types';
import { NETWORK_MAP, IGNORED_TAGS, COLLAPSE_OSM_TAGS_BY_DEFAULT } from '../constants';
import { RouteService } from '../services/routeService';
import { createGpx } from '../utils/gpx';
import { OsmSymbol } from './OsmSymbol';
import { allowMultistring } from '../config/settings';
import { ScrollContainer } from './ScrollContainer';

interface RouteDetailsProps {
  route: Route;
  onClose: () => void;
  onOpenItinerary: (route: Route) => void;
  onNavigateToRoute?: (routeId: number) => void;
}

export const RouteDetails: React.FC<RouteDetailsProps> = ({
  route,
  onClose,
  onOpenItinerary,
  onNavigateToRoute,
}) => {
  const [osmTagsCollapsed, setOsmTagsCollapsed] = React.useState(COLLAPSE_OSM_TAGS_BY_DEFAULT);
  const [parents, setParents] = React.useState<any[]>([]);
  const [children, setChildren] = React.useState<any[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = React.useState(false);

  const q = route.geom_quality || '';
  const ok = q.startsWith('ok_');

  const geojsonRef = React.useRef<any | null>(null);

  // Fetch hierarchy data
  React.useEffect(() => {
    let isMounted = true;
    const fetchHierarchy = async () => {
      setHierarchyLoading(true);
      try {
        const [parentsData, childrenData] = await Promise.all([
          RouteService.fetchRouteParents(route.osm_id),
          RouteService.fetchRouteChildren(route.osm_id),
        ]);
        if (isMounted) {
          setParents(parentsData);
          setChildren(childrenData);
        }
      } catch (error) {
        console.error('Failed to fetch hierarchy:', error);
      } finally {
        if (isMounted) {
          setHierarchyLoading(false);
        }
      }
    };
    fetchHierarchy();
    return () => {
      isMounted = false;
    };
  }, [route.osm_id]);

  const fetchGeoJSONOnce = React.useCallback(async () => {
    if (geojsonRef.current) return geojsonRef.current;
    const geojson = await RouteService.fetchGeoJSON(route.osm_id);
    geojsonRef.current = geojson;
    return geojson;
  }, [route.osm_id]);

  const handleDownloadGpx = async () => {
    try {
      const geojson = await fetchGeoJSONOnce();
      // geojson is a FeatureCollection
      if (geojson.features && geojson.features.length > 0) {
        const gpxContent = createGpx(geojson.features[0]);

        // Web download
        if (Platform.OS === 'web') {
          const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${route.name || 'route'}.gpx`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          console.error('GPX download not implemented for native yet');
        }
      }
    } catch (e) {
      console.error('Failed to download GPX', e);
      alert('Failed to download GPX');
    }
  };

  const renderTags = (tags: Record<string, string> | null, filter: boolean = true) => {
    if (!tags) return null;
    return Object.entries(tags)
      .filter(([key]) => {
        if (!filter) return true;
        if (IGNORED_TAGS.includes(key)) return false;
        if (key.startsWith('old_') || key.endsWith('_old')) return false;
        return true;
      })
      .map(([key, value]) => {
        const stringValue = String(value);
        if (key === 'wikidata') {
          const url = stringValue.startsWith('Q')
            ? `https://www.wikidata.org/wiki/${stringValue}`
            : stringValue;
          return (
            <View key={key} style={styles.tagRow}>
              <Text style={styles.tagKey}>{key}:</Text>
              <TouchableOpacity onPress={() => Linking.openURL(url)}>
                <Text style={styles.link}>{stringValue}</Text>
              </TouchableOpacity>
            </View>
          );
        }

        if (key === 'url') {
          const url = stringValue.startsWith('http') ? stringValue : `https://${stringValue}`;
          return (
            <View key={key} style={styles.tagRow}>
              <Text style={styles.tagKey}>{key}:</Text>
              <TouchableOpacity onPress={() => Linking.openURL(url)}>
                <Text style={styles.link}>{stringValue}</Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <View key={key} style={styles.tagRow}>
            <Text style={styles.tagKey}>{key}:</Text>
            <Text style={styles.tagValue}>{stringValue}</Text>
          </View>
        );
      });
  };

  const networkInfo = route.network ? NETWORK_MAP[route.network] : null;
  const fromLoc = route.tags?.from;
  const toLoc = route.tags?.to;

  const isMultiLineString = route.merged_geom_type === 'MULTILINESTRING';
  const itineraryDisabled = !allowMultistring && isMultiLineString;

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'alternative':
        return { backgroundColor: '#ffc107' };
      case 'approach':
        return { backgroundColor: '#17a2b8' };
      case 'excursion':
        return { backgroundColor: '#28a745' };
      case 'connection':
        return { backgroundColor: '#6c757d' };
      default:
        return { backgroundColor: '#6c757d' };
    }
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.headerContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.title}>{route.name || 'Unnamed Route'}</Text>
            {hierarchyLoading && <ActivityIndicator size="small" testID="hierarchy-loading" />}
          </View>
          {networkInfo && (
            <View style={[styles.badge, { backgroundColor: networkInfo.color, marginTop: 4 }]}>
              <Text style={styles.badgeText}>{networkInfo.label}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>×</Text>
        </TouchableOpacity>
      </View>
      <ScrollContainer style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Info</Text>

          {fromLoc && toLoc && (
            <View style={styles.routeRow}>
              <Text style={styles.routeText}>
                {fromLoc} → {toLoc}
              </Text>
            </View>
          )}

          {route.tags?.website && (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL(route.tags!.website)}
            >
              <Text style={styles.link}>Website</Text>
            </TouchableOpacity>
          )}

          {route.tags?.url && (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => {
                const raw = route.tags!.url;
                const url = raw.startsWith('http') ? raw : `https://${raw}`;
                Linking.openURL(url);
              }}
            >
              <Text style={styles.link}>URL</Text>
            </TouchableOpacity>
          )}

          {!ok && route.geom_parts != null && <InfoRow label="Segments" value={route.geom_parts} />}

          {route.tags?.wikipedia && (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL(`https://wikipedia.org/wiki/${route.tags!.wikipedia}`)}
            >
              <Text style={styles.link}>Wikipedia</Text>
            </TouchableOpacity>
          )}

          {route.tags?.source &&
            (route.tags.source.startsWith('http') ? (
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL(route.tags!.source)}
              >
                <Text style={styles.link}>Source</Text>
              </TouchableOpacity>
            ) : (
              <InfoRow label="Source" value={route.tags.source} />
            ))}

          <View style={styles.row}>
            <Text style={styles.label}>Symbol</Text>
            <View style={styles.valueContainer}>
              <OsmSymbol symbol={route.symbol} />
            </View>
          </View>

          <InfoRow
            label="Length"
            value={route.length_m ? `${(route.length_m / 1000).toFixed(2)} km` : 'N/A'}
          />

          <View style={styles.geomStatusRow}>
            <Text
              style={[
                styles.geomStatusIcon,
                ok ? styles.geomStatusIconOk : styles.geomStatusIconWarn,
              ]}
            >
              {ok ? '✅' : '⚠️'}
            </Text>
            <Text style={styles.geomStatusText}>
              {ok
                ? 'Route builder OK'
                : `Route builder reports ${q || 'unknown'}. Itinerary may not be correct.`}
              {route.geom_parts && route.geom_parts > 1 ? ` (${route.geom_parts} segments)` : ''}
            </Text>
          </View>

          {route.route_type !== 'hiking' && route.route_type !== 'foot' && (
            <InfoRow label="Type" value={route.route_type} />
          )}

          <TouchableOpacity
            style={[styles.itineraryBtn, itineraryDisabled && styles.itineraryBtnDisabled]}
            disabled={itineraryDisabled}
            onPress={() => onOpenItinerary(route)}
          >
            <Text style={styles.itineraryBtnText}>Get Itinerary</Text>
          </TouchableOpacity>

          {!allowMultistring && isMultiLineString && (
            <Text style={styles.itineraryHint}>
              Itinerary disabled for MultiLineString routes (enable allowMultistring to override).
            </Text>
          )}

          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadGpx}>
            <Text style={styles.downloadBtnText}>Download GPX</Text>
          </TouchableOpacity>
        </View>

        {/* Route Hierarchy */}
        {(parents.length > 0 || children.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route Hierarchy</Text>

            {parents.length > 0 && (
              <View style={styles.hierarchyGroup}>
                <Text style={styles.hierarchyGroupTitle}>Part of:</Text>
                {parents.map((parent) => (
                  <TouchableOpacity
                    key={parent.parent_id}
                    style={styles.hierarchyItem}
                    onPress={() => {
                      if (onNavigateToRoute) {
                        onNavigateToRoute(parent.parent_id);
                      }
                    }}
                  >
                    <View style={styles.hierarchyItemContent}>
                      <Text style={styles.hierarchyItemName}>{parent.parent_name}</Text>
                      {parent.parent_network ? (
                        <Text style={styles.hierarchyItemMeta}>{parent.parent_network}</Text>
                      ) : null}
                      {!parent.network_compatible ? (
                        <Text style={styles.hierarchyWarning}>⚠️</Text>
                      ) : null}
                    </View>
                    <Text style={styles.hierarchyChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {children.length > 0 && (
              <View style={styles.hierarchyGroup}>
                <Text style={styles.hierarchyGroupTitle}>
                  {children.length === 1 ? '1 stage' : `${children.length} stages`}:
                </Text>
                {children.map((child, index) => (
                  <TouchableOpacity
                    key={child.child_id}
                    style={styles.hierarchyItem}
                    onPress={() => {
                      if (onNavigateToRoute) {
                        onNavigateToRoute(child.child_id);
                      }
                    }}
                  >
                    <View style={styles.hierarchyItemContent}>
                      <View style={styles.hierarchyItemHeader}>
                        <Text style={styles.hierarchySequence}>{index + 1}</Text>
                        {child.role && child.role !== '' && child.role !== 'main' ? (
                          <View style={[styles.roleBadge, getRoleStyle(child.role)]}>
                            <Text style={styles.roleBadgeText}>{child.role}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.hierarchyItemName}>{child.child_name}</Text>
                      {child.child_length_m ? (
                        <Text style={styles.hierarchyItemMeta}>
                          {(child.child_length_m / 1000).toFixed(1)} km
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.hierarchyChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {renderTags(route.tags, true)}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => setOsmTagsCollapsed(!osmTagsCollapsed)}
            style={styles.collapsibleHeader}
          >
            <Text style={styles.sectionTitle}>OSM Tags</Text>
            <Text style={styles.chevron}>{osmTagsCollapsed ? '▼' : '▲'}</Text>
          </TouchableOpacity>
          {!osmTagsCollapsed && (
            <>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() =>
                  Linking.openURL(`https://www.openstreetmap.org/relation/${route.osm_id}`)
                }
              >
                <Text style={styles.link}>View Relation {route.osm_id} on OSM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() =>
                  Linking.openURL(
                    `https://hiking.waymarkedtrails.org/#route?id=${route.osm_id}&type=relation`
                  )
                }
              >
                <Text style={styles.link}>View on Waymarked Trails</Text>
              </TouchableOpacity>
              {renderTags(route.tags, false)}
            </>
          )}
        </View>
      </ScrollContainer>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string | number | null }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || '-'}</Text>
  </View>
);

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'white',
    padding: 20,
  },
  sidebarSmall: {
    flex: 1,
  },
  itineraryBtn: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  itineraryBtnDisabled: {
    opacity: 0.45,
  },
  itineraryBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  itineraryHint: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.8,
  },
  geomStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  geomStatusIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  geomStatusIconOk: {
    color: '#16a34a',
  },
  geomStatusIconWarn: {
    color: '#f59e0b',
  },
  geomStatusText: {
    flex: 1,
    color: '#444',
    fontSize: 12,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  headerContent: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 28,
    color: '#999',
    lineHeight: 28,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  row: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingVertical: 2,
  },
  tagKey: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    width: '40%',
  },
  tagValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  link: {
    color: '#007bff',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  linkRow: {
    marginBottom: 8,
  },
  routeRow: {
    marginBottom: 12,
  },
  routeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  downloadBtn: {
    marginTop: 15,
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  downloadBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
    marginBottom: 10,
  },
  chevron: {
    fontSize: 12,
    color: '#666',
  },
  hierarchyGroup: {
    marginBottom: 16,
  },
  hierarchyGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  hierarchyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 6,
  },
  hierarchyItemContent: {
    flex: 1,
  },
  hierarchyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hierarchySequence: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 6,
  },
  hierarchyItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  hierarchyItemMeta: {
    fontSize: 12,
    color: '#666',
  },
  hierarchyChevron: {
    fontSize: 18,
    color: '#007bff',
    marginLeft: 8,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  hierarchyWarning: {
    fontSize: 14,
    marginLeft: 6,
  },
});
