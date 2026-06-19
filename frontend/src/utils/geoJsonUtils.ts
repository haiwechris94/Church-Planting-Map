/**
 * Utilitaires pour charger et manipuler les données GeoJSON
 * 
 * Ce fichier fournit des fonctions pour charger, parser, et manipuler
 * les fichiers GeoJSON de l'application.
 */

import {
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  Village,
  AdministrativeArea,
  VoronoiPolygon,
  Coordinates,
} from '@/types';

/**
 * Cache pour les données GeoJSON chargées
 */
const dataCache = new Map<string, GeoJSONFeatureCollection>();

/**
 * Charge un fichier GeoJSON depuis un chemin
 */
export async function loadGeoJSON(path: string): Promise<GeoJSONFeatureCollection> {
  // Vérifier le cache
  if (dataCache.has(path)) {
    return dataCache.get(path)!;
  }

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
    }

    const data: GeoJSONFeatureCollection = await response.json();

    // Valider la structure GeoJSON
    if (!isValidGeoJSON(data)) {
      throw new Error('Format GeoJSON invalide');
    }

    // Mettre en cache
    dataCache.set(path, data);

    return data;
  } catch (error) {
    console.error(`Erreur lors du chargement de ${path}:`, error);
    throw error;
  }
}

/**
 * Charge plusieurs fichiers GeoJSON en parallèle
 */
export async function loadMultipleGeoJSON(
  paths: string[]
): Promise<GeoJSONFeatureCollection[]> {
  try {
    const promises = paths.map((path) => loadGeoJSON(path));
    return await Promise.all(promises);
  } catch (error) {
    console.error('Erreur lors du chargement de plusieurs fichiers GeoJSON:', error);
    throw error;
  }
}

/**
 * Valide la structure d'un objet GeoJSON
 */
export function isValidGeoJSON(data: any): data is GeoJSONFeatureCollection {
  return (
    data &&
    typeof data === 'object' &&
    data.type === 'FeatureCollection' &&
    Array.isArray(data.features)
  );
}

/**
 * Filtre les features par type de géométrie
 */
export function filterByGeometryType(
  collection: GeoJSONFeatureCollection,
  type: string
): GeoJSONFeature[] {
  return collection.features.filter((feature) => feature.geometry.type === type);
}

/**
 * Filtre les features par propriété
 */
export function filterByProperty(
  collection: GeoJSONFeatureCollection,
  propertyName: string,
  propertyValue: any
): GeoJSONFeature[] {
  return collection.features.filter(
    (feature) => feature.properties[propertyName] === propertyValue
  );
}

/**
 * Recherche des features par nom (recherche floue)
 */
export function searchByName(
  collection: GeoJSONFeatureCollection,
  query: string,
  nameField: string = 'name'
): GeoJSONFeature[] {
  const lowerQuery = query.toLowerCase();
  return collection.features.filter((feature) => {
    const name = feature.properties[nameField];
    return name && String(name).toLowerCase().includes(lowerQuery);
  });
}

/**
 * Obtient les limites (bounds) d'une collection de features
 */
export function getBounds(collection: GeoJSONFeatureCollection): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;

  collection.features.forEach((feature) => {
    const coords = extractCoordinates(feature.geometry);
    coords.forEach(([lng, lat]) => {
      if (lat > north) north = lat;
      if (lat < south) south = lat;
      if (lng > east) east = lng;
      if (lng < west) west = lng;
    });
  });

  return { north, south, east, west };
}

/**
 * Extrait toutes les coordonnées d'une géométrie
 */
function extractCoordinates(geometry: any): Coordinates[] {
  const coords: Coordinates[] = [];

  function extract(arr: any): void {
    if (Array.isArray(arr)) {
      if (typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        coords.push(arr as Coordinates);
      } else {
        arr.forEach(extract);
      }
    }
  }

  extract(geometry.coordinates);
  return coords;
}

/**
 * Calcule le centre d'une collection de features
 */
export function getCenter(collection: GeoJSONFeatureCollection): Coordinates {
  const bounds = getBounds(collection);
  return [
    (bounds.west + bounds.east) / 2,
    (bounds.south + bounds.north) / 2,
  ];
}

/**
 * Calcule la distance entre deux coordonnées (en km)
 * Utilise la formule de Haversine
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Rayon de la Terre en km
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convertit des degrés en radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Trouve les N features les plus proches d'un point
 */
export function findNearestFeatures(
  collection: GeoJSONFeatureCollection,
  point: Coordinates,
  n: number = 5
): GeoJSONFeature[] {
  const featuresWithDistance = collection.features.map((feature) => {
    const featureCoords = getFeatureCenter(feature);
    const distance = calculateDistance(point, featureCoords);
    return { feature, distance };
  });

  return featuresWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n)
    .map((item) => item.feature);
}

/**
 * Obtient le centre d'une feature
 */
export function getFeatureCenter(feature: GeoJSONFeature): Coordinates {
  const coords = extractCoordinates(feature.geometry);
  if (coords.length === 0) return [0, 0];

  if (feature.geometry.type === 'Point') {
    return coords[0];
  }

  // Calcul du centroïde pour les polygones
  const sumLng = coords.reduce((sum, [lng]) => sum + lng, 0);
  const sumLat = coords.reduce((sum, [, lat]) => sum + lat, 0);
  return [sumLng / coords.length, sumLat / coords.length];
}

/**
 * Fusionne plusieurs collections GeoJSON
 */
export function mergeCollections(
  ...collections: GeoJSONFeatureCollection[]
): GeoJSONFeatureCollection {
  const allFeatures = collections.flatMap((collection) => collection.features);

  return {
    type: 'FeatureCollection',
    features: allFeatures,
  };
}

/**
 * Simplifie une géométrie (réduit le nombre de points)
 */
export function simplifyGeometry(
  feature: GeoJSONFeature,
  tolerance: number = 0.001
): GeoJSONFeature {
  // Implémentation simplifiée - pour une vraie simplification, utiliser turf.js
  return feature;
}

/**
 * Convertit une collection GeoJSON en CSV
 */
export function toCSV(collection: GeoJSONFeatureCollection): string {
  if (collection.features.length === 0) return '';

  // Obtenir toutes les clés de propriétés
  const allKeys = new Set<string>();
  collection.features.forEach((feature) => {
    Object.keys(feature.properties).forEach((key) => allKeys.add(key));
  });

  const headers = ['id', 'type', 'longitude', 'latitude', ...Array.from(allKeys)];
  const rows = [headers.join(',')];

  collection.features.forEach((feature) => {
    const center = getFeatureCenter(feature);
    const row = [
      feature.id || '',
      feature.geometry.type,
      center[0],
      center[1],
      ...Array.from(allKeys).map((key) => {
        const value = feature.properties[key];
        return value !== null && value !== undefined ? `"${value}"` : '';
      }),
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Exporte une collection GeoJSON en fichier
 */
export function exportToFile(
  collection: GeoJSONFeatureCollection,
  filename: string,
  format: 'geojson' | 'csv' = 'geojson'
): void {
  let content: string;
  let mimeType: string;

  if (format === 'csv') {
    content = toCSV(collection);
    mimeType = 'text/csv';
  } else {
    content = JSON.stringify(collection, null, 2);
    mimeType = 'application/json';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Vide le cache des données GeoJSON
 */
export function clearCache(): void {
  dataCache.clear();
}

/**
 * Obtient la taille du cache
 */
export function getCacheSize(): number {
  return dataCache.size;
}

/**
 * Obtient les clés du cache
 */
export function getCacheKeys(): string[] {
  return Array.from(dataCache.keys());
}

/**
 * Charge toutes les données de l'application
 */
export async function loadAllData() {
  const paths = [
    '/data/Admin123CMR fusionnées.geojson',
    '/data/villages.geojson',
    '/data/Villages découpés.geojson',
    '/data/villages_voronoi.geojson',
    '/data/voronoi.geojson',
  ];

  try {
    const [admin, villagesPoints, villagesPolygons, voronoiOSM, voronoiCustom] =
      await loadMultipleGeoJSON(paths);

    return {
      administrativeAreas: admin,
      villagesPoints,
      villagesPolygons,
      voronoiOSM,
      voronoiCustom,
    };
  } catch (error) {
    console.error('Erreur lors du chargement de toutes les données:', error);
    throw error;
  }
}

/**
 * Export par défaut
 */
export default {
  loadGeoJSON,
  loadMultipleGeoJSON,
  loadAllData,
  isValidGeoJSON,
  filterByGeometryType,
  filterByProperty,
  searchByName,
  getBounds,
  getCenter,
  calculateDistance,
  findNearestFeatures,
  getFeatureCenter,
  mergeCollections,
  simplifyGeometry,
  toCSV,
  exportToFile,
  clearCache,
  getCacheSize,
  getCacheKeys,
};
