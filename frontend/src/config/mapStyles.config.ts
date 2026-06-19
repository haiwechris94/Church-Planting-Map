/**
 * Configuration des styles de carte pour l'application Church Planting Map
 * 
 * Ce fichier définit les palettes de couleurs, les styles de base,
 * et les configurations visuelles pour les différentes couches.
 */

/**
 * Palette de couleurs pour les niveaux administratifs
 */
export const adminColors = {
  level1: {
    // Régions
    fill: '#3388ff',
    stroke: '#0066cc',
    hover: '#5599ff',
  },
  level2: {
    // Divisions
    fill: '#51cf66',
    stroke: '#2f9e44',
    hover: '#69db7c',
  },
  level3: {
    // Subdivisions
    fill: '#ffd43b',
    stroke: '#fab005',
    hover: '#ffe066',
  },
};

/**
 * Palette de couleurs pour les villages
 */
export const villageColors = {
  point: {
    default: '#ff6b6b',
    hover: '#ff8787',
    selected: '#fa5252',
    withChurch: '#51cf66',
    withoutChurch: '#ff6b6b',
  },
  polygon: {
    fill: '#51cf66',
    stroke: '#2f9e44',
    hover: '#69db7c',
  },
};

/**
 * Palette de couleurs pour les diagrammes de Voronoi
 */
export const voronoiColors = {
  osm: {
    fill: '#845ef7',
    stroke: '#5f3dc4',
    hover: '#9775fa',
  },
  custom: {
    fill: '#ffd43b',
    stroke: '#fab005',
    hover: '#ffe066',
  },
};

/**
 * Styles de base pour les différents types de géométries
 */
export const baseStyles = {
  point: {
    radius: 6,
    fillOpacity: 1,
    strokeWidth: 2,
    strokeColor: '#ffffff',
    strokeOpacity: 1,
  },
  polygon: {
    fillOpacity: 0.3,
    strokeWidth: 1.5,
    strokeOpacity: 0.8,
  },
  multipolygon: {
    fillOpacity: 0.1,
    strokeWidth: 2,
    strokeOpacity: 0.6,
  },
};

/**
 * Styles pour les états interactifs
 */
export const interactionStyles = {
  hover: {
    fillOpacity: 0.5,
    strokeWidth: 3,
    cursor: 'pointer',
  },
  selected: {
    fillOpacity: 0.6,
    strokeWidth: 4,
    strokeColor: '#000000',
  },
  disabled: {
    fillOpacity: 0.1,
    strokeOpacity: 0.3,
    cursor: 'not-allowed',
  },
};

/**
 * Configuration des popups
 */
export const popupStyles = {
  maxWidth: 300,
  minWidth: 200,
  className: 'custom-popup',
  closeButton: true,
  autoClose: false,
  closeOnClick: false,
};

/**
 * Configuration des tooltips
 */
export const tooltipStyles = {
  permanent: false,
  direction: 'top' as const,
  offset: [0, -10] as [number, number],
  opacity: 0.9,
  className: 'custom-tooltip',
};

/**
 * Styles pour les clusters de villages
 */
export const clusterStyles = {
  small: {
    // < 10 villages
    radius: 20,
    fillColor: '#51cf66',
    strokeColor: '#2f9e44',
    textColor: '#ffffff',
  },
  medium: {
    // 10-50 villages
    radius: 30,
    fillColor: '#ffd43b',
    strokeColor: '#fab005',
    textColor: '#000000',
  },
  large: {
    // > 50 villages
    radius: 40,
    fillColor: '#ff6b6b',
    strokeColor: '#fa5252',
    textColor: '#ffffff',
  },
};

/**
 * Configuration des icônes personnalisées
 */
export const customIcons = {
  village: {
    iconUrl: '/icons/village-marker.svg',
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 32] as [number, number],
    popupAnchor: [0, -32] as [number, number],
  },
  church: {
    iconUrl: '/icons/church-marker.svg',
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 32] as [number, number],
    popupAnchor: [0, -32] as [number, number],
  },
  plannedChurch: {
    iconUrl: '/icons/planned-church-marker.svg',
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 32] as [number, number],
    popupAnchor: [0, -32] as [number, number],
  },
};

/**
 * Fonction pour obtenir la couleur en fonction de la densité
 */
export function getDensityColor(density: number): string {
  if (density > 100) return '#800026';
  if (density > 50) return '#bd0026';
  if (density > 20) return '#e31a1c';
  if (density > 10) return '#fc4e2a';
  if (density > 5) return '#fd8d3c';
  if (density > 2) return '#feb24c';
  if (density > 1) return '#fed976';
  return '#ffeda0';
}

/**
 * Fonction pour obtenir la couleur en fonction de l'aire (km²)
 */
export function getAreaColor(area: number): string {
  if (area > 10000) return '#800026';
  if (area > 5000) return '#bd0026';
  if (area > 2000) return '#e31a1c';
  if (area > 1000) return '#fc4e2a';
  if (area > 500) return '#fd8d3c';
  if (area > 200) return '#feb24c';
  if (area > 100) return '#fed976';
  return '#ffeda0';
}

/**
 * Fonction pour obtenir l'opacité en fonction du zoom
 */
export function getOpacityByZoom(zoom: number): number {
  if (zoom < 7) return 0.1;
  if (zoom < 9) return 0.2;
  if (zoom < 11) return 0.3;
  if (zoom < 13) return 0.4;
  return 0.5;
}

/**
 * Fonction pour obtenir l'épaisseur de trait en fonction du zoom
 */
export function getStrokeWidthByZoom(zoom: number): number {
  if (zoom < 7) return 0.5;
  if (zoom < 9) return 1;
  if (zoom < 11) return 1.5;
  if (zoom < 13) return 2;
  return 2.5;
}

/**
 * Configuration des légendes
 */
export const legendConfig = {
  position: 'bottomright' as const,
  title: 'Légende',
  collapsed: false,
  items: [
    {
      label: 'Régions',
      color: adminColors.level1.fill,
      type: 'polygon' as const,
    },
    {
      label: 'Divisions',
      color: adminColors.level2.fill,
      type: 'polygon' as const,
    },
    {
      label: 'Subdivisions',
      color: adminColors.level3.fill,
      type: 'polygon' as const,
    },
    {
      label: 'Villages',
      color: villageColors.point.default,
      type: 'point' as const,
    },
    {
      label: 'Villages avec église',
      color: villageColors.point.withChurch,
      type: 'point' as const,
    },
    {
      label: 'Zones Voronoi',
      color: voronoiColors.custom.fill,
      type: 'polygon' as const,
    },
  ],
};

/**
 * Export de toutes les configurations de style
 */
export const mapStyles = {
  adminColors,
  villageColors,
  voronoiColors,
  baseStyles,
  interactionStyles,
  popupStyles,
  tooltipStyles,
  clusterStyles,
  customIcons,
  legendConfig,
};

export default mapStyles;
