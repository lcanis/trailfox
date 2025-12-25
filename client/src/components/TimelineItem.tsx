import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AmenityCluster, RouteAmenity } from '../types';
import { ITINERARY_THEME } from '../styles/itineraryTheme';
import {
  getClusterDisplayTitle,
  getClusterMinDistanceM,
  normalizeAmenityClassLabel,
  titleize,
} from '../screens/itinerary/itineraryModel';

const THEME = ITINERARY_THEME;

interface TimelineItemProps {
  cluster: AmenityCluster;
  index: number;
  totalItems: number;
  marginTop: number;
  isSelected: boolean;
  onPress: () => void;
  isDeveloperMode: boolean;
  onShowDevTags: (
    key: string,
    overlay: { title: string; tags: Record<string, string> | null }
  ) => void;
  onScheduleHideDevTags: () => void;
}

const formatKm = (km: number) => `${km.toFixed(1)} km`;
const formatMeters = (m: number) => `${Math.round(m)} m`;

export const TimelineItem = React.memo(
  ({
    cluster,
    index,
    totalItems,
    marginTop,
    isSelected,
    onPress,
    isDeveloperMode,
    onShowDevTags,
    onScheduleHideDevTags,
  }: TimelineItemProps) => {
    if (cluster.key === 'user-location') {
      return (
        <View style={[styles.currentMarker, { marginTop, marginBottom: 12 }]}>
          <Text style={styles.currentMarkerText}>📍 Current position</Text>
        </View>
      );
    }

    const { title, isPlaceHeader } = getClusterDisplayTitle(cluster);
    const minDist = getClusterMinDistanceM(cluster);
    const isCurrent = index === 0;

    return (
      <Pressable
        onPress={onPress}
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
          {index < totalItems - 1 && (
            <View style={[styles.markerLine, isCurrent && styles.markerLineCurrent]} />
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
            <Text style={styles.stopMeta}>🧭 {formatKm(cluster.trail_km)}</Text>
            <Text style={styles.stopMeta}>·</Text>
            <Text style={styles.stopMeta}>↔️ {formatMeters(minDist)}</Text>
            <Text style={styles.stopMeta}>·</Text>
            <Text style={styles.stopMeta}>📍 {cluster.size}</Text>
          </View>

          <View style={styles.amenityTagsRow}>
            {Object.entries(cluster.countsByClass)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([cls, count]: [string, number]) => (
                <View key={cls} style={styles.amenityTag}>
                  <Text style={styles.amenityTagText}>
                    {normalizeAmenityClassLabel(cls)} ×{count}
                  </Text>
                </View>
              ))}
          </View>

          {isSelected && cluster.size > 1 && (
            <View style={styles.detailsBox}>
              {cluster.amenities
                .slice()
                .sort(
                  (a: RouteAmenity, b: RouteAmenity) =>
                    a.distance_from_trail_m - b.distance_from_trail_m
                )
                .slice(0, 10)
                .map((a: RouteAmenity, amenityIndex: number) => (
                  <Pressable
                    key={`${a.osm_type}-${a.osm_id}-${amenityIndex}`}
                    onHoverIn={() =>
                      Platform.OS === 'web'
                        ? onShowDevTags(`${a.osm_type}-${a.osm_id}`, {
                            title: a.name || `${a.class}${a.subclass ? ` / ${a.subclass}` : ''}`,
                            tags: a.tags,
                          })
                        : undefined
                    }
                    onHoverOut={() => (Platform.OS === 'web' ? onScheduleHideDevTags() : undefined)}
                    onPressIn={() =>
                      isDeveloperMode
                        ? onShowDevTags(`${a.osm_type}-${a.osm_id}`, {
                            title: a.name || `${a.class}${a.subclass ? ` / ${a.subclass}` : ''}`,
                            tags: a.tags,
                          })
                        : undefined
                    }
                    style={styles.detailsLineRow}
                  >
                    <Text style={styles.detailsLine}>• </Text>
                    <Text style={styles.detailsLine}>
                      {a.name ? a.name : a.subclass ? titleize(a.subclass) : 'Unnamed'}
                      {a.subclass && a.name ? ` — ${titleize(a.subclass)}` : ''}{' '}
                    </Text>
                    <Text style={styles.detailsLine}>
                      ({formatMeters(a.distance_from_trail_m)})
                    </Text>
                  </Pressable>
                ))}
              {cluster.amenities.length > 10 && (
                <Text style={styles.detailsMore}>+{cluster.amenities.length - 10} more</Text>
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  }
);

TimelineItem.displayName = 'TimelineItem';

const styles = StyleSheet.create({
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
  detailsMore: {
    fontSize: 12,
    color: THEME.textTertiary,
    marginTop: 4,
    fontWeight: '600',
  },
});
