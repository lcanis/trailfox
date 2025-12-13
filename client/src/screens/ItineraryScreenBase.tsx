import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Switch,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AmenityCluster, Route, RouteAmenity } from '../types';
import { useItinerary } from '../hooks/useItinerary';
import RadiusSlider from '../components/RadiusSlider';
import { ITINERARY_THEME } from '../styles/itineraryTheme';
import { DEVELOPER_MODE } from '../constants';

interface ItineraryScreenProps {
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
  selectedClusterKey?: string | null;
  onSelectClusterKey?: (key: string | null) => void;
}

const formatKm = (km: number) => `${km.toFixed(1)} km`;
const formatMeters = (m: number) => `${Math.round(m)} m`;

const THEME = ITINERARY_THEME;

const PLACE_HEADER_MAX_DISTANCE_M = 1000;

const titleize = (s: string) => (s.length ? s[0].toUpperCase() + s.slice(1) : s);

const tagsToList = (tags: Record<string, string> | null | undefined) => {
  if (!tags) return [] as [string, string][];
  return Object.entries(tags).map(([k, v]) => [k, String(v)] as [string, string]);
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeLabel = (label: string) => {
  // Compact labels for phone-sized chips.
  const map: Record<string, string> = {
    'Food/Drink': 'Food',
    'Resupply (Shops)': 'Shops',
    'Street Furniture / Small Amenities': 'Street',
    'Tourist / Cultural Points': 'Tourism',
    'Other Hiker-Relevant': 'Other',
  };
  return map[label] || label;
};

const pickClusterTitle = (countsByClass: Record<string, number>) => {
  const top = Object.entries(countsByClass).sort((a, b) => b[1] - a[1])[0];
  if (!top) return 'Amenities';
  return top[0];
};

export const ItineraryScreen: React.FC<ItineraryScreenProps> = ({
  route,
  onClose,
  split,
  renderRightPane,
  selectedClusterKey,
  onSelectClusterKey,
}) => {
  const [radiusKm, setRadiusKm] = React.useState(0.2);
  const [invert, setInvert] = React.useState(false);
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

  const isWebSplit = Platform.OS === 'web' && Boolean(split && renderRightPane);

  const availableClasses = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of rawAmenities) {
      counts.set(a.class, (counts.get(a.class) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([cls]) => cls);
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

  const controlsNode = (
    <View style={styles.controlsBar}>
      <View style={styles.controlsLeft}>
        <View style={styles.radiusRow}>
          <Text style={styles.controlLabel}>Radius</Text>
          <Text style={styles.radiusValue}>{radiusKm.toFixed(1)} km</Text>
        </View>
        <RadiusSlider
          value={radiusKm}
          onValueChange={(v: number) => setRadiusKm(clamp(Math.round(v * 10) / 10, 0.1, 1))}
          minimumValue={0.1}
          maximumValue={1}
          step={0.1}
          minimumTrackTintColor={THEME.accent}
          maximumTrackTintColor={THEME.border}
          thumbTintColor={THEME.accent}
        />

        <View style={styles.filterRow}>
          <Text style={styles.controlLabel}>Filter</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
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
                    {normalizeLabel(cls)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.controlsRight}>
        <Text style={styles.controlLabel}>Invert</Text>
        <Switch
          value={invert}
          onValueChange={setInvert}
          trackColor={{ false: THEME.border, true: THEME.accent }}
          thumbColor={THEME.surface}
        />
      </View>
    </View>
  );

  const displayedClusters = React.useMemo(() => {
    if (!invert) return clusters;
    return [...clusters].reverse();
  }, [clusters, invert]);

  React.useEffect(() => {
    if (!effectiveSelectedKey) return;
    const stillExists = clusters.some((c) => c.key === effectiveSelectedKey);
    if (!stillExists) setSelectedKey(null);
  }, [clusters, effectiveSelectedKey, setSelectedKey]);

  const rightPaneNode = React.useMemo(() => {
    if (!renderRightPane) return null;
    return renderRightPane({
      route,
      clusters,
      rawAmenities,
      radiusKm,
      allowedClasses,
      selectedClusterKey: effectiveSelectedKey,
      setSelectedClusterKey: setSelectedKey,
    });
  }, [
    renderRightPane,
    route,
    clusters,
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

  const getClusterPlaceTitle = React.useCallback((cluster: AmenityCluster) => {
    const places = cluster.amenities
      .filter((a) => a.class === 'Place' && a.distance_from_trail_m <= PLACE_HEADER_MAX_DISTANCE_M)
      .slice()
      .sort((a, b) => a.distance_from_trail_m - b.distance_from_trail_m);

    const best = places[0];
    if (!best) return null;
    if (best.name) return best.name;
    if (best.subclass) return titleize(best.subclass);
    return null;
  }, []);

  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{route.name || 'Itinerary'}</Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitleText}>
              {fromLoc && toLoc ? `${fromLoc} → ${toLoc}` : 'Relation'}
              {DEVELOPER_MODE ? ` ${route.osm_id}` : null}
            </Text>
          </View>
          <View style={styles.headerStatsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Length</Text>
              <Text style={styles.statValue}>
                {route.length_m ? `${(route.length_m / 1000).toFixed(1)} km` : 'N/A'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Amenities</Text>
              <Text style={styles.statValue}>{totalAmenities}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      {!isWebSplit ? controlsNode : null}

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
          <View style={[styles.splitRow, Platform.OS !== 'web' && styles.splitRowSingle]}>
            <View style={styles.leftPane}>
              {isWebSplit ? controlsNode : null}
              <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
                <View style={styles.currentMarker}>
                  <Text style={styles.currentMarkerText}>
                    Timeline view · within {radiusKm.toFixed(1)} km of trail
                  </Text>
                </View>

                {displayedClusters.length === 0 ? (
                  <Text style={styles.muted}>
                    No amenities found within {radiusKm.toFixed(1)} km of this route.
                  </Text>
                ) : (
                  displayedClusters.map((cluster, index) => {
                    const placeTitle = getClusterPlaceTitle(cluster);
                    const firstNamed = cluster.amenities.find((a) => a.name)?.name;
                    const title =
                      placeTitle || firstNamed || pickClusterTitle(cluster.countsByClass);
                    const isPlaceHeader = Boolean(placeTitle);
                    const minDist = Math.min(
                      ...cluster.amenities.map((a) => a.distance_from_trail_m)
                    );
                    const isCurrent = index === 0;

                    const prevKm =
                      index === 0 ? cluster.trail_km : displayedClusters[index - 1].trail_km;
                    const deltaKm = Math.abs(cluster.trail_km - prevKm);
                    const marginTop = index === 0 ? 0 : deltaKm * 90;

                    const isSelected = cluster.key === effectiveSelectedKey;

                    return (
                      <Pressable
                        key={cluster.key}
                        onPress={() =>
                          setSelectedKey(effectiveSelectedKey === cluster.key ? null : cluster.key)
                        }
                        style={({ pressed }) => [
                          { marginTop },
                          styles.timelineItem,
                          isCurrent && styles.timelineItemCurrent,
                          isSelected && styles.timelineItemSelected,
                          pressed && styles.timelineItemPressed,
                          { minHeight: 70 + cluster.size * 3 },
                        ]}
                      >
                        <View style={styles.timelineMarker}>
                          <View style={[styles.markerDot, isCurrent && styles.markerDotCurrent]} />
                          {index < displayedClusters.length - 1 && (
                            <View
                              style={[styles.markerLine, isCurrent && styles.markerLineCurrent]}
                            />
                          )}
                        </View>

                        <View style={styles.timelineContent}>
                          <Text
                            style={[styles.stopTitle, !isPlaceHeader && styles.stopTitleNonPlace]}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          <View style={styles.stopLocationRow}>
                            <Text style={styles.stopMeta}>
                              {formatKm(cluster.trail_km)} from start
                            </Text>
                            <Text style={styles.stopMeta}>·</Text>
                            <Text style={styles.stopMeta}>{formatMeters(minDist)} from trail</Text>
                            <Text style={styles.stopMeta}>·</Text>
                            <Text style={styles.stopMeta}>{cluster.size} items</Text>
                          </View>

                          <View style={styles.amenityTagsRow}>
                            {Object.entries(cluster.countsByClass)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 6)
                              .map(([cls, count]) => (
                                <View key={cls} style={styles.amenityTag}>
                                  <Text style={styles.amenityTagText}>
                                    {normalizeLabel(cls)} ×{count}
                                  </Text>
                                </View>
                              ))}
                          </View>

                          {isSelected && (
                            <View style={styles.detailsBox}>
                              {cluster.amenities
                                .slice()
                                .sort((a, b) => a.distance_from_trail_m - b.distance_from_trail_m)
                                .slice(0, 10)
                                .map((a) => (
                                  <Pressable
                                    key={`${a.osm_type}-${a.osm_id}`}
                                    onHoverIn={() =>
                                      Platform.OS === 'web'
                                        ? showDevTags(`${a.osm_type}-${a.osm_id}`, {
                                            title:
                                              a.name ||
                                              `${a.class}${a.subclass ? ` / ${a.subclass}` : ''}`,
                                            tags: a.tags,
                                          })
                                        : undefined
                                    }
                                    onHoverOut={() =>
                                      Platform.OS === 'web' ? scheduleHideDevTags() : undefined
                                    }
                                    onPressIn={() =>
                                      DEVELOPER_MODE
                                        ? showDevTags(`${a.osm_type}-${a.osm_id}`, {
                                            title:
                                              a.name ||
                                              `${a.class}${a.subclass ? ` / ${a.subclass}` : ''}`,
                                            tags: a.tags,
                                          })
                                        : undefined
                                    }
                                    style={styles.detailsLineRow}
                                  >
                                    <Text style={styles.detailsLine}>• </Text>
                                    <Text style={styles.detailsLine}>
                                      {a.name
                                        ? a.name
                                        : a.subclass
                                          ? titleize(a.subclass)
                                          : 'Unnamed'}
                                      {a.subclass && a.name
                                        ? ` — ${titleize(a.subclass)}`
                                        : ''}{' '}
                                    </Text>
                                    <Text style={styles.detailsLine}>
                                      ({formatMeters(a.distance_from_trail_m)})
                                    </Text>
                                  </Pressable>
                                ))}
                              {cluster.amenities.length > 10 && (
                                <Text style={styles.detailsMore}>
                                  +{cluster.amenities.length - 10} more
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {Platform.OS === 'web' && split && rightPaneNode ? (
              <View style={styles.mapPane}>{rightPaneNode}</View>
            ) : null}
          </View>
        )}
      </View>

      {DEVELOPER_MODE && devTagsOverlay ? (
        <View
          style={styles.devOverlayBackdrop}
          pointerEvents={Platform.OS === 'web' ? 'none' : 'auto'}
        >
          <View
            style={styles.devOverlayCard}
            pointerEvents={Platform.OS === 'web' ? 'none' : 'auto'}
          >
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
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
    marginBottom: 6,
    color: THEME.textPrimary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
  },
  scroll: {
    flex: 1,
  },
  mapPane: {
    width: '45%',
    borderLeftWidth: 2,
    borderLeftColor: THEME.border,
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
    gap: 12,
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
});
