/**
 * VoronoiStatisticsPanel Component
 * 
 * Displays comprehensive statistics about Voronoi diagrams including
 * total cells, average area, coverage percentage, and gap distribution.
 * Features i18n support and collapsible panel functionality.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { VoronoiStatisticsPanelProps } from '@/types/voronoi.types';
import { formatArea, formatPercentage } from '@/utils/voronoiUtils';
import { useLanguage } from '../../i18n';

// ============================================================================
// Styles
// ============================================================================

// Custom scrollbar styles (CSS-in-JS compatible)
const scrollbarStyles = `
  .voronoi-statistics-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .voronoi-statistics-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  .voronoi-statistics-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  .voronoi-statistics-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    width: '320px',
    overflow: 'hidden',
  },
  headerClickable: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    cursor: 'pointer',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: 'white',
    transition: 'background-color 0.2s ease',
    userSelect: 'none' as const,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#1f2937',
    margin: 0,
  },
  chevron: {
    width: '20px',
    height: '20px',
    color: '#6b7280',
    transition: 'transform 0.3s ease',
  },
  chevronExpanded: {
    transform: 'rotate(180deg)',
  },
  contentWrapper: {
    overflow: 'hidden',
    transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out',
  },
  contentExpanded: {
    maxHeight: '2000px',
    opacity: 1,
  },
  contentCollapsed: {
    maxHeight: '0px',
    opacity: 0,
  },
  content: {
    padding: '16px',
    maxHeight: 'calc(80vh - 60px)',
    overflowY: 'auto' as const,
    scrollbarWidth: 'thin' as const,
    scrollbarColor: '#cbd5e1 #f1f5f9',
  },
  exportButtons: {
    display: 'flex',
    gap: '8px',
  },
  exportButton: {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    fontSize: '12px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  statCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    padding: '12px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#1f2937',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
  },
  gapSummary: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  gapRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
  },
  gapIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    marginRight: '8px',
  },
  gapLabel: {
    display: 'flex',
    alignItems: 'center',
    color: '#374151',
  },
  gapCount: {
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  chartContainer: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  barChart: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  barLabel: {
    width: '70px',
    fontSize: '11px',
    color: '#6b7280',
    textAlign: 'right' as const,
  },
  barContainer: {
    flex: 1,
    height: '20px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  barValue: {
    width: '50px',
    fontSize: '11px',
    color: '#374151',
    fontWeight: '500' as const,
  },
  coverageIndicator: {
    marginTop: '12px',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
  coverageValue: {
    fontSize: '32px',
    fontWeight: '700' as const,
    marginBottom: '4px',
  },
  coverageLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#6b7280',
  },
};

// ============================================================================
// Chevron Icon Component
// ============================================================================

interface ChevronIconProps {
  isExpanded: boolean;
}

const ChevronIcon: React.FC<ChevronIconProps> = ({ isExpanded }) => (
  <svg
    style={{
      ...styles.chevron,
      ...(isExpanded ? styles.chevronExpanded : {}),
    }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

// ============================================================================
// Gap Colors
// ============================================================================

const gapColors = {
  low: { bg: '#dcfce7', indicator: '#22c55e' },
  medium: { bg: '#fef9c3', indicator: '#eab308' },
  high: { bg: '#fed7aa', indicator: '#f97316' },
  critical: { bg: '#fecaca', indicator: '#ef4444' },
};

const barColors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

// ============================================================================
// Component
// ============================================================================

export const VoronoiStatisticsPanel: React.FC<VoronoiStatisticsPanelProps> = ({
  statistics,
  isLoading = false,
  onExport,
  showCharts = true,
  compact = false,
}) => {
  // ============================================================================
  // i18n Hook
  // ============================================================================
  
  const { t } = useLanguage();

  // ============================================================================
  // State
  // ============================================================================

  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const coverageColor = useMemo(() => {
    if (!statistics) return '#6b7280';
    const coverage = statistics.coveragePercentage;
    if (coverage >= 80) return '#22c55e';
    if (coverage >= 60) return '#84cc16';
    if (coverage >= 40) return '#eab308';
    if (coverage >= 20) return '#f97316';
    return '#ef4444';
  }, [statistics]);

  const maxDistributionCount = useMemo(() => {
    if (!statistics) return 0;
    return Math.max(...statistics.areaDistribution.map((d) => d.count));
  }, [statistics]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleExportJSON = useCallback(() => {
    onExport?.('json');
  }, [onExport]);

  const handleExportCSV = useCallback(() => {
    onExport?.('csv');
  }, [onExport]);

  // ============================================================================
  // Render Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div
          style={styles.headerClickable}
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
        >
          <div style={styles.headerLeft}>
            <h3 style={styles.title}>{t.voronoi.statistics.title}</h3>
          </div>
          <ChevronIcon isExpanded={isExpanded} />
        </div>
        <div
          style={{
            ...styles.contentWrapper,
            ...(isExpanded ? styles.contentExpanded : styles.contentCollapsed),
          }}
        >
          <div style={styles.loadingContainer}>
            <span>{t.voronoi.statistics.loading}</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render Empty State
  // ============================================================================

  if (!statistics) {
    return (
      <div style={styles.container}>
        <div
          style={styles.headerClickable}
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
        >
          <div style={styles.headerLeft}>
            <h3 style={styles.title}>{t.voronoi.statistics.title}</h3>
          </div>
          <ChevronIcon isExpanded={isExpanded} />
        </div>
        <div
          style={{
            ...styles.contentWrapper,
            ...(isExpanded ? styles.contentExpanded : styles.contentCollapsed),
          }}
        >
          <div style={styles.emptyState}>
            <p>{t.voronoi.statistics.noData}</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              {t.voronoi.statistics.selectDiagram}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      {/* Inject scrollbar styles */}
      <style>{scrollbarStyles}</style>
      
      <div style={styles.container}>
      {/* Clickable Header */}
      <div
        style={styles.headerClickable}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
      >
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>{t.voronoi.statistics.title}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onExport && isExpanded && (
            <div
              style={styles.exportButtons}
              onClick={(e) => e.stopPropagation()}
            >
              <button style={styles.exportButton} onClick={handleExportJSON}>
                JSON
              </button>
              <button style={styles.exportButton} onClick={handleExportCSV}>
                CSV
              </button>
            </div>
          )}
          <ChevronIcon isExpanded={isExpanded} />
        </div>
      </div>

      {/* Collapsible Content */}
      <div
        style={{
          ...styles.contentWrapper,
          ...(isExpanded ? styles.contentExpanded : styles.contentCollapsed),
        }}
      >
        <div className="voronoi-statistics-scrollbar" style={styles.content}>
          {/* Coverage Indicator */}
          <div
            style={{
              ...styles.coverageIndicator,
              backgroundColor: `${coverageColor}15`,
            }}
          >
            <div style={{ ...styles.coverageValue, color: coverageColor }}>
              {formatPercentage(statistics.coveragePercentage)}
            </div>
            <div style={styles.coverageLabel}>{t.voronoi.stats.globalCoverage}</div>
          </div>

          {/* Main Statistics */}
          <div style={{ ...styles.section, marginTop: '16px' }}>
            <div style={styles.sectionTitle}>{t.voronoi.sections.summary}</div>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{statistics.totalCells}</div>
                <div style={styles.statLabel}>{t.voronoi.stats.cells}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{formatArea(statistics.totalArea, 0)}</div>
                <div style={styles.statLabel}>{t.voronoi.stats.totalArea}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{formatArea(statistics.averageArea)}</div>
                <div style={styles.statLabel}>{t.voronoi.stats.average}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{formatArea(statistics.medianArea)}</div>
                <div style={styles.statLabel}>{t.voronoi.stats.median}</div>
              </div>
            </div>
          </div>

          {/* Additional Stats (non-compact mode) */}
          {!compact && (
            <div style={styles.section}>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{formatArea(statistics.minArea)}</div>
                  <div style={styles.statLabel}>{t.voronoi.stats.minimum}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{formatArea(statistics.maxArea)}</div>
                  <div style={styles.statLabel}>{t.voronoi.stats.maximum}</div>
                </div>
              </div>
            </div>
          )}

          {/* Gap Summary */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>{t.voronoi.sections.coverageGaps}</div>
            <div style={styles.gapSummary}>
              <div style={{ ...styles.gapRow, backgroundColor: gapColors.low.bg }}>
                <div style={styles.gapLabel}>
                  <div style={{ ...styles.gapIndicator, backgroundColor: gapColors.low.indicator }} />
                  {t.voronoi.gaps.low}
                </div>
                <div style={styles.gapCount}>{statistics.gapCount.low}</div>
              </div>
              <div style={{ ...styles.gapRow, backgroundColor: gapColors.medium.bg }}>
                <div style={styles.gapLabel}>
                  <div style={{ ...styles.gapIndicator, backgroundColor: gapColors.medium.indicator }} />
                  {t.voronoi.gaps.medium}
                </div>
                <div style={styles.gapCount}>{statistics.gapCount.medium}</div>
              </div>
              <div style={{ ...styles.gapRow, backgroundColor: gapColors.high.bg }}>
                <div style={styles.gapLabel}>
                  <div style={{ ...styles.gapIndicator, backgroundColor: gapColors.high.indicator }} />
                  {t.voronoi.gaps.high}
                </div>
                <div style={styles.gapCount}>{statistics.gapCount.high}</div>
              </div>
              <div style={{ ...styles.gapRow, backgroundColor: gapColors.critical.bg }}>
                <div style={styles.gapLabel}>
                  <div style={{ ...styles.gapIndicator, backgroundColor: gapColors.critical.indicator }} />
                  {t.voronoi.gaps.critical}
                </div>
                <div style={styles.gapCount}>{statistics.gapCount.critical}</div>
              </div>
            </div>
          </div>

          {/* Area Distribution Chart */}
          {showCharts && statistics.areaDistribution.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>{t.voronoi.sections.areaDistribution}</div>
              <div style={styles.chartContainer}>
                <div style={styles.barChart}>
                  {statistics.areaDistribution.map((item, index) => (
                    <div key={item.range} style={styles.barRow}>
                      <div style={styles.barLabel}>{item.range}</div>
                      <div style={styles.barContainer}>
                        <div
                          style={{
                            ...styles.bar,
                            width: `${maxDistributionCount > 0 ? (item.count / maxDistributionCount) * 100 : 0}%`,
                            backgroundColor: barColors[index] || barColors[barColors.length - 1],
                          }}
                        />
                      </div>
                      <div style={styles.barValue}>
                        {item.count} ({formatPercentage(item.percentage, 0)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Standard Deviation (non-compact mode) */}
          {!compact && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>{t.voronoi.sections.variability}</div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>
                  ±{formatArea(statistics.standardDeviation)}
                </div>
                <div style={styles.statLabel}>{t.voronoi.stats.standardDeviation}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default VoronoiStatisticsPanel;