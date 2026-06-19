/**
 * Index des configurations de carte pour l'application Church Planting Map
 * 
 * Ce fichier centralise toutes les configurations et les exporte
 * pour une utilisation facile dans l'application.
 */

// Import des configurations
export * from './mapLayers.config';
export * from './mapStyles.config';
export * from './mapFilters.config';
export * from './api.config';

// Import des configurations par défaut
import {
  allLayers,
  layerGroups,
  defaultMapConfig,
  adminLevels,
} from './mapLayers.config';
import { mapStyles } from './mapStyles.config';
import { filterConfig } from './mapFilters.config';
import { apiConfig as apiConfiguration } from './api.config';

/**
 * Configuration complète de l'application
 */
export const appConfig = {
  map: {
    ...defaultMapConfig,
    layers: allLayers,
    layerGroups,
    adminLevels,
  },
  styles: mapStyles,
  filters: filterConfig,
};

/**
 * Configuration des données GeoJSON
 */
export const dataConfig = {
  paths: {
    adminBoundaries: '/data/Admin123CMR fusionnées.geojson',
    villagesPoints: '/data/villages.geojson',
    villagesPolygons: '/data/Villages découpés.geojson',
    voronoiOSM: '/data/villages_voronoi.geojson',
    voronoiCustom: '/data/voronoi.geojson',
  },
  crs: 'EPSG:4326', // WGS84
  encoding: 'UTF-8',
};

/**
 * Configuration de l'API (re-export from api.config.ts)
 */
export const apiConfig = apiConfiguration;

/**
 * Configuration des fonctionnalités
 */
export const featuresConfig = {
  enableClustering: true,
  enableSearch: true,
  enableFilters: true,
  enableExport: true,
  enableDrawing: false,
  enableMeasurement: false,
  enablePrinting: false,
  enableOfflineMode: false,
};

/**
 * Configuration de l'interface utilisateur
 */
export const uiConfig = {
  theme: 'light' as 'light' | 'dark',
  language: 'fr' as 'fr' | 'en',
  showWelcomeScreen: true,
  showTutorial: true,
  sidebarPosition: 'left' as 'left' | 'right',
  sidebarCollapsed: false,
  showMinimap: false,
  showScaleBar: true,
  showCoordinates: true,
  showAttribution: true,
};

/**
 * Configuration des performances
 */
export const performanceConfig = {
  maxFeatures: 10000,
  simplifyTolerance: 0.001,
  clusterRadius: 50,
  clusterMaxZoom: 15,
  tileSize: 256,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2,
};

/**
 * Configuration du cache
 */
export const cacheConfig = {
  enabled: true,
  maxAge: 3600000, // 1 heure en millisecondes
  maxSize: 50 * 1024 * 1024, // 50 MB
  strategy: 'lru' as 'lru' | 'fifo',
};

/**
 * Configuration des notifications
 */
export const notificationConfig = {
  position: 'top-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  duration: 5000,
  showProgress: true,
  pauseOnHover: true,
  closeOnClick: true,
};

/**
 * Configuration de l'analyse
 */
export const analyticsConfig = {
  enabled: false,
  trackPageViews: true,
  trackEvents: true,
  trackErrors: true,
  anonymizeIp: true,
};

/**
 * Export de la configuration complète
 */
export default {
  app: appConfig,
  data: dataConfig,
  api: apiConfig,
  features: featuresConfig,
  ui: uiConfig,
  performance: performanceConfig,
  cache: cacheConfig,
  notifications: notificationConfig,
  analytics: analyticsConfig,
};
