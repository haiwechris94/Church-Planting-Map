/**
 * Configuration des couches cartographiques pour l'application Church Planting Map
 * 
 * Ce fichier définit les différentes couches de données GeoJSON disponibles
 * et leurs propriétés d'affichage sur la carte.
 */

export interface LayerConfig {
  id: string;
  name: string;
  description: string;
  dataPath: string;
  type: 'point' | 'polygon' | 'multipolygon';
  visible: boolean;
  zIndex: number;
  style: {
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    pointRadius?: number;
    pointColor?: string;
  };
  properties: {
    nameField: string;
    idField: string;
    additionalFields?: string[];
  };
}

export interface LayerGroup {
  id: string;
  name: string;
  description: string;
  layers: LayerConfig[];
}

/**
 * Configuration des couches administratives du Cameroun
 */
export const administrativeLayers: LayerConfig[] = [
  {
    id: 'admin-boundaries',
    name: 'Limites Administratives',
    description: 'Régions, Divisions et Subdivisions du Cameroun (Niveaux 1, 2, 3)',
    dataPath: '/data/Admin123CMR fusionnées.geojson',
    type: 'multipolygon',
    visible: true,
    zIndex: 1,
    style: {
      fillColor: '#3388ff',
      fillOpacity: 0.1,
      strokeColor: '#0066cc',
      strokeWidth: 2,
      strokeOpacity: 0.6,
    },
    properties: {
      nameField: 'NAME_1', // Peut être NAME_1, NAME_2, ou NAME_3 selon le niveau
      idField: 'GID_1', // Peut être GID_1, GID_2, ou GID_3
      additionalFields: [
        'COUNTRY',
        'NAME_2',
        'NAME_3',
        'TYPE_1',
        'TYPE_2',
        'TYPE_3',
        'ENGTYPE_1',
        'ENGTYPE_2',
        'ENGTYPE_3',
        'layer',
      ],
    },
  },
];

/**
 * Configuration des couches de villages
 */
export const villageLayers: LayerConfig[] = [
  {
    id: 'villages-points',
    name: 'Villages (Points)',
    description: 'Emplacements des villages sous forme de points',
    dataPath: '/data/villages.geojson',
    type: 'point',
    visible: true,
    zIndex: 5,
    style: {
      pointRadius: 3,
      pointColor: '#ff6b6b',
      strokeColor: '#ffffff',
      strokeWidth: 1,
      strokeOpacity: 1,
    },
    properties: {
      nameField: 'name',
      idField: 'osm_id',
      additionalFields: ['place', 'other_tags'],
    },
  },
  {
    id: 'villages-polygons',
    name: 'Villages (Polygones)',
    description: 'Limites territoriales des villages',
    dataPath: '/data/Villages découpés.geojson',
    type: 'polygon',
    visible: false,
    zIndex: 2,
    style: {
      fillColor: '#51cf66',
      fillOpacity: 0.3,
      strokeColor: '#2f9e44',
      strokeWidth: 1.5,
      strokeOpacity: 0.8,
    },
    properties: {
      nameField: 'name',
      idField: 'osm_id',
      additionalFields: ['fid', 'place', 'other_tags'],
    },
  },
];

/**
 * Configuration des couches de diagrammes de Voronoi
 */
export const voronoiLayers: LayerConfig[] = [
  {
    id: 'voronoi-osm',
    name: 'Voronoi OSM',
    description: 'Diagrammes de Voronoi générés à partir des villages OpenStreetMap',
    dataPath: '/data/villages_voronoi.geojson',
    type: 'polygon',
    visible: false,
    zIndex: 3,
    style: {
      fillColor: '#845ef7',
      fillOpacity: 0.2,
      strokeColor: '#5f3dc4',
      strokeWidth: 1,
      strokeOpacity: 0.7,
    },
    properties: {
      nameField: 'name',
      idField: 'osm_id',
      additionalFields: ['place', 'other_tags'],
    },
  },
  {
    id: 'voronoi-custom',
    name: 'Voronoi Personnalisé',
    description: 'Diagrammes de Voronoi avec calculs d\'aires et centres',
    dataPath: '/data/voronoi.geojson',
    type: 'polygon',
    visible: false,
    zIndex: 4,
    style: {
      fillColor: '#ffd43b',
      fillOpacity: 0.25,
      strokeColor: '#fab005',
      strokeWidth: 1.5,
      strokeOpacity: 0.8,
    },
    properties: {
      nameField: 'village_name',
      idField: 'village_id',
      additionalFields: ['center', 'area'],
    },
  },
];

/**
 * Groupes de couches pour l'organisation dans l'interface
 */
export const layerGroups: LayerGroup[] = [
  {
    id: 'administrative',
    name: 'Limites Administratives',
    description: 'Régions, divisions et subdivisions du Cameroun',
    layers: administrativeLayers,
  },
  {
    id: 'villages',
    name: 'Villages',
    description: 'Données des villages (points et polygones)',
    layers: villageLayers,
  },
  {
    id: 'voronoi',
    name: 'Zones d\'Influence (Voronoi)',
    description: 'Diagrammes de Voronoi pour l\'analyse territoriale',
    layers: voronoiLayers,
  },
];

/**
 * Toutes les couches disponibles
 */
export const allLayers: LayerConfig[] = [
  ...administrativeLayers,
  ...villageLayers,
  ...voronoiLayers,
];

/**
 * Configuration par défaut de la carte
 */
export const defaultMapConfig = {
  center: [12.3547, 6.0] as [number, number], // Centre approximatif du Cameroun
  zoom: 7,
  minZoom: 5,
  maxZoom: 18,
  defaultVisibleLayers: ['admin-boundaries', 'villages-points'],
};

/**
 * Niveaux administratifs disponibles
 */
export const adminLevels = {
  level1: {
    name: 'Régions',
    nameField: 'NAME_1',
    idField: 'GID_1',
    typeField: 'TYPE_1',
  },
  level2: {
    name: 'Divisions',
    nameField: 'NAME_2',
    idField: 'GID_2',
    typeField: 'TYPE_2',
  },
  level3: {
    name: 'Subdivisions',
    nameField: 'NAME_3',
    idField: 'GID_3',
    typeField: 'TYPE_3',
  },
};

/**
 * Fonction utilitaire pour obtenir une couche par son ID
 */
export function getLayerById(layerId: string): LayerConfig | undefined {
  return allLayers.find((layer) => layer.id === layerId);
}

/**
 * Fonction utilitaire pour obtenir toutes les couches visibles
 */
export function getVisibleLayers(): LayerConfig[] {
  return allLayers.filter((layer) => layer.visible);
}

/**
 * Fonction utilitaire pour obtenir les couches d'un groupe
 */
export function getLayersByGroup(groupId: string): LayerConfig[] {
  const group = layerGroups.find((g) => g.id === groupId);
  return group ? group.layers : [];
}
