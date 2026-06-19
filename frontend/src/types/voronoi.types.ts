/**
 * TypeScript interfaces for Voronoi diagram visualization
 * 
 * This file defines all types related to Voronoi diagrams,
 * coverage gaps, and related components.
 */

import { Coordinates, GeoJSONFeature, GeoJSONFeatureCollection } from './index';

// ============================================================================
// Core Voronoi Types
// ============================================================================

/**
 * Severity levels for coverage gaps
 */
export type GapSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Voronoi diagram metadata
 */
export interface VoronoiDiagram {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  pointCount: number;
  cellCount: number;
  boundingBox: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
  sourceType: 'churches' | 'villages' | 'custom';
  adminBoundary?: string;
}

/**
 * Extended properties for a Voronoi cell
 */
export interface VoronoiCellProperties {
  cellId: string;
  pointId: string;
  pointName: string;
  center: Coordinates;
  area: number; // in square kilometers
  perimeter?: number;
  neighborCount?: number;
  neighborIds?: string[];
  adminLevel1?: string;
  adminLevel2?: string;
  adminLevel3?: string;
  isGap: boolean;
  gapSeverity?: GapSeverity;
  nearestChurchId?: string;
  nearestChurchName?: string;
  nearestChurchDistance?: number; // in kilometers
  population?: number;
  populationDensity?: number;
}

/**
 * Voronoi cell feature
 */
export interface VoronoiCell extends GeoJSONFeature {
  geometry: {
    type: 'Polygon';
    coordinates: Coordinates[][];
  };
  properties: VoronoiCellProperties;
}

/**
 * Voronoi diagram GeoJSON collection
 */
export interface VoronoiGeoJSON extends GeoJSONFeatureCollection {
  features: VoronoiCell[];
  metadata?: {
    diagramId: string;
    generatedAt: string;
    statistics: VoronoiStatistics;
  };
}

// ============================================================================
// Coverage Gap Types
// ============================================================================

/**
 * Coverage gap information
 */
export interface CoverageGap {
  cellId: string;
  center: Coordinates;
  area: number;
  severity: GapSeverity;
  adminLocation: {
    level1?: string;
    level2?: string;
    level3?: string;
  };
  recommendation?: string;
  nearestChurch?: {
    id: string;
    name: string;
    distance: number;
  };
}

/**
 * Gap threshold configuration
 */
export interface GapThresholds {
  low: number;      // Area threshold for low severity (km²)
  medium: number;   // Area threshold for medium severity (km²)
  high: number;     // Area threshold for high severity (km²)
  critical: number; // Area threshold for critical severity (km²)
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Voronoi diagram statistics
 */
export interface VoronoiStatistics {
  totalCells: number;
  totalArea: number;
  averageArea: number;
  medianArea: number;
  minArea: number;
  maxArea: number;
  standardDeviation: number;
  coveragePercentage: number;
  gapCount: {
    total: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  areaDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

/**
 * Statistics by administrative region
 */
export interface RegionalStatistics {
  regionName: string;
  regionId: string;
  cellCount: number;
  totalArea: number;
  averageArea: number;
  gapCount: number;
  coveragePercentage: number;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Query parameters for fetching Voronoi data
 */
export interface VoronoiQueryParams {
  diagramId?: string;
  adminLevel1?: string;
  adminLevel2?: string;
  adminLevel3?: string;
  minArea?: number;
  maxArea?: number;
  includeGapsOnly?: boolean;
  severity?: GapSeverity[];
  limit?: number;
  offset?: number;
}

/**
 * Parameters for generating a new Voronoi diagram
 */
export interface VoronoiGenerateParams {
  name: string;
  description?: string;
  sourceType: 'churches' | 'villages' | 'custom';
  customPoints?: {
    id: string;
    name: string;
    coordinates: Coordinates;
  }[];
  boundingBox?: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
  adminBoundary?: string;
  clipToBoundary?: boolean;
}

/**
 * API response for Voronoi endpoints
 */
export interface VoronoiApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    processingTime?: number;
  };
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for VoronoiLayer component
 */
export interface VoronoiLayerProps {
  data: VoronoiGeoJSON | null;
  visible?: boolean;
  opacity?: number;
  selectedCellId?: string | null;
  onCellClick?: (cell: VoronoiCell) => void;
  onCellHover?: (cell: VoronoiCell | null) => void;
  colorScale?: 'area' | 'severity' | 'custom';
  customColorFn?: (cell: VoronoiCell) => string;
  showLabels?: boolean;
  interactive?: boolean;
}

/**
 * Props for VoronoiControls component
 */
export interface VoronoiControlsProps {
  diagrams: VoronoiDiagram[];
  selectedDiagramId: string | null;
  onDiagramSelect: (diagramId: string) => void;
  showGaps: boolean;
  onShowGapsChange: (show: boolean) => void;
  minGapArea: number;
  onMinGapAreaChange: (area: number) => void;
  adminFilters: {
    level1: string | null;
    level2: string | null;
    level3: string | null;
  };
  onAdminFilterChange: (level: 'level1' | 'level2' | 'level3', value: string | null) => void;
  onGenerateNew: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Props for VoronoiStatisticsPanel component
 */
export interface VoronoiStatisticsPanelProps {
  statistics: VoronoiStatistics | null;
  isLoading?: boolean;
  onExport?: (format: 'json' | 'csv') => void;
  showCharts?: boolean;
  compact?: boolean;
}

/**
 * Props for VoronoiCellPopup component
 */
export interface VoronoiCellPopupProps {
  cell: VoronoiCell | null;
  position?: Coordinates;
  onClose?: () => void;
  onNavigateToChurch?: (churchId: string) => void;
  showRecommendation?: boolean;
}

/**
 * Props for CoverageGapsLayer component
 */
export interface CoverageGapsLayerProps {
  gaps: CoverageGap[];
  visible?: boolean;
  minSeverity?: GapSeverity;
  showMarkers?: boolean;
  showOverlay?: boolean;
  animateCritical?: boolean;
  onGapClick?: (gap: CoverageGap) => void;
}

/**
 * Props for VoronoiMapContainer component
 */
export interface VoronoiMapContainerProps {
  initialDiagramId?: string;
  showControls?: boolean;
  showStatistics?: boolean;
  showGapsLayer?: boolean;
  onCellSelect?: (cell: VoronoiCell | null) => void;
  onGapSelect?: (gap: CoverageGap | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useVoronoi hook
 */
export interface UseVoronoiReturn {
  // Data
  diagrams: VoronoiDiagram[];
  currentDiagram: VoronoiDiagram | null;
  voronoiData: VoronoiGeoJSON | null;
  statistics: VoronoiStatistics | null;
  gaps: CoverageGap[];
  
  // State
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  fetchDiagrams: () => Promise<void>;
  selectDiagram: (diagramId: string) => Promise<void>;
  generateDiagram: (params: VoronoiGenerateParams) => Promise<VoronoiDiagram>;
  deleteDiagram: (diagramId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
  
  // Filters
  filters: VoronoiQueryParams;
  setFilters: (filters: Partial<VoronoiQueryParams>) => void;
  resetFilters: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Color configuration for Voronoi visualization
 */
export interface VoronoiColorConfig {
  smallArea: string;    // Green - well covered
  mediumArea: string;   // Yellow - moderate coverage
  largeArea: string;    // Orange - poor coverage
  criticalArea: string; // Red - critical gap
  selected: string;     // Highlight color
  hover: string;        // Hover color
  border: string;       // Cell border color
}

/**
 * Animation configuration for gaps
 */
export interface GapAnimationConfig {
  enabled: boolean;
  duration: number;      // milliseconds
  minOpacity: number;
  maxOpacity: number;
  pulseScale: number;
}

/**
 * Export options for statistics
 */
export interface StatisticsExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeCharts: boolean;
  includeRawData: boolean;
  filename?: string;
}
