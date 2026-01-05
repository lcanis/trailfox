import React from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import type { AmenityCategory } from '../../types';
import type { UseAmenityFiltersReturn } from '../../hooks/useAmenityFilters';
import { getSubclassesForClass } from '../../data/subclasses';

interface DetailPanelProps {
  category: AmenityCategory;
  filter: UseAmenityFiltersReturn;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ category, filter }) => {
  const osmClass = category.osmClasses[0]; // Primary class for this category
  const isEnabled = filter.getEffectiveEnabled(osmClass);
  const distance = filter.getEffectiveDistance(osmClass);

  // Get subclasses sorted by count (descending)
  const subclasses = getSubclassesForClass(osmClass);

  const handleToggleCategory = (enabled: boolean) => {
    filter.setClassRule(osmClass, { enabled });
  };

  const handleSetDistance = (newDistance: number) => {
    filter.setClassRule(osmClass, { maxDistanceMeters: newDistance });
  };

  const handleToggleSubclass = (subclass: string, enabled: boolean) => {
    filter.toggleSubclass(osmClass, subclass, enabled);
  };

  return (
    <View style={styles.container}>
      {/* Category Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.icon}>{category.icon}</Text>
          <Text style={styles.title}>{category.name}</Text>
        </View>
      </View>

      {/* Toggle: Show/Hide Category */}
      <View style={styles.section}>
        <View style={styles.control}>
          <Text style={styles.label}>Show this category</Text>
          <Switch value={isEnabled} onValueChange={handleToggleCategory} />
        </View>
      </View>

      {/* Distance Slider */}
      {isEnabled && (
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Distance from trail</Text>
            <Text style={styles.valueLabel}>{distance}m</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={50}
            maximumValue={5000}
            step={50}
            value={distance}
            onValueChange={handleSetDistance}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#d1d5db"
          />
        </View>
      )}

      {/* Subclass Toggles */}
      {isEnabled && subclasses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Show subclasses:</Text>
          <ScrollView style={styles.subclassList}>
            {subclasses.map((subclass) => {
              const subclassName = subclass.id.split('.')[1];
              const subclassEnabled = filter.getSubclassEnabled(osmClass, subclassName);

              return (
                <View key={subclass.id} style={styles.subclassItem}>
                  <View style={styles.subclassInfo}>
                    <Text style={styles.subclassName}>{subclass.name}</Text>
                    <Text style={styles.subclassCount}>({subclass.count})</Text>
                  </View>
                  <Switch
                    value={subclassEnabled}
                    onValueChange={(enabled) => handleToggleSubclass(subclassName, enabled)}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {!isEnabled && (
        <View style={styles.disabledMessage}>
          <Text style={styles.disabledText}>
            Enable this category to configure distance and subclasses.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  section: {
    gap: 8,
  },
  control: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#374151',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  subclassList: {
    maxHeight: 300,
  },
  subclassItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  subclassInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  subclassName: {
    fontSize: 14,
    color: '#111',
  },
  subclassCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  disabledMessage: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  disabledText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});
