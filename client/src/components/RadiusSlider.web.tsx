import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { RadiusSliderProps } from './RadiusSlider';

export default function RadiusSlider({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
}: RadiusSliderProps) {
  return (
    <View style={styles.container}>
      <input
        style={styles.input as any}
        type="range"
        min={minimumValue}
        max={maximumValue}
        step={step}
        value={value}
        onChange={(e) => onValueChange(parseFloat((e.target as HTMLInputElement).value))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    width: '100%',
  },
});
