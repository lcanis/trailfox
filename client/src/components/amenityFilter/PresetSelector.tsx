import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AmenityFilterPreset } from '../../types';

interface PresetSelectorProps {
  presets: AmenityFilterPreset[];
  onSelect: (presetId: string) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({ presets, onSelect }) => {
  const builtInPresets = presets.filter((p) => p.isPreset);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Quick Presets</Text>
      <View style={styles.presets}>
        {builtInPresets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={styles.preset}
            onPress={() => onSelect(preset.id)}
          >
            <Text style={styles.presetText}>{preset.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preset: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  presetText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
