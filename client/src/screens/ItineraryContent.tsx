import React from 'react';
import debounce from 'lodash.debounce';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmenityCluster, Route, RouteAmenity } from '../types';
import { useItinerary } from '../hooks/useItinerary';
import RadiusSlider from '../components/RadiusSlider';
import { ITINERARY_THEME } from '../styles/itineraryTheme';
import { DEVELOPER_MODE } from '../constants';
import {
  addItineraryEndpointClusters,
  getAvailableClasses,
  getDisplayedClusters,
  getTimelineMarginTop,
  normalizeAmenityClassLabel,
  sanitizeSelectedClusterKey,
} from './itinerary/itineraryModel';
import { ListContainer } from '../components/ListContainer';
import { TimelineItem } from '../components/TimelineItem';
import { RouteService } from '../services/routeService';
import {
  calculateUserMetrics,
  getDistanceInKm,
  isRouteCircular,
  calculateKmFromStart,
} from '../utils/itineraryMetrics';

interface ItineraryContentProps {
  route: Route;
  onClose: () => void;
  split?: boolean;
  renderRightPane?: (ctx: {
    route: Route;
    clusters: AmenityCluster[];
    rawAmenities: RouteAmenity[];
    radiusKm: number;
    allowedClasses: string[] | undefined;
    selectedClusterKey: string | null;
    setSelectedClusterKey: (key: string | null) => void;
  }) => React.ReactNode;
  renderWrapper?: (ctx: {
    content: React.ReactNode;
    clusters: AmenityCluster[];
    selectedClusterKey: string | null;
    setSelectedClusterKey: (key: string | null) => void;
    route: Route;
    onOpenFilters: () => void;
  }) => React.ReactElement;
  selectedClusterKey?: string | null;
  onSelectClusterKey?: (key: string | null) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  isFollowingUser?: boolean;
  onToggleFollowUser?: () => void;
}

const THEME = ITINERARY_THEME;

const tagsToList = (tags: Record<string, string> | null | undefined) => {
  if (!tags) return [] as [string, string][];
  return Object.entries(tags).map(([k, v]) => [k, String(v)] as [string, string]);
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const ItineraryContent: React.FC<ItineraryContentProps> = ({
  route,
  onClose,
  split,
  renderRightPane,
  renderWrapper,
  selectedClusterKey,
  onSelectClusterKey,
  userLocation,
  isFollowingUser,
  onToggleFollowUser,
}) => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const listRef = React.useRef<FlatList>(null);
  const [radiusKm, setRadiusKm] = React.useState(0.2);
  const [tempRadiusKm, setTempRadiusKm] = React.useState(radiusKm);
  const [routeGeoJSON, setRouteGeoJSON] = React.useState<any>(null);
  const [customStartKm, setCustomStartKm] = React.useState<number | null>(null);

  const isCircular = React.useMemo(() => isRouteCircular(routeGeoJSON), [routeGeoJSON]);
  const totalLengthKm = React.useMemo(() => (route.length_m || 0) / 1000, [route.length_m]);

  // Fetch route GeoJSON for accurate metrics
  React.useEffect(() => {
    RouteService.fetchGeoJSON(route.osm_id)
      .then(setRouteGeoJSON)
      .catch((err) => console.error('Failed to fetch route GeoJSON for metrics:', err));
  }, [route.osm_id]);

  const [filterModalVisible, setFilterModalVisible] = React.useState(false);
  const [selectedClasses, setSelectedClasses] = React.useState<Set<string>>(new Set());
  const [internalSelectedKey, setInternalSelectedKey] = React.useState<string | null>(null);
  const [devTagsOverlay, setDevTagsOverlay] = React.useState<{
    title: string;
    tags: Record<string, string> | null;
  } | null>(null);

  const hoverHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverKeyRef = React.useRef<string | null>(null);

  const clearHoverHideTimer = React.useCallback(() => {
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      clearHoverHideTimer();
    };
  }, [clearHoverHideTimer]);

  const effectiveSelectedKey = selectedClusterKey ?? internalSelectedKey;
  const setSelectedKey = onSelectClusterKey ?? setInternalSelectedKey;

  const allowedClasses = React.useMemo(
    () => (selectedClasses.size > 0 ? [...selectedClasses] : undefined),
    [selectedClasses]
  );

  const { rawAmenities, clusters, loading, error } = useItinerary({
    routeOsmId: route.osm_id,
    maxDistanceFromTrailM: radiusKm * 1000,
    clusterBucketKm: 0.5,
    timeoutMs: 8000,
    allowedClasses,
  });

  const fromLoc = route.tags?.from;
  const toLoc = route.tags?.to;

  const availableClasses = React.useMemo(() => {
    return getAvailableClasses(rawAmenities);
  }, [rawAmenities]);

  const showDevTags = React.useCallback(
    (key: string, overlay: { title: string; tags: Record<string, string> | null }) => {
      if (!DEVELOPER_MODE) return;
      clearHoverHideTimer();
      if (Platform.OS === 'web' && hoverKeyRef.current === key) return;
      hoverKeyRef.current = key;
      setDevTagsOverlay(overlay);
    },
    [clearHoverHideTimer]
  );

  const scheduleHideDevTags = React.useCallback(() => {
    if (!DEVELOPER_MODE) return;
    clearHoverHideTimer();
    hoverHideTimerRef.current = setTimeout(() => {
      hoverKeyRef.current = null;
      setDevTagsOverlay(null);
    }, 120);
  }, [clearHoverHideTimer]);

  const debouncedSetRadius = React.useMemo(
    () => debounce((v: number) => setRadiusKm(v), 550),
    [setRadiusKm]
  );

  React.useEffect(() => {
    // Keep the tempRadius synced if external radius changes (e.g., via code).
    setTempRadiusKm(radiusKm);
  }, [radiusKm]);

  React.useEffect(() => {
    return () => {
      debouncedSetRadius.cancel();
    };
  }, [debouncedSetRadius]);

  const controlsNode = (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters & Settings</Text>
            <TouchableOpacity
              onPress={() => setFilterModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.radiusRow}>
              <Text style={styles.controlLabel}>📏 Radius</Text>
              <Text style={styles.radiusValue}>{tempRadiusKm.toFixed(1)} km</Text>
            </View>
            <RadiusSlider
              value={tempRadiusKm}
              onValueChange={(v: number) => {
                const newV = clamp(Math.round(v * 10) / 10, 0.1, 1);
                setTempRadiusKm(newV);
                debouncedSetRadius(newV);
              }}
              minimumValue={0.1}
              maximumValue={1}
              step={0.1}
              minimumTrackTintColor={THEME.accent}
              maximumTrackTintColor={THEME.border}
              thumbTintColor={THEME.accent}
            />

            <View style={styles.filterRow}>
              <Text style={styles.controlLabel}>🏷️ Filter Amenities</Text>
              <View style={styles.filterChipsContainer}>
                <Pressable
                  onPress={() => setSelectedClasses(new Set())}
                  style={[styles.filterChip, selectedClasses.size === 0 && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedClasses.size === 0 && styles.filterChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {availableClasses.map((cls) => {
                  const active = selectedClasses.has(cls);
                  return (
                    <Pressable
                      key={cls}
                      onPress={() => {
                        setSelectedClasses((prev) => {
                          const next = new Set(prev);
                          if (next.has(cls)) next.delete(cls);
                          else next.add(cls);
                          return next;
                        });
                      }}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {normalizeAmenityClassLabel(cls)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const clustersWithEndpoints = React.useMemo(() => {
    return addItineraryEndpointClusters({ clusters, route });
  }, [clusters, route]);

  const displayedClusters = React.useMemo(() => {
    const base = getDisplayedClusters(clustersWithEndpoints, false);

    // 1. Find where the user is on the trail and get metrics
    let userCluster: AmenityCluster | null = null;
    if (userLocation) {
      let fallbackTrailKm = 0;
      let minDistance = Infinity;
      base.forEach((c) => {
        const d = getDistanceInKm(userLocation.latitude, userLocation.longitude, c.lat, c.lon);
        if (d < minDistance) {
          minDistance = d;
          fallbackTrailKm = c.trail_km;
        }
      });

      const sortedBase = [...base].sort((a, b) => a.trail_km - b.trail_km);
      const nextCluster = sortedBase.find((c) => c.trail_km > fallbackTrailKm) || null;
      const metrics = calculateUserMetrics(userLocation, routeGeoJSON, nextCluster);

      userCluster = {
        key: 'user-location',
        trail_km: metrics?.kmOnTrail ?? fallbackTrailKm,
        amenities: [],
        countsByClass: {},
        size: 0,
        lat: userLocation.latitude,
        lon: userLocation.longitude,
        userMetrics: metrics || undefined,
      };
    }

    const all = userCluster ? [...base, userCluster] : base;

    // 2. Calculate kmFromStart for all items
    const startKm = customStartKm ?? 0;
    const out = all.map((c) => ({
      ...c,
      kmFromStart: calculateKmFromStart(c.trail_km, startKm, totalLengthKm, isCircular),
    }));

    // 3. Sort by kmFromStart
    out.sort((a, b) => {
      if (a.kmFromStart !== b.kmFromStart) return a.kmFromStart - b.kmFromStart;
      if (a.key === 'user-location') return -1;
      if (b.key === 'user-location') return 1;
      return 0;
    });

    return out;
  }, [clustersWithEndpoints, userLocation, routeGeoJSON, customStartKm, totalLengthKm, isCircular]);

  const renderItem = React.useCallback(
    ({ item: cluster, index }: { item: AmenityCluster; index: number }) => (
      <TimelineItem
        cluster={cluster}
        index={index}
        totalItems={displayedClusters.length}
        marginTop={getTimelineMarginTop({
          displayedClusters,
          index,
          pixelsPerKm: 90,
        })}
        isSelected={cluster.key === effectiveSelectedKey}
        onPress={() => setSelectedKey(effectiveSelectedKey === cluster.key ? null : cluster.key)}
        onSetStartPoint={setCustomStartKm}
        isDeveloperMode={DEVELOPER_MODE}
        onShowDevTags={showDevTags}
        onScheduleHideDevTags={scheduleHideDevTags}
      />
    ),
    [displayedClusters, effectiveSelectedKey, setSelectedKey, showDevTags, scheduleHideDevTags]
  );

  const lastScrolledIndexRef = React.useRef<number | null>(null);
  const lastFollowToggleRef = React.useRef<boolean>(false);
  const lastScrollYRef = React.useRef(0);
  const lastProgrammaticScrollRef = React.useRef<{ ts: number; index: number } | null>(null);

  const getItemLayout = React.useCallback((data: any, index: number) => {
    const clusters = data as AmenityCluster[];
    if (!clusters || index < 0 || index >= clusters.length) {
      return { length: 0, offset: 0, index };
    }

    // Keep this aligned with:
    // - styles.list padding
    // - ItemSeparatorComponent height
    // - TimelineItem layout (including current marker marginBottom)
    const SEPARATOR_HEIGHT = 12;
    const TOP_PADDING = 16;
    const CURRENT_MARKER_MARGIN_BOTTOM = 12;
    const CURRENT_MARKER_BOX_HEIGHT = 46;

    let offset = TOP_PADDING;
    for (let i = 0; i < index; i++) {
      const cluster = clusters[i];
      const marginTop = getTimelineMarginTop({
        displayedClusters: clusters,
        index: i,
        pixelsPerKm: 90,
      });
      let height = 70 + (cluster.size || 0) * 3;
      let marginBottom = 0;
      if (cluster.key === 'user-location') {
        height = CURRENT_MARKER_BOX_HEIGHT;
        marginBottom = CURRENT_MARKER_MARGIN_BOTTOM;
      }

      offset += marginTop + height + marginBottom + SEPARATOR_HEIGHT;
    }

    const cluster = clusters[index];
    const marginTop = getTimelineMarginTop({
      displayedClusters: clusters,
      index,
      pixelsPerKm: 90,
    });
    let height = 70 + (cluster.size || 0) * 3;
    let marginBottom = 0;
    if (cluster.key === 'user-location') {
      height = CURRENT_MARKER_BOX_HEIGHT;
      marginBottom = CURRENT_MARKER_MARGIN_BOTTOM;
    }

    return {
      length: marginTop + height + marginBottom + SEPARATOR_HEIGHT,
      offset,
      index,
    };
  }, []);

  // Scroll to nearest cluster when following user
  React.useEffect(() => {
    const following = !!isFollowingUser;
    const followChanged = following !== lastFollowToggleRef.current;
    lastFollowToggleRef.current = following;

    if (following && userLocation && displayedClusters.length > 0) {
      const nearestIndex = displayedClusters.findIndex((c) => c.key === 'user-location');

      if (nearestIndex !== -1 && (nearestIndex !== lastScrolledIndexRef.current || followChanged)) {
        const timer = setTimeout(
          () => {
            if (listRef.current && following) {
              try {
                const layout = getItemLayout(displayedClusters, nearestIndex);

                // Record that we are doing a programmatic scroll
                lastProgrammaticScrollRef.current = { ts: Date.now(), index: nearestIndex };
                lastScrolledIndexRef.current = nearestIndex;

                // Jump then scroll
                listRef.current.scrollToOffset({ offset: layout.offset, animated: false });

                setTimeout(() => {
                  if (!following || !listRef.current) return;
                  try {
                    listRef.current.scrollToIndex({
                      index: nearestIndex,
                      animated: true,
                      viewPosition: 0.05,
                    });
                  } catch (e) {
                    console.warn('[ItineraryContent] Auto-scroll retry failed:', e);
                  }
                }, 100);
              } catch (e) {
                console.warn('[ItineraryContent] Auto-scroll failed:', e);
              }
            }
          },
          followChanged ? 300 : 500
        );
        return () => clearTimeout(timer);
      }
    } else if (!following) {
      lastScrolledIndexRef.current = null;
    }
  }, [isFollowingUser, userLocation, displayedClusters, getItemLayout]);

  React.useEffect(() => {
    const next = sanitizeSelectedClusterKey({ selectedKey: effectiveSelectedKey, clusters });
    if (next !== effectiveSelectedKey) setSelectedKey(next);
  }, [clusters, effectiveSelectedKey, setSelectedKey]);

  const rightPaneNode = React.useMemo(() => {
    if (!renderRightPane) return null;
    return renderRightPane({
      route,
      clusters: clustersWithEndpoints,
      rawAmenities,
      radiusKm,
      allowedClasses,
      selectedClusterKey: effectiveSelectedKey,
      setSelectedClusterKey: setSelectedKey,
    });
  }, [
    renderRightPane,
    route,
    clustersWithEndpoints,
    rawAmenities,
    radiusKm,
    allowedClasses,
    effectiveSelectedKey,
    setSelectedKey,
  ]);

  const totalAmenities = React.useMemo(
    () => clusters.reduce((sum, c) => sum + c.amenities.length, 0),
    [clusters]
  );

  const content = (
    <View
      style={[
        Platform.OS === 'web' ? styles.overlay : styles.nativeContentContainer,
        Platform.OS === 'web' ? { paddingTop: insets.top } : { maxHeight: screenHeight },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{route.name || 'Itinerary'}</Text>
          <View style={styles.subtitleRow}>
            {fromLoc && toLoc ? (
              <Text style={styles.subtitleText}>{`${fromLoc} → ${toLoc}`}</Text>
            ) : null}
          </View>
          <View style={styles.headerStatsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>📏</Text>
              <Text style={styles.statValue}>
                {route.length_m ? `${(route.length_m / 1000).toFixed(1)} km` : 'N/A'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>🧃</Text>
              <Text style={styles.statValue}>{totalAmenities}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      {!split ? controlsNode : null}

      <View style={[styles.content, split && styles.contentSplit]}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={styles.muted}>Loading itinerary…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Could not load itinerary</Text>
            <Text style={styles.muted}>{error.message}</Text>
          </View>
        )}

        {!loading && !error && (
          <View style={[styles.splitRow, !split && styles.splitRowSingle]}>
            <View style={styles.leftPane}>
              {split ? controlsNode : null}
              <ListContainer<AmenityCluster>
                ref={listRef}
                testID="itinerary-list"
                getItemLayout={getItemLayout}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  lastScrollYRef.current = e.nativeEvent.contentOffset.y;
                }}
                onScrollBeginDrag={() => {
                  if (!isFollowingUser || !onToggleFollowUser) return;

                  // Some native implementations can emit scroll-begin events during/after
                  // programmatic scrolls. Don't treat that as a user gesture.
                  const prog = lastProgrammaticScrollRef.current;
                  if (prog && Date.now() - prog.ts < 800) return;

                  onToggleFollowUser();
                }}
                style={styles.scroll}
                contentContainerStyle={styles.list}
                data={displayedClusters}
                keyExtractor={(item: AmenityCluster, index: number) =>
                  item.key || `cluster-${index}`
                }
                ListFooterComponent={<View style={{ height: 400 }} />}
                ListEmptyComponent={
                  <Text style={styles.muted}>
                    No amenities found within {radiusKm.toFixed(1)} km of this route.
                  </Text>
                }
                renderItem={renderItem}
              />
            </View>

            {split && rightPaneNode ? <View style={styles.mapPane}>{rightPaneNode}</View> : null}
          </View>
        )}
      </View>

      {DEVELOPER_MODE && devTagsOverlay ? (
        <View style={styles.devOverlayBackdrop}>
          <View style={styles.devOverlayCard}>
            <View style={styles.devOverlayHeader}>
              <Text style={styles.devOverlayTitle} numberOfLines={1}>
                {devTagsOverlay.title}
              </Text>
              {Platform.OS !== 'web' ? (
                <Pressable
                  onPress={() => setDevTagsOverlay(null)}
                  style={styles.devOverlayCloseBtn}
                >
                  <Text style={styles.devOverlayCloseText}>×</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.devOverlayScroll}>
              {tagsToList(devTagsOverlay.tags).map(([k, v]) => (
                <View key={k} style={styles.devTagRow}>
                  <Text style={styles.devTagKey}>{k}:</Text>
                  <Text style={styles.devTagValue}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  if (renderWrapper) {
    return renderWrapper({
      content,
      clusters: clustersWithEndpoints,
      selectedClusterKey: effectiveSelectedKey,
      setSelectedClusterKey: setSelectedKey,
      route,
      onOpenFilters: () => setFilterModalVisible(true),
    });
  }

  return content;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: THEME.background,
    zIndex: 100,
  },
  nativeContentContainer: {
    flex: 1,
    backgroundColor: THEME.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    color: THEME.textPrimary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 12,
    color: THEME.textTertiary,
    flexShrink: 1,
  },
  headerStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.textTertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 12,
    color: THEME.textPrimary,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 28,
    lineHeight: 28,
    color: THEME.textPrimary,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  controlsLeft: {
    flex: 1,
    gap: 10,
    paddingRight: 12,
  },
  controlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: THEME.textTertiary,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  radiusValue: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '700',
  },
  filterRow: {
    gap: 6,
  },
  filterChips: {
    gap: 8,
    paddingRight: 12,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.tagBg,
  },
  filterChipActive: {
    backgroundColor: THEME.accent,
    borderColor: THEME.accentDark,
  },
  filterChipText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: THEME.surface,
  },
  content: {
    flex: 1,
  },
  contentSplit: {
    backgroundColor: THEME.background,
  },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
  },
  splitRowSingle: {
    flexDirection: 'column',
  },
  leftPane: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  mapPane: {
    width: Platform.OS === 'web' ? '45%' : '100%',
    // Make the mobile map view very small (20) for now so the timeline/list is more prominent on start.
    height: Platform.OS === 'web' ? '100%' : 20,
    borderLeftWidth: Platform.OS === 'web' ? 2 : 0,
    borderBottomWidth: Platform.OS === 'web' ? 0 : 2,
    borderLeftColor: THEME.border,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  muted: {
    color: THEME.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  devScrollRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  devScrollChip: {
    alignSelf: 'flex-start',
  },
  devScrollInfo: {
    textAlign: 'left',
  },
  currentMarker: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: THEME.accent,
    borderWidth: 1,
    borderColor: THEME.accentDark,
  },
  currentMarkerText: {
    color: THEME.surface,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  timelineItemCurrent: {
    borderWidth: 2,
    borderColor: THEME.accent,
    backgroundColor: '#fffaf8',
  },
  timelineItemSelected: {
    borderColor: THEME.accent,
  },
  timelineItemPressed: {
    opacity: 0.9,
  },
  timelineMarker: {
    minWidth: 40,
    alignItems: 'center',
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: THEME.accent,
    borderWidth: 2,
    borderColor: THEME.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  markerDotCurrent: {
    width: 20,
    height: 20,
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  markerLine: {
    flex: 1,
    width: 2,
    backgroundColor: THEME.border,
    marginTop: 6,
    minHeight: 32,
  },
  markerLineCurrent: {
    backgroundColor: THEME.accent,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  stopTitleNonPlace: {
    color: THEME.accentDark,
  },
  stopLocationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  stopMeta: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  amenityTagsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  amenityTag: {
    backgroundColor: THEME.tagBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  amenityTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  detailsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 4,
  },
  detailsLine: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  detailsLineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 6,
  },
  detailsLink: {
    textDecorationLine: 'underline',
    fontWeight: '800',
  },
  detailsMore: {
    fontSize: 12,
    color: THEME.textTertiary,
    marginTop: 4,
    fontWeight: '600',
  },

  devOverlayBackdrop: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  devOverlayCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  devOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  devOverlayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.textPrimary,
    flex: 1,
    paddingRight: 12,
  },
  devOverlayCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devOverlayCloseText: {
    fontSize: 24,
    lineHeight: 24,
    color: THEME.textPrimary,
  },
  devOverlayScroll: {
    padding: 14,
    maxHeight: 180,
  },
  devTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  devTagKey: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textSecondary,
  },
  devTagValue: {
    fontSize: 12,
    color: THEME.textPrimary,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: THEME.accent,
    borderColor: THEME.accentDark,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  actionButtonTextActive: {
    color: THEME.surface,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  modalBody: {
    padding: 16,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
