import React from 'react';
import Slider from '@react-native-community/slider';

export interface RadiusSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

export default function RadiusSlider(props: RadiusSliderProps) {
  return <Slider {...props} />;
}
