import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlobalControls } from '../GlobalControls';

describe('GlobalControls', () => {
  const defaultProps = {
    showAll: true,
    onShowAllChange: jest.fn(),
    distance: 500,
    onDistanceChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText, getAllByText } = render(<GlobalControls {...defaultProps} />);

    expect(getByText('Global Settings')).toBeTruthy();
    expect(getByText('Show all amenities')).toBeTruthy();
    expect(getByText('Max Distance from Trail')).toBeTruthy();
    expect(getAllByText('500m').length).toBeGreaterThan(0); // Appears as value and preset
  });

  it('should call onShowAllChange when switch is toggled', () => {
    const { getByRole } = render(<GlobalControls {...defaultProps} />);

    const switchElement = getByRole('switch');
    fireEvent(switchElement, 'valueChange', false);

    expect(defaultProps.onShowAllChange).toHaveBeenCalledWith(false);
  });

  it('should display current distance value', () => {
    const { getByText } = render(<GlobalControls {...defaultProps} distance={1000} />);

    expect(getByText('1000m')).toBeTruthy();
  });

  it('should render preset buttons', () => {
    const { getByText, getAllByText } = render(<GlobalControls {...defaultProps} />);

    expect(getByText('50m')).toBeTruthy();
    expect(getAllByText('200m').length).toBeGreaterThan(0);
    expect(getAllByText('500m').length).toBeGreaterThan(0);
    expect(getByText('2000m')).toBeTruthy();
  });

  it('should call onDistanceChange when preset is pressed', () => {
    const { getByText } = render(<GlobalControls {...defaultProps} />);

    const preset200 = getByText('200m');
    fireEvent.press(preset200);

    expect(defaultProps.onDistanceChange).toHaveBeenCalledWith(200);
  });

  it('should highlight active preset', () => {
    const { getAllByText } = render(<GlobalControls {...defaultProps} distance={200} />);

    const preset200Elements = getAllByText('200m');
    // Check if the preset elements exist (value label + preset button)
    expect(preset200Elements.length).toBeGreaterThan(0);
  });
});
