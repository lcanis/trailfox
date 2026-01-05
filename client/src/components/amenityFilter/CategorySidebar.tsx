import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AmenityCategory, AmenityFilterSchema } from '../../types';

interface CategorySidebarProps {
  categories: AmenityCategory[];
  filter: AmenityFilterSchema;
  selectedId: string;
  onSelectCategory: (id: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  filter,
  selectedId,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      {categories.map((category) => {
        // Determine if this category is enabled
        const osmClass = category.osmClasses[0];
        const classRule = filter.classes[osmClass];
        const isEnabled = classRule?.enabled ?? filter.defaultEnabled;
        const isSelected = category.id === selectedId;

        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.category,
              isSelected && styles.categorySelected,
              !isEnabled && styles.categoryDisabled,
            ]}
            onPress={() => onSelectCategory(category.id)}
          >
            <View style={styles.categoryContent}>
              <Text style={styles.icon}>{category.icon}</Text>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  category: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categorySelected: {
    backgroundColor: '#dbeafe',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  categoryDisabled: {
    opacity: 0.5,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111',
  },
  arrow: {
    fontSize: 18,
    color: '#9ca3af',
  },
});
