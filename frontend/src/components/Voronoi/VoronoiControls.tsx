/**
 * VoronoiControls Component
 * 
 * Control panel for Voronoi diagram options including diagram selection,
 * gap visibility toggle, area threshold slider, and administrative filters.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  VoronoiControlsProps,
  GapSeverity,
} from '@/types/voronoi.types';
import { fetchAdminBoundaries } from '@/services/voronoiApi';
import { useLanguage } from '../../i18n';

// ============================================================================
// Styles
// ============================================================================

// Custom scrollbar styles (CSS-in-JS compatible)
const scrollbarStyles = `
  .voronoi-controls-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .voronoi-controls-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  .voronoi-controls-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  .voronoi-controls-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    padding: '16px',
    width: '280px',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    scrollbarWidth: 'thin' as const,
    scrollbarColor: '#cbd5e1 #f1f5f9',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#1f2937',
    margin: 0,
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#6b7280',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
  },
  checkboxInput: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  slider: {
    width: '100%',
    marginTop: '8px',
  },
  sliderValue: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  button: {
    width: '100%',
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
  disabledButton: {
    backgroundColor: '#e5e7eb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
  severityFilters: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '8px',
  },
  severityChip: {
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.2s ease',
  },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
  },
};

// ============================================================================
// Severity Colors
// ============================================================================

const severityColors: Record<GapSeverity, { bg: string; border: string; text: string }> = {
  low: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  medium: { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
  high: { bg: '#fed7aa', border: '#f97316', text: '#9a3412' },
  critical: { bg: '#fecaca', border: '#ef4444', text: '#991b1b' },
};

// ============================================================================
// Component
// ============================================================================

export const VoronoiControls: React.FC<VoronoiControlsProps> = ({
  diagrams,
  selectedDiagramId,
  onDiagramSelect,
  showGaps,
  onShowGapsChange,
  minGapArea,
  onMinGapAreaChange,
  adminFilters,
  onAdminFilterChange,
  onGenerateNew,
  isLoading = false,
  disabled = false,
}) => {
  // i18n hook
  const { t } = useLanguage();

  // State for admin boundary options
  const [adminLevel1Options, setAdminLevel1Options] = useState<{ id: string; name: string }[]>([]);
  const [adminLevel2Options, setAdminLevel2Options] = useState<{ id: string; name: string }[]>([]);
  const [adminLevel3Options, setAdminLevel3Options] = useState<{ id: string; name: string }[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Severity filter state
  const [selectedSeverities, setSelectedSeverities] = useState<GapSeverity[]>(['medium', 'high', 'critical']);

  // ============================================================================
  // Load Admin Boundaries
  // ============================================================================

  useEffect(() => {
    const loadLevel1 = async () => {
      try {
        setLoadingAdmin(true);
        const options = await fetchAdminBoundaries('level1');
        setAdminLevel1Options(options);
      } catch (error) {
        console.error('Failed to load admin level 1:', error);
      } finally {
        setLoadingAdmin(false);
      }
    };
    loadLevel1();
  }, []);

  useEffect(() => {
    const loadLevel2 = async () => {
      if (!adminFilters.level1) {
        setAdminLevel2Options([]);
        return;
      }
      try {
        setLoadingAdmin(true);
        const options = await fetchAdminBoundaries('level2', adminFilters.level1);
        setAdminLevel2Options(options);
      } catch (error) {
        console.error('Failed to load admin level 2:', error);
      } finally {
        setLoadingAdmin(false);
      }
    };
    loadLevel2();
  }, [adminFilters.level1]);

  useEffect(() => {
    const loadLevel3 = async () => {
      if (!adminFilters.level2) {
        setAdminLevel3Options([]);
        return;
      }
      try {
        setLoadingAdmin(true);
        const options = await fetchAdminBoundaries('level3', adminFilters.level2);
        setAdminLevel3Options(options);
      } catch (error) {
        console.error('Failed to load admin level 3:', error);
      } finally {
        setLoadingAdmin(false);
      }
    };
    loadLevel3();
  }, [adminFilters.level2]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDiagramChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      onDiagramSelect(value);
    }
  }, [onDiagramSelect]);

  const handleShowGapsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onShowGapsChange(e.target.checked);
  }, [onShowGapsChange]);

  const handleMinAreaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onMinGapAreaChange(Number(e.target.value));
  }, [onMinGapAreaChange]);

  const handleAdminLevel1Change = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    onAdminFilterChange('level1', value);
    onAdminFilterChange('level2', null);
    onAdminFilterChange('level3', null);
  }, [onAdminFilterChange]);

  const handleAdminLevel2Change = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    onAdminFilterChange('level2', value);
    onAdminFilterChange('level3', null);
  }, [onAdminFilterChange]);

  const handleAdminLevel3Change = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    onAdminFilterChange('level3', value);
  }, [onAdminFilterChange]);

  const toggleSeverity = useCallback((severity: GapSeverity) => {
    setSelectedSeverities((prev) => {
      if (prev.includes(severity)) {
        return prev.filter((s) => s !== severity);
      }
      return [...prev, severity];
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    onAdminFilterChange('level1', null);
    onAdminFilterChange('level2', null);
    onAdminFilterChange('level3', null);
    onMinGapAreaChange(10);
    setSelectedSeverities(['medium', 'high', 'critical']);
  }, [onAdminFilterChange, onMinGapAreaChange]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      {/* Inject scrollbar styles */}
      <style>{scrollbarStyles}</style>
      
      <div 
        className="voronoi-controls-scrollbar"
        style={{ ...styles.container, position: 'relative' }}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div style={styles.loadingOverlay}>
            <div className="spinner" />
          </div>
        )}

        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>{t.voronoi.title}</h3>
        </div>

        {/* Diagram Selection */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t.voronoi.controls.diagram}</div>
          <select
            style={styles.select}
            value={selectedDiagramId || ''}
            onChange={handleDiagramChange}
            disabled={disabled || isLoading}
          >
            <option value="">{t.voronoi.controls.selectDiagram}</option>
            {diagrams.map((diagram) => (
              <option key={diagram.id} value={diagram.id}>
                {diagram.name}
              </option>
            ))}
          </select>
        </div>

        {/* Gap Visibility */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t.voronoi.controls.coverageZones}</div>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              style={styles.checkboxInput}
              checked={showGaps}
              onChange={handleShowGapsChange}
              disabled={disabled || isLoading}
            />
            {t.voronoi.controls.showCoverageGaps}
          </label>
        </div>

        {/* Severity Filters */}
        {showGaps && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>{t.voronoi.controls.filterBySeverity}</div>
            <div style={styles.severityFilters}>
              {(Object.keys(severityColors) as GapSeverity[]).map((severity) => {
                const isSelected = selectedSeverities.includes(severity);
                const colors = severityColors[severity];
                return (
                  <button
                    key={severity}
                    style={{
                      ...styles.severityChip,
                      backgroundColor: isSelected ? colors.bg : '#f3f4f6',
                      borderColor: isSelected ? colors.border : '#d1d5db',
                      color: isSelected ? colors.text : '#6b7280',
                    }}
                    onClick={() => toggleSeverity(severity)}
                    disabled={disabled || isLoading}
                  >
                    {t.voronoi.gaps[severity]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Minimum Gap Area Slider */}
        {showGaps && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>{t.voronoi.controls.minimumThreshold}</div>
            <input
              type="range"
              style={styles.slider}
              min={0}
              max={100}
              step={5}
              value={minGapArea}
              onChange={handleMinAreaChange}
              disabled={disabled || isLoading}
            />
            <div style={styles.sliderValue}>
              <span>0 km²</span>
              <span>{minGapArea} km²</span>
              <span>100 km²</span>
            </div>
          </div>
        )}

        {/* Administrative Filters */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t.filters.administrative.title}</div>
          
          <select
            style={{ ...styles.select, marginBottom: '8px' }}
            value={adminFilters.level1 || ''}
            onChange={handleAdminLevel1Change}
            disabled={disabled || isLoading || loadingAdmin}
          >
            <option value="">{t.filters.administrative.allRegions}</option>
            {adminLevel1Options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          <select
            style={{ ...styles.select, marginBottom: '8px' }}
            value={adminFilters.level2 || ''}
            onChange={handleAdminLevel2Change}
            disabled={disabled || isLoading || loadingAdmin || !adminFilters.level1}
          >
            <option value="">{t.filters.administrative.allDivisions}</option>
            {adminLevel2Options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          <select
            style={styles.select}
            value={adminFilters.level3 || ''}
            onChange={handleAdminLevel3Change}
            disabled={disabled || isLoading || loadingAdmin || !adminFilters.level2}
          >
            <option value="">{t.filters.administrative.allSubdivisions}</option>
            {adminLevel3Options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div style={styles.section}>
          <button
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(disabled || isLoading ? styles.disabledButton : {}),
              marginBottom: '8px',
            }}
            onClick={onGenerateNew}
            disabled={disabled || isLoading}
          >
            {t.voronoi.controls.generateNew}
          </button>
          
          <button
            style={{
              ...styles.button,
              ...styles.secondaryButton,
              ...(disabled || isLoading ? styles.disabledButton : {}),
            }}
            onClick={handleResetFilters}
            disabled={disabled || isLoading}
          >
            {t.voronoi.controls.resetFilters}
          </button>
        </div>
      </div>
    </>
  );
};

export default VoronoiControls;
