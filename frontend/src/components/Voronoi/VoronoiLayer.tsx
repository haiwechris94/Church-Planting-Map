/**
 * VoronoiLayer Component
 * 
 * Renders Voronoi cells as polygons on a Leaflet map with
 * color coding by area, interactive hover effects, and click handlers.
 */

import React, { useCallback, useMemo } from 'react';
import { GeoJSON, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import {
  VoronoiLayerProps,
  VoronoiCell,
  VoronoiGeoJSON,
} from '@/types/voronoi.types';
import {
  getColorByArea,
  getColorBySeverity,
  DEFAULT_COLORS,
  DEFAULT_GAP_THRESHOLDS,
} from '@/utils/voronoiUtils';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    position: 'relative' as const,
  },
  label: {
    fontSize: '10px',
    fontWeight: 'bold' as const,
    color: '#374151',
    textShadow: '1px 1px 2px white, -1px -1px 2px white',
  },
};

// ============================================================================
// Component
// ============================================================================

export const VoronoiLayer: React.FC<VoronoiLayerProps> = ({
  data,
  visible = true,
  opacity = 0.6,
  selectedCellId = null,
  onCellClick,
  onCellHover,
  colorScale = 'area',
  customColorFn,
  showLabels = false,
  interactive = true,
}) => {
  const map = useMap();

  // ============================================================================
  // Color Calculation
  // ============================================================================

  /**
   * Get fill color for a cell based on the color scale
   */
  const getCellColor = useCallback((cell: VoronoiCell): string => {
    if (customColorFn) {
      return customColorFn(cell);
    }

    switch (colorScale) {
      case 'severity':
        return cell.properties.gapSeverity
          ? getColorBySeverity(cell.properties.gapSeverity)
          : getColorByArea(cell.properties.area);
      case 'area':
      default:
        return getColorByArea(cell.properties.area);
    }
  }, [colorScale, customColorFn]);

  // ============================================================================
  // Style Functions
  // ============================================================================

  /**
   * Get style for a cell
   */
  const getStyle = useCallback((feature: GeoJSON.Feature | undefined) => {
    if (!feature) return {};

    const cell = feature as unknown as VoronoiCell;
    const isSelected = cell.properties.cellId === selectedCellId;
    const fillColor = getCellColor(cell);

    return {
      fillColor: isSelected ? DEFAULT_COLORS.selected : fillColor,
      fillOpacity: isSelected ? 0.8 : opacity,
      color: isSelected ? DEFAULT_COLORS.selected : DEFAULT_COLORS.border,
      weight: isSelected ? 3 : 1,
      opacity: 1,
    };
  }, [selectedCellId, opacity, getCellColor]);

  /**
   * Get hover style for a cell
   */
  const getHoverStyle = useCallback(() => ({
    fillOpacity: 0.8,
    weight: 2,
    color: DEFAULT_COLORS.hover,
  }), []);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle feature events
   */
  const onEachFeature = useCallback((
    feature: GeoJSON.Feature,
    layer: L.Layer
  ) => {
    if (!interactive) return;

    const cell = feature as unknown as VoronoiCell;
    const pathLayer = layer as L.Path;
    let originalStyle: L.PathOptions;

    // Store original style
    if (pathLayer.options) {
      originalStyle = { ...pathLayer.options };
    }

    // Mouse events
    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        const target = e.target as L.Path;
        target.setStyle(getHoverStyle());
        target.bringToFront();
        onCellHover?.(cell);
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const target = e.target as L.Path;
        if (originalStyle) {
          target.setStyle(originalStyle);
        }
        onCellHover?.(null);
      },
      click: () => {
        onCellClick?.(cell);
      },
    });

    // Add tooltip
    const tooltipContent = `
      <div style="padding: 4px;">
        <strong>${cell.properties.pointName || 'Cell'}</strong><br/>
        Area: ${cell.properties.area.toFixed(2)} km²
      </div>
    `;

    layer.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'top',
      className: 'voronoi-tooltip',
    });
  }, [interactive, onCellClick, onCellHover, getHoverStyle]);

  // ============================================================================
  // Labels Layer
  // ============================================================================

  /**
   * Create labels for cells
   */
  const labelsLayer = useMemo(() => {
    if (!showLabels || !data) return null;

    return data.features.map((cell) => {
      const center = cell.properties.center;
      const label = cell.properties.pointName || cell.properties.cellId;

      return (
        <Marker
          key={`label-${cell.properties.cellId}`}
          position={[center[1], center[0]]}
          icon={L.divIcon({
            className: 'voronoi-label',
            html: `<span style="${Object.entries(styles.label).map(([k, v]) => `${k}:${v}`).join(';')}">${label}</span>`,
            iconSize: [100, 20],
            iconAnchor: [50, 10],
          })}
        />
      );
    });
  }, [showLabels, data]);

  // ============================================================================
  // Render
  // ============================================================================

  if (!visible || !data || data.features.length === 0) {
    return null;
  }

  return (
    <>
      <GeoJSON
        key={`voronoi-${selectedCellId}-${colorScale}`}
        data={data as GeoJSON.GeoJsonObject}
        style={getStyle}
        onEachFeature={onEachFeature}
      />
      {labelsLayer}
    </>
  );
};

// ============================================================================
// CSS Styles (to be added to your stylesheet)
// ============================================================================

/*
Add these styles to your CSS file:

.voronoi-tooltip {
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.voronoi-tooltip .leaflet-tooltip-content {
  margin: 0;
}

.voronoi-label {
  background: transparent;
  border: none;
  text-align: center;
}

.voronoi-cell-selected {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 0.5;
  }
}
*/

// ============================================================================
// Default Export
// ============================================================================

export default VoronoiLayer;
