import {
  AMENITY_CATEGORIES,
  sortCategories,
  getCategoryById,
  getCategoryForOsmClass,
} from '../categories';

describe('categories', () => {
  describe('AMENITY_CATEGORIES', () => {
    it('should have 8 categories', () => {
      expect(AMENITY_CATEGORIES).toHaveLength(8);
    });

    it('should have unique IDs', () => {
      const ids = AMENITY_CATEGORIES.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique order numbers', () => {
      const orders = AMENITY_CATEGORIES.map((c) => c.order);
      const uniqueOrders = new Set(orders);
      expect(uniqueOrders.size).toBe(orders.length);
    });

    it('should have water-toilets as first category (order 1)', () => {
      const waterToilets = AMENITY_CATEGORIES.find((c) => c.id === 'water-toilets');
      expect(waterToilets?.order).toBe(1);
    });

    it('should have accommodation disabled by default', () => {
      const accommodation = AMENITY_CATEGORIES.find((c) => c.id === 'accommodation');
      expect(accommodation?.defaultEnabled).toBe(false);
    });

    it('should have all required fields', () => {
      AMENITY_CATEGORIES.forEach((category) => {
        expect(category.id).toBeTruthy();
        expect(category.name).toBeTruthy();
        expect(category.icon).toBeTruthy();
        expect(Array.isArray(category.osmClasses)).toBe(true);
        expect(category.osmClasses.length).toBeGreaterThan(0);
        expect(typeof category.order).toBe('number');
        expect(typeof category.defaultEnabled).toBe('boolean');
        expect(typeof category.defaultDistance).toBe('number');
      });
    });
  });

  describe('sortCategories', () => {
    it('should sort categories by order', () => {
      const sorted = sortCategories(AMENITY_CATEGORIES);

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].order).toBeGreaterThan(sorted[i - 1].order);
      }
    });

    it('should not mutate original array', () => {
      const original = [...AMENITY_CATEGORIES];
      sortCategories(AMENITY_CATEGORIES);

      expect(AMENITY_CATEGORIES).toEqual(original);
    });
  });

  describe('getCategoryById', () => {
    it('should find category by ID', () => {
      const category = getCategoryById('water-toilets');

      expect(category).toBeDefined();
      expect(category?.name).toBe('Water & Toilets');
    });

    it('should return undefined for non-existent ID', () => {
      const category = getCategoryById('non-existent');

      expect(category).toBeUndefined();
    });
  });

  describe('getCategoryForOsmClass', () => {
    it('should find category by OSM class', () => {
      const category = getCategoryForOsmClass('water');

      expect(category).toBeDefined();
      expect(category?.id).toBe('water-toilets');
    });

    it('should find category for hygiene class', () => {
      const category = getCategoryForOsmClass('hygiene');

      expect(category).toBeDefined();
      expect(category?.id).toBe('water-toilets');
    });

    it('should return undefined for non-existent OSM class', () => {
      const category = getCategoryForOsmClass('non-existent');

      expect(category).toBeUndefined();
    });
  });
});
