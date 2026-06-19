import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  VORONOI_ZOOM_CONFIG, 
  getVoronoiLevelForZoom, 
  shouldShowVoronoiAtLevel 
} from '../../config/countryConfig';

// Status colors matching VillageStatusLayer
const STATUS_COLORS = {
  'pas-d-information': '#9ca3af', // Gray (no people groups)
  unreached: '#ef4444',           // Red (≥90% unreached people groups)
  pioneer: '#eab308',             // Yellow
  midway: '#3b82f6',              // Blue
  'tipping-point': '#f97316',     // Orange
  dmm: '#22c55e'                  // Green
};

// Status display names
const STATUS_DISPLAY_NAMES = {
  'pas-d-information': "Pas d'information",
  unreached: 'Unreached',
  pioneer: 'Pioneer',
  midway: 'Midway',
  'tipping-point': 'Tipping Point',
  dmm: 'DMM'
};

/**
 * ZoomAwareVoronoiLayer Component
 * 
 * Displays Voronoi polygons at different administrative levels based on zoom:
 * - Village level: Zoom >= 10
 * - Arrondissement level: Zoom = 9
 * - Département level: Zoom = 7 or 8
 * - Region level: Zoom <= 6
 * 
 * Polygons are colored based on their status property:
 * - pas-d-information: Gray (no people groups)
 * - unreached: Red
 * - pioneer: Yellow
 * - midway: Blue
 * - tipping-point: Orange
 * - dmm: Green
 * 
 * @param {Object} props
 * @param {Object} props.villageVoronoiData - GeoJSON data for village-level Voronoi
 * @param {Object} props.arrondissementVoronoiData - GeoJSON data for arrondissement-level Voronoi
 * @param {Object} props.departementVoronoiData - GeoJSON data for département-level Voronoi
 * @param {Object} props.regionVoronoiData - GeoJSON data for region-level Voronoi
 * @param {Object} props.villageStatuses - Map of village name to status data
 * @param {boolean} props.visible - Whether the layer is visible
 * @param {string} props.colorMode - 'status' for status-based coloring, 'area' for area-based
 * @param {Object} props.style - Custom style overrides
 * @param {function} props.onPolygonClick - Callback when a polygon is clicked
 * @param {function} props.onLevelChange - Callback when the display level changes
 * @param {function} props.onZoomChange - Callback when zoom level changes
 */
const ZoomAwareVoronoiLayer = ({
  villageVoronoiData,
  arrondissementVoronoiData,
  departementVoronoiData,
  regionVoronoiData,
  villageStatuses = {},
  visible = true,
  colorMode = 'status',
  style = {},
  onPolygonClick,
  onLevelChange,
  onZoomChange,
}) => {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  const [currentLevel, setCurrentLevel] = useState(null);
  const [layerRef, setLayerRef] = useState(null);

  // Track zoom changes
  useEffect(() => {
    const handleZoomEnd = () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
      onZoomChange?.(newZoom);
    };

    map.on('zoomend', handleZoomEnd);
    return () => map.off('zoomend', handleZoomEnd);
  }, [map, onZoomChange]);

  // Determine which level to display based on zoom
  const displayLevel = useMemo(() => {
    return getVoronoiLevelForZoom(currentZoom);
  }, [currentZoom]);

  // Notify parent of level changes
  useEffect(() => {
    if (displayLevel !== currentLevel) {
      setCurrentLevel(displayLevel);
      onLevelChange?.(displayLevel);
    }
  }, [displayLevel, currentLevel, onLevelChange]);

  // Get the appropriate data for the current level
  const currentData = useMemo(() => {
    switch (displayLevel) {
      case 'village':
        return villageVoronoiData;
      case 'arrondissement':
        return arrondissementVoronoiData;
      case 'departement':
        return departementVoronoiData;
      case 'region':
        return regionVoronoiData;
      default:
        return null;
    }
  }, [displayLevel, villageVoronoiData, arrondissementVoronoiData, departementVoronoiData, regionVoronoiData]);

  // Base style configuration for each level
  const levelStyles = useMemo(() => ({
    village: {
      fillOpacity: 0.4,
      weight: 1,
      opacity: 0.8,
      ...style.village,
    },
    arrondissement: {
      fillOpacity: 0.35,
      weight: 1.5,
      opacity: 0.8,
      ...style.arrondissement,
    },
    departement: {
      fillOpacity: 0.3,
      weight: 2,
      opacity: 0.8,
      ...style.departement,
    },
    region: {
      fillOpacity: 0.25,
      weight: 2.5,
      opacity: 0.8,
      ...style.region,
    },
  }), [style]);

  // Get status color for a feature
  const getStatusColor = useCallback((feature) => {
    const props = feature?.properties || {};
    
    // Try to get status from feature properties first
    let status = props.status;
    
    // If no status in properties, try to look up from villageStatuses
    if (!status && villageStatuses) {
      const villageName = props.village_name || props.name || props.NAME || '';
      const villageStatus = villageStatuses[villageName];
      status = villageStatus?.status;
    }
    
    // Return color based on status, default to gray
    return STATUS_COLORS[status] || STATUS_COLORS['pas-d-information'];
  }, [villageStatuses]);

  // Get area-based color for a feature
  const getAreaColor = useCallback((feature) => {
    const area = feature?.properties?.area || 0;
    
    if (area > 100) return '#ef4444'; // Large - red
    if (area > 50) return '#f97316';  // Medium-large - orange
    if (area > 20) return '#eab308';  // Medium - yellow
    if (area > 10) return '#22c55e';  // Small-medium - green
    return '#3b82f6';                  // Small - blue
  }, []);

  // Get style for a feature
  const getStyle = useCallback((feature) => {
    const baseStyle = levelStyles[displayLevel] || levelStyles.village;
    
    // Determine fill color based on color mode
    const fillColor = colorMode === 'status' 
      ? getStatusColor(feature) 
      : getAreaColor(feature);
    
    return { 
      ...baseStyle, 
      fillColor,
      color: fillColor, // Border color matches fill
      interactive: true,
    };
  }, [displayLevel, levelStyles, colorMode, getStatusColor, getAreaColor]);

  // Create and manage the layer
  useEffect(() => {
    if (!map || !visible || !currentData?.features?.length) {
      // Remove existing layer if conditions not met
      if (layerRef) {
        map.removeLayer(layerRef);
        setLayerRef(null);
      }
      return;
    }

    // Remove existing layer before creating new one
    if (layerRef) {
      map.removeLayer(layerRef);
    }

    const levelConfig = VORONOI_ZOOM_CONFIG[displayLevel];
    const levelLabel = levelConfig?.label || displayLevel;

    const layer = L.geoJSON(currentData, {
      style: getStyle,
      onEachFeature: (feature, featureLayer) => {
        const props = feature.properties || {};
        const villageName = props.village_name || props.name || props.point_name || props.NAME || 'Polygone Voronoi';
        const area = props.area ? `${props.area.toFixed(2)} km²` : 'N/A';
        
        // Get status information
        let status = props.status;
        let statusData = null;
        
        if (!status && villageStatuses) {
          statusData = villageStatuses[villageName];
          status = statusData?.status;
        }
        
        const statusDisplay = STATUS_DISPLAY_NAMES[status] || status || "Pas d'information";
        const statusColor = STATUS_COLORS[status] || STATUS_COLORS['pas-d-information'];

        // Build popup content
        let popupContent = `
          <div class="p-3 min-w-[200px]">
            <h3 class="font-bold text-sm mb-2">${villageName}</h3>
            <div class="space-y-1 text-xs">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" style="background-color: ${statusColor}"></span>
                <span class="font-medium">${statusDisplay}</span>
              </div>
              <p><strong>Niveau:</strong> ${levelLabel}</p>
              <p><strong>Surface:</strong> ${area}</p>
        `;
        
        // Add status breakdown if available
        if (statusData?.totalPeoples !== undefined) {
          popupContent += `<p><strong>Groupes de peuples:</strong> ${statusData.totalPeoples}</p>`;
        }
        
        if (props.population) {
          popupContent += `<p><strong>Population:</strong> ${props.population.toLocaleString()}</p>`;
        }
        
        // Add status breakdown percentages if available
        if (statusData?.percentages) {
          const pct = statusData.percentages;
          popupContent += `
            <div class="mt-2 pt-2 border-t border-gray-200">
              <p class="font-medium text-gray-700 mb-1">Répartition:</p>
              <div class="space-y-0.5">
                <p><span class="inline-block w-2 h-2 rounded-full mr-1" style="background-color: ${STATUS_COLORS.dmm}"></span>DMM: ${pct.dmm || 0}%</p>
                <p><span class="inline-block w-2 h-2 rounded-full mr-1" style="background-color: ${STATUS_COLORS['tipping-point']}"></span>Tipping Point: ${pct.tippingPoint || 0}%</p>
                <p><span class="inline-block w-2 h-2 rounded-full mr-1" style="background-color: ${STATUS_COLORS.midway}"></span>Midway: ${pct.midway || 0}%</p>
                <p><span class="inline-block w-2 h-2 rounded-full mr-1" style="background-color: ${STATUS_COLORS.pioneer}"></span>Pioneer: ${pct.pioneer || 0}%</p>
                <p><span class="inline-block w-2 h-2 rounded-full mr-1" style="background-color: ${STATUS_COLORS.unreached}"></span>Unreached: ${pct.unreached || 0}%</p>
              </div>
            </div>
          `;
        }
        
        popupContent += '</div></div>';

        featureLayer.bindPopup(popupContent);

        featureLayer.on({
          mouseover: (e) => {
            e.target.setStyle({
              fillOpacity: 0.5,
              weight: (levelStyles[displayLevel]?.weight || 1) + 1,
            });
          },
          mouseout: (e) => {
            featureLayer.setStyle(getStyle(feature));
          },
          click: (e) => {
            L.DomEvent.stopPropagation(e);
            if (e.originalEvent) e.originalEvent.stopPropagation();
            featureLayer.openPopup(e.latlng);
            onPolygonClick?.(feature, displayLevel);
          },
        });
      },
    });

    layer.addTo(map);
    setLayerRef(layer);

    return () => {
      if (layer) {
        map.removeLayer(layer);
      }
    };
  }, [map, visible, currentData, displayLevel, getStyle, levelStyles, onPolygonClick, villageStatuses]);

  return null;
};

/**
 * VoronoiLevelIndicator Component
 * 
 * Displays the current Voronoi level based on zoom
 */
export const VoronoiLevelIndicator = ({ currentLevel, currentZoom }) => {
  if (!currentLevel) return null;

  const levelConfig = VORONOI_ZOOM_CONFIG[currentLevel];
  const levelColors = {
    village: 'bg-blue-100 text-blue-700 border-blue-300',
    arrondissement: 'bg-violet-100 text-violet-700 border-violet-300',
    departement: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    region: 'bg-amber-100 text-amber-700 border-amber-300',
  };

  return (
    <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${levelColors[currentLevel] || 'bg-gray-100 text-gray-700'}`}>
      <span>Voronoi: {levelConfig?.label || currentLevel}</span>
      <span className="ml-2 opacity-70">(Zoom {currentZoom})</span>
    </div>
  );
};

export default ZoomAwareVoronoiLayer;
