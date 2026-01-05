import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PresetSelector } from '../PresetSelector';
import { BUILT_IN_PRESETS } from '../../../data/presets';

describe('PresetSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all built-in presets', () => {
    const { getByText } = render(
      <PresetSelector presets={BUILT_IN_PRESETS} onSelect={mockOnSelect} />
    );

    expect(getByText('Trailside')).toBeTruthy();
    expect(getByText('Explorer')).toBeTruthy();
    expect(getByText('Multi-day')).toBeTruthy();
  });

  it('should call onSelect when preset is pressed', () => {
    const { getByText } = render(
      <PresetSelector presets={BUILT_IN_PRESETS} onSelect={mockOnSelect} />
    );

    const trailsideButton = getByText('Trailside');
    fireEvent.press(trailsideButton);

    expect(mockOnSelect).toHaveBeenCalledWith('preset-trailside');
  });

  it('should only show built-in presets, not custom', () => {
    const allPresets = [
      ...BUILT_IN_PRESETS,
      {
        id: 'custom-1',
        name: 'My Custom',
        isPreset: false,
        isCustom: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: {
          defaultEnabled: true,
          defaultMaxDistanceMeters: 500,
          classes: {},
        },
      },
    ];

    const { getByText, queryByText } = render(
      <PresetSelector presets={allPresets} onSelect={mockOnSelect} />
    );

    expect(getByText('Trailside')).toBeTruthy();
    expect(queryByText('My Custom')).toBeNull();
  });

  it('should render label', () => {
    const { getByText } = render(
      <PresetSelector presets={BUILT_IN_PRESETS} onSelect={mockOnSelect} />
    );

    expect(getByText('Quick Presets')).toBeTruthy();
  });
});
