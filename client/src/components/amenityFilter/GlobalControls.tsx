import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface GlobalControlsProps {
  showAll: boolean;
  onShowAllChange: (show: boolean) => void;
  distance: number;
  onDistanceChange: (distance: number) => void;
}

const DISTANCE_PRESETS = [50, 200, 500, 2000];

export const GlobalControls: React.FC<GlobalControlsProps> = ({
  showAll,
  onShowAllChange,
  distance,
  onDistanceChange,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Global Settings</Text>

      {/* Show All / Hide All */}
      <View style={styles.control}>
        <Text style={styles.label}>Show all amenities</Text>
        <Switch value={showAll} onValueChange={onShowAllChange} />
      </View>

      {/* Distance Slider */}
      <View style={styles.control}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Max Distance from Trail</Text>
          <Text style={styles.valueLabel}>{distance}m</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={50}
          maximumValue={5000}
          step={50}
          value={distance}
          onValueChange={onDistanceChange}
          minimumTrackTintColor="#3b82f6"
          maximumTrackTintColor="#d1d5db"
        />
        <View style={styles.presets}>
          {DISTANCE_PRESETS.map((preset) => (
            <Text
              key={preset}
              style={[styles.preset, distance === preset && styles.presetActive]}
              onPress={() => onDistanceChange(preset)}
            >
              {preset}m
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  control: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#374151',
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
  presets: {
    flexDirection: 'row',
    gap: 8,
  },
  preset: {
    fontSize: 12,
    color: '#6b7280',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  presetActive: {
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
  },
});
