import { AmenityFilterSchema, AmenityFilterPreset } from '../types';

/**
 * Export filter as JSON string.
 */
export const exportFilterAsJSON = (filter: AmenityFilterSchema): string => {
  return JSON.stringify(filter, null, 2);
};

/**
 * Export preset (with metadata) as JSON string.
 */
export const exportPresetAsJSON = (preset: AmenityFilterPreset): string => {
  return JSON.stringify(preset, null, 2);
};

/**
 * Import filter from JSON string.
 * Basic validation - in production would use Zod for schema validation.
 */
export const importFilterFromJSON = (json: string): AmenityFilterSchema => {
  try {
    const parsed = JSON.parse(json);

    // Basic validation
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid JSON: expected an object');
    }

    if (typeof parsed.defaultEnabled !== 'boolean') {
      throw new Error('Invalid filter: missing or invalid defaultEnabled');
    }

    if (typeof parsed.defaultMaxDistanceMeters !== 'number') {
      throw new Error('Invalid filter: missing or invalid defaultMaxDistanceMeters');
    }

    if (typeof parsed.classes !== 'object' || parsed.classes === null) {
      throw new Error('Invalid filter: missing or invalid classes');
    }

    return parsed as AmenityFilterSchema;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw err;
  }
};

/**
 * Import preset (with metadata) from JSON string.
 */
export const importPresetFromJSON = (json: string): AmenityFilterPreset => {
  try {
    const parsed = JSON.parse(json);

    // Basic validation
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid JSON: expected an object');
    }

    if (typeof parsed.id !== 'string') {
      throw new Error('Invalid preset: missing or invalid id');
    }

    if (typeof parsed.name !== 'string') {
      throw new Error('Invalid preset: missing or invalid name');
    }

    if (typeof parsed.data !== 'object' || parsed.data === null) {
      throw new Error('Invalid preset: missing or invalid data');
    }

    // Validate the nested filter data
    importFilterFromJSON(JSON.stringify(parsed.data));

    return parsed as AmenityFilterPreset;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw err;
  }
};

/**
 * Encode filter as base64 URL parameter (for sharing).
 */
export const encodeFilterAsURL = (filter: AmenityFilterSchema): string => {
  const json = JSON.stringify(filter);
  // Basic base64 encoding - in production might use gzip compression
  if (typeof btoa !== 'undefined') {
    return btoa(json);
  }
  // Node.js environment
  return Buffer.from(json).toString('base64');
};

/**
 * Decode filter from base64 URL parameter.
 */
export const decodeFilterFromURL = (encoded: string): AmenityFilterSchema => {
  let json: string;

  try {
    if (typeof atob !== 'undefined') {
      json = atob(encoded);
    } else {
      // Node.js environment
      json = Buffer.from(encoded, 'base64').toString('utf-8');
    }

    return importFilterFromJSON(json);
  } catch {
    throw new Error('Invalid encoded filter');
  }
};

/**
 * Generate a shareable URL for a filter.
 */
export const generateShareURL = (filter: AmenityFilterSchema, baseUrl?: string): string => {
  const encoded = encodeFilterAsURL(filter);
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/filter?p=${encoded}`;
};
