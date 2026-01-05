import {
  SUBCLASS_DATA,
  getSubclassesForClass,
  formatSubclassName,
  countSubclasses,
  getSubclassDisplayName,
} from '../subclasses';

describe('subclasses', () => {
  describe('SUBCLASS_DATA', () => {
    it('should have data for common OSM classes', () => {
      expect(SUBCLASS_DATA.water).toBeDefined();
      expect(SUBCLASS_DATA.food).toBeDefined();
      expect(SUBCLASS_DATA.tourism).toBeDefined();
      expect(SUBCLASS_DATA.accom).toBeDefined();
    });

    it('should have counts for each subclass', () => {
      Object.values(SUBCLASS_DATA).forEach((classData) => {
        Object.values(classData).forEach((count) => {
          expect(typeof count).toBe('number');
          expect(count).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('getSubclassesForClass', () => {
    it('should return subclasses sorted by count (descending)', () => {
      const subclasses = getSubclassesForClass('food');

      expect(subclasses.length).toBeGreaterThan(0);

      // Check sorting
      for (let i = 1; i < subclasses.length; i++) {
        expect(subclasses[i].count).toBeLessThanOrEqual(subclasses[i - 1].count);
      }
    });

    it('should format subclass IDs correctly', () => {
      const subclasses = getSubclassesForClass('water');

      subclasses.forEach((subclass) => {
        expect(subclass.id).toMatch(/^water\./);
        expect(subclass.categoryId).toBe('water');
      });
    });

    it('should return empty array for non-existent class', () => {
      const subclasses = getSubclassesForClass('non-existent');

      expect(subclasses).toEqual([]);
    });

    it('should include count in subclass data', () => {
      const subclasses = getSubclassesForClass('food');

      subclasses.forEach((subclass) => {
        expect(subclass.count).toBeGreaterThan(0);
      });
    });
  });

  describe('formatSubclassName', () => {
    it('should format snake_case to Title Case', () => {
      expect(formatSubclassName('drinking_water')).toBe('Drinking Water');
      expect(formatSubclassName('fast_food')).toBe('Fast Food');
    });

    it('should handle single words', () => {
      expect(formatSubclassName('restaurant')).toBe('Restaurant');
      expect(formatSubclassName('hotel')).toBe('Hotel');
    });

    it('should handle multiple underscores', () => {
      expect(formatSubclassName('public_bath')).toBe('Public Bath');
    });
  });

  describe('countSubclasses', () => {
    it('should count number of subclasses', () => {
      const waterCount = countSubclasses('water');
      const foodCount = countSubclasses('food');

      expect(waterCount).toBe(Object.keys(SUBCLASS_DATA.water).length);
      expect(foodCount).toBe(Object.keys(SUBCLASS_DATA.food).length);
    });

    it('should return 0 for non-existent class', () => {
      const count = countSubclasses('non-existent');

      expect(count).toBe(0);
    });

    it('should handle shelter with single subclass', () => {
      const count = countSubclasses('shelter');

      expect(count).toBe(1);
    });
  });

  describe('getSubclassDisplayName', () => {
    it('should return formatted display name', () => {
      const name = getSubclassDisplayName('water', 'drinking_water');

      expect(name).toBe('Drinking Water');
    });

    it('should handle any subclass name', () => {
      const name = getSubclassDisplayName('food', 'fast_food');

      expect(name).toBe('Fast Food');
    });
  });

  describe('subclass data consistency', () => {
    it('should have food.restaurant as the most popular food amenity', () => {
      const subclasses = getSubclassesForClass('food');

      expect(subclasses[0].name).toContain('Restaurant');
    });

    it('should have street.bench as the most popular street amenity', () => {
      const subclasses = getSubclassesForClass('street');

      expect(subclasses[0].name).toContain('Bench');
    });

    it('should have reasonable counts for common amenities', () => {
      const toilets = SUBCLASS_DATA.hygiene.toilets;
      const restaurants = SUBCLASS_DATA.food.restaurant;

      expect(toilets).toBeGreaterThan(100);
      expect(restaurants).toBeGreaterThan(500);
    });
  });
});
