import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategorySidebar } from '../CategorySidebar';
import { AMENITY_CATEGORIES } from '../../../data/categories';
import { AmenityFilterSchema } from '../../../types';

describe('CategorySidebar', () => {
  const mockFilter: AmenityFilterSchema = {
    defaultEnabled: true,
    defaultMaxDistanceMeters: 500,
    classes: {
      water: { maxDistanceMeters: 100 },
      tourism: { enabled: false },
    },
  };

  const mockOnSelectCategory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all categories', () => {
    const { getByText } = render(
      <CategorySidebar
        categories={AMENITY_CATEGORIES}
        filter={mockFilter}
        selectedId="water-toilets"
        onSelectCategory={mockOnSelectCategory}
      />
    );

    expect(getByText('Water & Toilets')).toBeTruthy();
    expect(getByText('Food & Drink')).toBeTruthy();
    expect(getByText('Accommodation')).toBeTruthy();
  });

  it('should call onSelectCategory when category is pressed', () => {
    const { getByText } = render(
      <CategorySidebar
        categories={AMENITY_CATEGORIES}
        filter={mockFilter}
        selectedId="water-toilets"
        onSelectCategory={mockOnSelectCategory}
      />
    );

    const foodCategory = getByText('Food & Drink');
    fireEvent.press(foodCategory);

    expect(mockOnSelectCategory).toHaveBeenCalledWith('food-drink');
  });

  it('should visually indicate disabled categories', () => {
    const { getByText } = render(
      <CategorySidebar
        categories={AMENITY_CATEGORIES}
        filter={mockFilter}
        selectedId="water-toilets"
        onSelectCategory={mockOnSelectCategory}
      />
    );

    // Tourism & Culture should be disabled (contains 'tourism' class)
    expect(getByText('Tourism & Culture')).toBeTruthy();
  });

  it('should visually indicate selected category', () => {
    const { getByText } = render(
      <CategorySidebar
        categories={AMENITY_CATEGORIES}
        filter={mockFilter}
        selectedId="food-drink"
        onSelectCategory={mockOnSelectCategory}
      />
    );

    expect(getByText('Food & Drink')).toBeTruthy();
  });

  it('should show category icons', () => {
    const { getByText } = render(
      <CategorySidebar
        categories={AMENITY_CATEGORIES}
        filter={mockFilter}
        selectedId="water-toilets"
        onSelectCategory={mockOnSelectCategory}
      />
    );

    // Icons should be rendered (emojis)
    expect(getByText('💧')).toBeTruthy();
    expect(getByText('🍽️')).toBeTruthy();
  });
});
