/**
 * Utility functions for Voronoi diagram visualization
 * 
 * This file provides helper functions for color calculations,
 * severity determination, GeoJSON transformations, and statistics.
 */

import {
  VoronoiCell,
  VoronoiGeoJSON,
  VoronoiStatistics,
  CoverageGap,
  GapSeverity,
  GapThresholds,
  VoronoiColorConfig,
} from '@/types/voronoi.types';
import { Coordinates, GeoJSONFeatureCollection } from '@/types';

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default color configuration for Voronoi visualization
 */
export const DEFAULT_COLORS: VoronoiColorConfig = {
  smallArea: '#22c55e',    // Green - well covered
  mediumArea: '#eab308',   // Yellow - moderate coverage
  largeArea: '#f97316',    // Orange - poor coverage
  criticalArea: '#ef4444', // Red - critical gap
  selected: '#3b82f6',     // Blue - selected
  hover: '#8b5cf6',        // Purple - hover
  border: '#374151',       // Gray - border
};

/**
 * Default gap thresholds (in km²)
 */
export const DEFAULT_GAP_THRESHOLDS: GapThresholds = {
  low: 5,       // < 5 km² - well covered
  medium: 15,   // 5-15 km² - moderate
  high: 30,     // 15-30 km² - poor coverage
  critical: 50, // > 50 km² - critical gap
};

// ============================================================================
// Color Calculation Functions
// ============================================================================

/**
 * Get color based on cell area
 */
export function getColorByArea(
  area: number,
  thresholds: GapThresholds = DEFAULT_GAP_THRESHOLDS,
  colors: VoronoiColorConfig = DEFAULT_COLORS
): string {
  if (area < thresholds.low) {
    return colors.smallArea;
  } else if (area < thresholds.medium) {
    return colors.mediumArea;
  } else if (area < thresholds.high) {
    return colors.largeArea;
  }
  return colors.criticalArea;
}

/**
 * Get color based on severity level
 */
export function getColorBySeverity(
  severity: GapSeverity,
  colors: VoronoiColorConfig = DEFAULT_COLORS
): string {
  switch (severity) {
    case 'low':
      return colors.smallArea;
    case 'medium':
      return colors.mediumArea;
    case 'high':
      return colors.largeArea;
    case 'critical':
      return colors.criticalArea;
    default:
      return colors.mediumArea;
  }
}

/**
 * Interpolate between two colors based on a value
 */
export function interpolateColor(
  value: number,
  min: number,
  max: number,
  colorStart: string,
  colorEnd: string
): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  const startRGB = hexToRgb(colorStart);
  const endRGB = hexToRgb(colorEnd);
  
  if (!startRGB || !endRGB) return colorStart;
  
  const r = Math.round(startRGB.r + (endRGB.r - startRGB.r) * ratio);
  const g = Math.round(startRGB.g + (endRGB.g - startRGB.g) * ratio);
  const b = Math.round(startRGB.b + (endRGB.b - startRGB.b) * ratio);
  
  return rgbToHex(r, g, b);
}

/**
 * Generate a gradient color based on area
 */
export function getGradientColor(
  area: number,
  minArea: number,
  maxArea: number
): string {
  const colors = [
    { threshold: 0, color: '#22c55e' },    // Green
    { threshold: 0.25, color: '#84cc16' }, // Lime
    { threshold: 0.5, color: '#eab308' },  // Yellow
    { threshold: 0.75, color: '#f97316' }, // Orange
    { threshold: 1, color: '#ef4444' },    // Red
  ];
  
  const normalizedValue = (area - minArea) / (maxArea - minArea);
  
  for (let i = 0; i < colors.length - 1; i++) {
    if (normalizedValue <= colors[i + 1].threshold) {
      const ratio = (normalizedValue - colors[i].threshold) / 
                    (colors[i + 1].threshold - colors[i].threshold);
      return interpolateColor(ratio, 0, 1, colors[i].color, colors[i + 1].color);
    }
  }
  
  return colors[colors.length - 1].color;
}

// ============================================================================
// Severity Determination
// ============================================================================

/**
 * Determine gap severity based on area
 */
export function getSeverityByArea(
  area: number,
  thresholds: GapThresholds = DEFAULT_GAP_THRESHOLDS
): GapSeverity {
  if (area < thresholds.low) {
    return 'low';
  } else if (area < thresholds.medium) {
    return 'medium';
  } else if (area < thresholds.high) {
    return 'high';
  }
  return 'critical';
}

/**
 * Get severity label for display
 */
export function getSeverityLabel(severity: GapSeverity): string {
  const labels: Record<GapSeverity, string> = {
    low: 'Faible',
    medium: 'Modéré',
    high: 'Élevé',
    critical: 'Critique',
  };
  return labels[severity];
}

/**
 * Get severity icon name
 */
export function getSeverityIcon(severity: GapSeverity): string {
  const icons: Record<GapSeverity, string> = {
    low: 'check-circle',
    medium: 'alert-circle',
    high: 'alert-triangle',
    critical: 'x-circle',
  };
  return icons[severity];
}

/**
 * Check if a cell is a coverage gap
 */
export function isGap(
  area: number,
  threshold: number = DEFAULT_GAP_THRESHOLDS.medium
): boolean {
  return area >= threshold;
}

// ============================================================================
// GeoJSON Transformation Utilities
// ============================================================================

/**
 * Filter Voronoi cells by area range
 */
export function filterCellsByArea(
  data: VoronoiGeoJSON,
  minArea?: number,
  maxArea?: number
): VoronoiGeoJSON {
  const filteredFeatures = data.features.filter((cell) => {
    const area = cell.properties.area;
    if (minArea !== undefined && area < minArea) return false;
    if (maxArea !== undefined && area > maxArea) return false;
    return true;
  });

  return {
    ...data,
    features: filteredFeatures,
  };
}

/**
 * Filter Voronoi cells by administrative boundary
 */
export function filterCellsByAdmin(
  data: VoronoiGeoJSON,
  adminLevel: 'level1' | 'level2' | 'level3',
  adminValue: string
): VoronoiGeoJSON {
  const propertyMap = {
    level1: 'adminLevel1',
    level2: 'adminLevel2',
    level3: 'adminLevel3',
  };

  const property = propertyMap[adminLevel];
  
  const filteredFeatures = data.features.filter((cell) => {
    return cell.properties[property as keyof typeof cell.properties] === adminValue;
  });

  return {
    ...data,
    features: filteredFeatures,
  };
}

/**
 * Extract gaps from Voronoi data
 */
export function extractGaps(
  data: VoronoiGeoJSON,
  minArea: number = DEFAULT_GAP_THRESHOLDS.medium
): CoverageGap[] {
  return data.features
    .filter((cell) => cell.properties.area >= minArea)
    .map((cell) => ({
      cellId: cell.properties.cellId,
      center: cell.properties.center,
      area: cell.properties.area,
      severity: getSeverityByArea(cell.properties.area),
      adminLocation: {
        level1: cell.properties.adminLevel1,
        level2: cell.properties.adminLevel2,
        level3: cell.properties.adminLevel3,
      },
      nearestChurch: cell.properties.nearestChurchId ? {
        id: cell.properties.nearestChurchId,
        name: cell.properties.nearestChurchName || 'Unknown',
        distance: cell.properties.nearestChurchDistance || 0,
      } : undefined,
    }));
}

/**
 * Add severity information to Voronoi cells
 */
export function enrichWithSeverity(
  data: VoronoiGeoJSON,
  thresholds: GapThresholds = DEFAULT_GAP_THRESHOLDS
): VoronoiGeoJSON {
  const enrichedFeatures = data.features.map((cell) => ({
    ...cell,
    properties: {
      ...cell.properties,
      isGap: isGap(cell.properties.area, thresholds.medium),
      gapSeverity: getSeverityByArea(cell.properties.area, thresholds),
    },
  }));

  return {
    ...data,
    features: enrichedFeatures,
  };
}

/**
 * Convert Voronoi data to standard GeoJSON
 */
export function toStandardGeoJSON(data: VoronoiGeoJSON): GeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: data.features.map((cell) => ({
      type: 'Feature',
      geometry: cell.geometry,
      properties: cell.properties,
      id: cell.properties.cellId,
    })),
  };
}

// ============================================================================
// Statistics Calculations
// ============================================================================

/**
 * Calculate statistics from Voronoi data
 */
export function calculateStatistics(data: VoronoiGeoJSON): VoronoiStatistics {
  const areas = data.features.map((cell) => cell.properties.area);
  
  if (areas.length === 0) {
    return {
      totalCells: 0,
      totalArea: 0,
      averageArea: 0,
      medianArea: 0,
      minArea: 0,
      maxArea: 0,
      standardDeviation: 0,
      coveragePercentage: 0,
      gapCount: { total: 0, low: 0, medium: 0, high: 0, critical: 0 },
      areaDistribution: [],
    };
  }

  const sortedAreas = [...areas].sort((a, b) => a - b);
  const totalArea = areas.reduce((sum, area) => sum + area, 0);
  const averageArea = totalArea / areas.length;
  
  // Calculate median
  const midIndex = Math.floor(sortedAreas.length / 2);
  const medianArea = sortedAreas.length % 2 === 0
    ? (sortedAreas[midIndex - 1] + sortedAreas[midIndex]) / 2
    : sortedAreas[midIndex];

  // Calculate standard deviation
  const squaredDiffs = areas.map((area) => Math.pow(area - averageArea, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / areas.length;
  const standardDeviation = Math.sqrt(avgSquaredDiff);

  // Count gaps by severity
  const gapCount = {
    total: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  data.features.forEach((cell) => {
    const severity = getSeverityByArea(cell.properties.area);
    if (severity !== 'low') {
      gapCount.total++;
    }
    gapCount[severity]++;
  });

  // Calculate area distribution
  const ranges = [
    { min: 0, max: 5, label: '0-5 km²' },
    { min: 5, max: 15, label: '5-15 km²' },
    { min: 15, max: 30, label: '15-30 km²' },
    { min: 30, max: 50, label: '30-50 km²' },
    { min: 50, max: Infinity, label: '50+ km²' },
  ];

  const areaDistribution = ranges.map((range) => {
    const count = areas.filter((area) => area >= range.min && area < range.max).length;
    return {
      range: range.label,
      count,
      percentage: (count / areas.length) * 100,
    };
  });

  // Calculate coverage percentage (cells with area < medium threshold)
  const wellCoveredCells = areas.filter((area) => area < DEFAULT_GAP_THRESHOLDS.medium).length;
  const coveragePercentage = (wellCoveredCells / areas.length) * 100;

  return {
    totalCells: areas.length,
    totalArea,
    averageArea,
    medianArea,
    minArea: sortedAreas[0],
    maxArea: sortedAreas[sortedAreas.length - 1],
    standardDeviation,
    coveragePercentage,
    gapCount,
    areaDistribution,
  };
}

/**
 * Calculate statistics for a specific region
 */
export function calculateRegionalStatistics(
  data: VoronoiGeoJSON,
  adminLevel: 'level1' | 'level2' | 'level3'
): Map<string, VoronoiStatistics> {
  const propertyMap = {
    level1: 'adminLevel1',
    level2: 'adminLevel2',
    level3: 'adminLevel3',
  };

  const property = propertyMap[adminLevel] as keyof VoronoiCell['properties'];
  const regionMap = new Map<string, VoronoiCell[]>();

  // Group cells by region
  data.features.forEach((cell) => {
    const regionName = cell.properties[property] as string || 'Unknown';
    if (!regionMap.has(regionName)) {
      regionMap.set(regionName, []);
    }
    regionMap.get(regionName)!.push(cell);
  });

  // Calculate statistics for each region
  const statsMap = new Map<string, VoronoiStatistics>();
  
  regionMap.forEach((cells, regionName) => {
    const regionData: VoronoiGeoJSON = {
      type: 'FeatureCollection',
      features: cells,
    };
    statsMap.set(regionName, calculateStatistics(regionData));
  });

  return statsMap;
}

// ============================================================================
// Geometry Utilities
// ============================================================================

/**
 * Calculate the centroid of a polygon
 */
export function calculateCentroid(coordinates: Coordinates[][]): Coordinates {
  const ring = coordinates[0]; // Use outer ring
  let sumX = 0;
  let sumY = 0;
  let area = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    sumX += (x1 + x2) * cross;
    sumY += (y1 + y2) * cross;
  }

  area /= 2;
  const factor = 1 / (6 * area);

  return [sumX * factor, sumY * factor];
}

/**
 * Calculate polygon area in square kilometers
 */
export function calculatePolygonArea(coordinates: Coordinates[][]): number {
  const ring = coordinates[0];
  let area = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    
    // Shoelace formula with spherical correction
    area += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
  }

  // Earth's radius in km
  const R = 6371;
  area = Math.abs(area * R * R / 2);

  return area;
}

/**
 * Check if a point is inside a polygon
 */
export function pointInPolygon(point: Coordinates, polygon: Coordinates[][]): boolean {
  const [x, y] = point;
  const ring = polygon[0];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format area for display
 */
export function formatArea(area: number, decimals: number = 2): string {
  if (area < 1) {
    return `${(area * 1000000).toFixed(0)} m²`;
  }
  return `${area.toFixed(decimals)} km²`;
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number, decimals: number = 1): string {
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  }
  return `${distance.toFixed(decimals)} km`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: Coordinates, decimals: number = 6): string {
  return `${coords[1].toFixed(decimals)}°N, ${coords[0].toFixed(decimals)}°E`;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Colors
  DEFAULT_COLORS,
  DEFAULT_GAP_THRESHOLDS,
  getColorByArea,
  getColorBySeverity,
  interpolateColor,
  getGradientColor,
  
  // Severity
  getSeverityByArea,
  getSeverityLabel,
  getSeverityIcon,
  isGap,
  
  // GeoJSON
  filterCellsByArea,
  filterCellsByAdmin,
  extractGaps,
  enrichWithSeverity,
  toStandardGeoJSON,
  
  // Statistics
  calculateStatistics,
  calculateRegionalStatistics,
  
  // Geometry
  calculateCentroid,
  calculatePolygonArea,
  pointInPolygon,
  
  // Formatting
  formatArea,
  formatDistance,
  formatPercentage,
  formatCoordinates,
};
