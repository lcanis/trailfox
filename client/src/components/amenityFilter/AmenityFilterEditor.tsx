import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useAmenityFilters } from '../../hooks/useAmenityFilters';
import { useFilterStorage } from '../../hooks/useFilterStorage';
import { BUILT_IN_PRESETS } from '../../data/presets';
import { AMENITY_CATEGORIES, sortCategories } from '../../data/categories';
import { exportPresetAsJSON, importPresetFromJSON } from '../../utils/filterExport';
import { GlobalControls } from './GlobalControls';
import { PresetSelector } from './PresetSelector';
import { CategorySidebar } from './CategorySidebar';
import { DetailPanel } from './DetailPanel';
import type { AmenityFilterPreset } from '../../types';

export const AmenityFilterEditor: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState('water-toilets');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const storage = useFilterStorage();
  const filter = useAmenityFilters(BUILT_IN_PRESETS[0].data);

  // Combine built-in + custom presets
  const allPresets = [...BUILT_IN_PRESETS, ...storage.presets];
  const sortedCategories = sortCategories(AMENITY_CATEGORIES);
  const selectedCategory = AMENITY_CATEGORIES.find((c) => c.id === selectedCategoryId);

  const handlePresetSelect = (presetId: string) => {
    const preset = allPresets.find((p) => p.id === presetId);
    if (preset) {
      filter.applyPreset(preset);
    }
  };

  const handleSavePreset = async () => {
    if (!savePresetName.trim()) return;

    const newPreset: AmenityFilterPreset = {
      id: `custom-${Date.now()}`,
      name: savePresetName,
      isPreset: false,
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: filter.currentFilter,
    };

    try {
      await storage.savePreset(newPreset);
      setSavePresetName('');
      setShowSaveDialog(false);
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  const handleExport = () => {
    const json = exportPresetAsJSON({
      id: `export-${Date.now()}`,
      name: 'Exported Filter',
      isPreset: false,
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: filter.currentFilter,
    });

    if (Platform.OS === 'web') {
      // Web: download as file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amenity-filter-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Native: would use share sheet (not implemented here)
      console.warn('Export:', json);
    }
  };

  const handleImportWeb = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = importPresetFromJSON(text);
      filter.applyPreset(imported);
      setImportError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setImportError(msg);
    }
  };

  if (storage.loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Amenity Filters</Text>
        <Text style={styles.subtitle}>Show & hide trail amenities by category</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Global Controls */}
        <View style={styles.section}>
          <GlobalControls
            showAll={filter.currentFilter.defaultEnabled}
            onShowAllChange={filter.setShowAll}
            distance={filter.currentFilter.defaultMaxDistanceMeters}
            onDistanceChange={filter.setGlobalDistance}
          />
        </View>

        {/* Preset Selector */}
        <View style={styles.section}>
          <PresetSelector presets={allPresets} onSelect={handlePresetSelect} />
        </View>

        {/* Category Selection (mobile: show dropdown, desktop: sidebar) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <CategorySidebar
            categories={sortedCategories}
            filter={filter.currentFilter}
            selectedId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </View>

        {/* Detail Panel */}
        {selectedCategory && (
          <View style={styles.section}>
            <DetailPanel category={selectedCategory} filter={filter} />
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => setShowSaveDialog(true)}>
          <Text style={styles.buttonText}>Save as Custom Preset</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleExport}>
          <Text style={styles.buttonText}>Export</Text>
        </TouchableOpacity>

        {Platform.OS === 'web' && (
          <View>
            <input
              type="file"
              accept=".json"
              onChange={handleImportWeb}
              style={{ display: 'none' }}
              id="import-input"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => document.getElementById('import-input')?.click()}
            >
              <Text style={styles.buttonText}>Import</Text>
            </TouchableOpacity>
          </View>
        )}

        {importError && <Text style={styles.errorText}>{importError}</Text>}

        <Text style={styles.footerNote}>
          Your filter preferences are saved locally. No data is sent to our servers.
        </Text>
      </View>

      {/* Save Dialog Modal */}
      {showSaveDialog && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Custom Preset</Text>
            <TextInput
              style={styles.input}
              value={savePresetName}
              onChangeText={setSavePresetName}
              placeholder="Enter preset name"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowSaveDialog(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSavePreset}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    gap: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
  },
  buttonSecondary: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
});
