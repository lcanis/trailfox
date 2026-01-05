import {
  BUILT_IN_PRESETS,
  TRAILSIDE_PRESET,
  EXPLORER_PRESET,
  MULTI_DAY_PRESET,
  getPresetById,
} from '../presets';

describe('presets', () => {
  describe('BUILT_IN_PRESETS', () => {
    it('should have 3 presets', () => {
      expect(BUILT_IN_PRESETS).toHaveLength(3);
    });

    it('should have Trailside, Explorer, and Multi-day presets', () => {
      const names = BUILT_IN_PRESETS.map((p) => p.name);
      expect(names).toContain('Trailside');
      expect(names).toContain('Explorer');
      expect(names).toContain('Multi-day');
    });

    it('should have unique IDs', () => {
      const ids = BUILT_IN_PRESETS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should all be marked as presets, not custom', () => {
      BUILT_IN_PRESETS.forEach((preset) => {
        expect(preset.isPreset).toBe(true);
        expect(preset.isCustom).toBe(false);
      });
    });

    it('should have valid filter data', () => {
      BUILT_IN_PRESETS.forEach((preset) => {
        expect(preset.data).toBeDefined();
        expect(typeof preset.data.defaultEnabled).toBe('boolean');
        expect(typeof preset.data.defaultMaxDistanceMeters).toBe('number');
        expect(typeof preset.data.classes).toBe('object');
      });
    });
  });

  describe('TRAILSIDE_PRESET', () => {
    it('should have shortest default distance', () => {
      expect(TRAILSIDE_PRESET.data.defaultMaxDistanceMeters).toBe(100);
    });

    it('should disable accommodation', () => {
      expect(TRAILSIDE_PRESET.data.classes.accom?.enabled).toBe(false);
    });

    it('should disable tourism', () => {
      expect(TRAILSIDE_PRESET.data.classes.tourism?.enabled).toBe(false);
    });

    it('should have water very close', () => {
      expect(TRAILSIDE_PRESET.data.classes.water?.maxDistanceMeters).toBe(50);
    });
  });

  describe('EXPLORER_PRESET', () => {
    it('should have moderate default distance', () => {
      expect(EXPLORER_PRESET.data.defaultMaxDistanceMeters).toBe(500);
    });

    it('should enable tourism', () => {
      expect(EXPLORER_PRESET.data.classes.tourism?.maxDistanceMeters).toBe(500);
    });

    it('should disable accommodation', () => {
      expect(EXPLORER_PRESET.data.classes.accom?.enabled).toBe(false);
    });
  });

  describe('MULTI_DAY_PRESET', () => {
    it('should have longest default distance', () => {
      expect(MULTI_DAY_PRESET.data.defaultMaxDistanceMeters).toBe(1000);
    });

    it('should enable accommodation', () => {
      expect(MULTI_DAY_PRESET.data.classes.accom?.enabled).toBe(true);
      expect(MULTI_DAY_PRESET.data.classes.accom?.maxDistanceMeters).toBe(2000);
    });

    it('should have resupply at longer distance', () => {
      expect(MULTI_DAY_PRESET.data.classes.resupply?.maxDistanceMeters).toBe(1000);
    });
  });

  describe('getPresetById', () => {
    it('should find preset by ID', () => {
      const preset = getPresetById('preset-trailside');

      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Trailside');
    });

    it('should return undefined for non-existent ID', () => {
      const preset = getPresetById('non-existent');

      expect(preset).toBeUndefined();
    });
  });

  describe('preset consistency', () => {
    it('should have water class in all presets', () => {
      BUILT_IN_PRESETS.forEach((preset) => {
        expect(preset.data.classes.water).toBeDefined();
      });
    });

    it('should have hygiene class in all presets', () => {
      BUILT_IN_PRESETS.forEach((preset) => {
        expect(preset.data.classes.hygiene).toBeDefined();
      });
    });

    it('should have increasing distance tolerance from Trailside → Explorer → Multi-day', () => {
      const trailside = TRAILSIDE_PRESET.data.defaultMaxDistanceMeters;
      const explorer = EXPLORER_PRESET.data.defaultMaxDistanceMeters;
      const multiday = MULTI_DAY_PRESET.data.defaultMaxDistanceMeters;

      expect(explorer).toBeGreaterThan(trailside);
      expect(multiday).toBeGreaterThan(explorer);
    });
  });
});
