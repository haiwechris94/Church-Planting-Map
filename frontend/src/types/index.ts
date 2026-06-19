/**
 * Types et interfaces pour l'application Church Planting Map
 * 
 * Ce fichier définit tous les types TypeScript utilisés dans l'application
 * pour assurer la cohérence et la sécurité des types.
 */

/**
 * Types de géométrie GeoJSON
 */
export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';

/**
 * Interface pour les coordonnées
 */
export type Coordinates = [number, number]; // [longitude, latitude]
export type CoordinatesArray = Coordinates[];
export type CoordinatesMultiArray = CoordinatesArray[];

/**
 * Interface pour une géométrie GeoJSON
 */
export interface GeoJSONGeometry {
  type: GeometryType;
  coordinates: Coordinates | CoordinatesArray | CoordinatesMultiArray;
}

/**
 * Interface pour les propriétés d'une feature
 */
export interface FeatureProperties {
  [key: string]: any;
}

/**
 * Interface pour une feature GeoJSON
 */
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: FeatureProperties;
  id?: string | number;
}

/**
 * Interface pour une collection de features GeoJSON
 */
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  crs?: {
    type: string;
    properties: {
      name: string;
    };
  };
  name?: string;
}

/**
 * Interface pour les propriétés d'un village
 */
export interface VillageProperties {
  osm_id: string;
  name: string;
  barrier?: string | null;
  highway?: string | null;
  ref?: string | null;
  address?: string | null;
  is_in?: string | null;
  place: 'village';
  man_made?: string | null;
  other_tags?: string | null;
  fid?: number;
}

/**
 * Interface pour un village (point)
 */
export interface Village extends GeoJSONFeature {
  geometry: {
    type: 'Point';
    coordinates: Coordinates;
  };
  properties: VillageProperties;
}

/**
 * Interface pour les propriétés d'une zone administrative
 */
export interface AdministrativeProperties {
  GID_0: string;
  GID_1?: string | null;
  GID_2?: string | null;
  GID_3?: string | null;
  COUNTRY: string;
  NAME_1?: string | null;
  NAME_2?: string | null;
  NAME_3?: string | null;
  VARNAME_1?: string | null;
  VARNAME_2?: string | null;
  VARNAME_3?: string | null;
  TYPE_1?: string | null;
  TYPE_2?: string | null;
  TYPE_3?: string | null;
  ENGTYPE_1?: string | null;
  ENGTYPE_2?: string | null;
  ENGTYPE_3?: string | null;
  layer?: string;
  path?: string;
}

/**
 * Interface pour une zone administrative
 */
export interface AdministrativeArea extends GeoJSONFeature {
  geometry: {
    type: 'MultiPolygon';
    coordinates: CoordinatesMultiArray;
  };
  properties: AdministrativeProperties;
}

/**
 * Interface pour les propriétés d'un polygone Voronoi
 */
export interface VoronoiProperties {
  village_id: string;
  village_name: string;
  center: Coordinates;
  area: number;
  osm_id?: string;
  name?: string;
  place?: string;
  other_tags?: string | null;
}

/**
 * Interface pour un polygone Voronoi
 */
export interface VoronoiPolygon extends GeoJSONFeature {
  geometry: {
    type: 'Polygon';
    coordinates: CoordinatesArray;
  };
  properties: VoronoiProperties;
}

/**
 * Interface pour les propriétés d'une église
 */
export interface ChurchProperties {
  id: string;
  name: string;
  denomination?: string;
  pastor?: string;
  foundedYear?: number;
  members?: number;
  status: 'active' | 'planned' | 'inactive';
  villageId?: string;
  villageName?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/**
 * Interface pour une église
 */
export interface Church extends GeoJSONFeature {
  geometry: {
    type: 'Point';
    coordinates: Coordinates;
  };
  properties: ChurchProperties;
}

/**
 * Interface pour les statistiques d'une zone
 */
export interface ZoneStatistics {
  totalVillages: number;
  villagesWithChurch: number;
  villagesWithoutChurch: number;
  totalChurches: number;
  totalArea: number;
  averageArea: number;
  population?: number;
  populationPerChurch?: number;
  coveragePercentage: number;
}

/**
 * Interface pour les statistiques par région
 */
export interface RegionStatistics extends ZoneStatistics {
  regionName: string;
  regionId: string;
  divisions?: DivisionStatistics[];
}

/**
 * Interface pour les statistiques par division
 */
export interface DivisionStatistics extends ZoneStatistics {
  divisionName: string;
  divisionId: string;
  regionName: string;
  subdivisions?: SubdivisionStatistics[];
}

/**
 * Interface pour les statistiques par subdivision
 */
export interface SubdivisionStatistics extends ZoneStatistics {
  subdivisionName: string;
  subdivisionId: string;
  divisionName: string;
}

/**
 * Interface pour les limites de la carte
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Interface pour l'état de la carte
 */
export interface MapState {
  center: Coordinates;
  zoom: number;
  bounds?: MapBounds;
  visibleLayers: string[];
  selectedFeatures: string[];
  activeFilters: string[];
}

/**
 * Interface pour les options de recherche
 */
export interface SearchOptions {
  query: string;
  fields: string[];
  limit?: number;
  offset?: number;
  fuzzy?: boolean;
}

/**
 * Interface pour un résultat de recherche
 */
export interface SearchResult {
  id: string;
  type: 'village' | 'church' | 'administrative';
  name: string;
  coordinates: Coordinates;
  properties: FeatureProperties;
  score?: number;
}

/**
 * Interface pour les options d'export
 */
export interface ExportOptions {
  format: 'geojson' | 'csv' | 'kml' | 'shapefile';
  layers: string[];
  includeMetadata: boolean;
  coordinateSystem?: string;
  filename?: string;
}

/**
 * Interface pour une notification
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

/**
 * Interface pour l'état de l'application
 */
export interface AppState {
  map: MapState;
  data: {
    villages: Village[];
    churches: Church[];
    administrativeAreas: AdministrativeArea[];
    voronoiPolygons: VoronoiPolygon[];
  };
  ui: {
    sidebarOpen: boolean;
    activeTab: string;
    loading: boolean;
    notifications: Notification[];
  };
  filters: {
    active: string[];
    values: Record<string, any>;
  };
}

/**
 * Interface pour les actions Redux
 */
export interface Action<T = any> {
  type: string;
  payload?: T;
}

/**
 * Interface pour une requête API
 */
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
}

/**
 * Interface pour une réponse API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

/**
 * Type pour les niveaux administratifs
 */
export type AdminLevel = 'level1' | 'level2' | 'level3';

/**
 * Type pour les types de couches
 */
export type LayerType = 'administrative' | 'village' | 'church' | 'voronoi' | 'custom';

/**
 * Type pour les modes de carte
 */
export type MapMode = 'view' | 'edit' | 'measure' | 'draw';

/**
 * Type pour les thèmes
 */
export type Theme = 'light' | 'dark';

/**
 * Type pour les langues
 */
export type Language = 'fr' | 'en';

/**
 * Type pour les formats d'export
 */
export type ExportFormat = 'geojson' | 'csv' | 'kml' | 'shapefile';

/**
 * Type pour les opérateurs de filtre
 */
export type FilterOperator = 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';

/**
 * Type pour les opérateurs logiques
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Type pour les types de notification
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Type pour les statuts d'église
 */
export type ChurchStatus = 'active' | 'planned' | 'inactive';

/**
 * Type pour les positions
 */
export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Type pour les stratégies de cache
 */
export type CacheStrategy = 'lru' | 'fifo';

/**
 * Type guards pour vérifier les types
 */
export function isVillage(feature: GeoJSONFeature): feature is Village {
  return feature.geometry.type === 'Point' && feature.properties.place === 'village';
}

export function isChurch(feature: GeoJSONFeature): feature is Church {
  return feature.geometry.type === 'Point' && 'status' in feature.properties;
}

export function isAdministrativeArea(feature: GeoJSONFeature): feature is AdministrativeArea {
  return feature.geometry.type === 'MultiPolygon' && 'COUNTRY' in feature.properties;
}

export function isVoronoiPolygon(feature: GeoJSONFeature): feature is VoronoiPolygon {
  return feature.geometry.type === 'Polygon' && 'area' in feature.properties;
}

// Re-export Voronoi types
export * from './voronoi.types';