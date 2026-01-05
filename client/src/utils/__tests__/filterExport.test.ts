import {
  exportFilterAsJSON,
  exportPresetAsJSON,
  importFilterFromJSON,
  importPresetFromJSON,
  encodeFilterAsURL,
  decodeFilterFromURL,
  generateShareURL,
} from '../filterExport';
import { AmenityFilterSchema, AmenityFilterPreset } from '../../types';

describe('filterExport', () => {
  const sampleFilter: AmenityFilterSchema = {
    defaultEnabled: true,
    defaultMaxDistanceMeters: 500,
    classes: {
      water: { maxDistanceMeters: 100 },
      food: { enabled: true },
    },
  };

  const samplePreset: AmenityFilterPreset = {
    id: 'test-preset',
    name: 'Test Preset',
    isPreset: false,
    isCustom: true,
    createdAt: 1234567890,
    updatedAt: 1234567890,
    data: sampleFilter,
  };

  describe('exportFilterAsJSON', () => {
    it('should export filter as formatted JSON string', () => {
      const json = exportFilterAsJSON(sampleFilter);

      expect(json).toContain('"defaultEnabled": true');
      expect(json).toContain('"defaultMaxDistanceMeters": 500');
      expect(JSON.parse(json)).toEqual(sampleFilter);
    });
  });

  describe('exportPresetAsJSON', () => {
    it('should export preset as formatted JSON string', () => {
      const json = exportPresetAsJSON(samplePreset);

      expect(json).toContain('"id": "test-preset"');
      expect(json).toContain('"name": "Test Preset"');
      expect(JSON.parse(json)).toEqual(samplePreset);
    });
  });

  describe('importFilterFromJSON', () => {
    it('should import valid filter JSON', () => {
      const json = JSON.stringify(sampleFilter);
      const imported = importFilterFromJSON(json);

      expect(imported).toEqual(sampleFilter);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => importFilterFromJSON('not json')).toThrow('Invalid JSON format');
    });

    it('should throw error for missing required fields', () => {
      const invalid = { defaultEnabled: true }; // Missing other fields
      expect(() => importFilterFromJSON(JSON.stringify(invalid))).toThrow();
    });
  });

  describe('importPresetFromJSON', () => {
    it('should import valid preset JSON', () => {
      const json = JSON.stringify(samplePreset);
      const imported = importPresetFromJSON(json);

      expect(imported).toEqual(samplePreset);
    });

    it('should throw error for invalid preset structure', () => {
      const invalid = { id: 'test', name: 'Test' }; // Missing data
      expect(() => importPresetFromJSON(JSON.stringify(invalid))).toThrow();
    });
  });

  describe('encodeFilterAsURL and decodeFilterFromURL', () => {
    it('should encode and decode filter', () => {
      const encoded = encodeFilterAsURL(sampleFilter);
      const decoded = decodeFilterFromURL(encoded);

      expect(decoded).toEqual(sampleFilter);
    });

    it('should handle complex filters', () => {
      const complexFilter: AmenityFilterSchema = {
        defaultEnabled: true,
        defaultMaxDistanceMeters: 1000,
        classes: {
          food: {
            enabled: true,
            maxDistanceMeters: 500,
            subclasses: {
              restaurant: { enabled: true },
              fast_food: { enabled: false },
            },
          },
          water: { maxDistanceMeters: 100 },
        },
      };

      const encoded = encodeFilterAsURL(complexFilter);
      const decoded = decodeFilterFromURL(encoded);

      expect(decoded).toEqual(complexFilter);
    });

    it('should throw error for invalid encoded string', () => {
      expect(() => decodeFilterFromURL('invalid')).toThrow();
    });
  });

  describe('generateShareURL', () => {
    it('should generate shareable URL with filter', () => {
      const url = generateShareURL(sampleFilter, 'https://example.com');

      expect(url).toContain('https://example.com/filter?p=');
      expect(url.length).toBeGreaterThan(30);
    });

    it('should generate URL that can be decoded', () => {
      const url = generateShareURL(sampleFilter, 'https://example.com');
      const encoded = url.split('?p=')[1];
      const decoded = decodeFilterFromURL(encoded);

      expect(decoded).toEqual(sampleFilter);
    });
  });
});
