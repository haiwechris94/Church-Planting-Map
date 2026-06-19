/**
 * Configuration des filtres et requêtes pour l'application Church Planting Map
 * 
 * Ce fichier définit les filtres disponibles pour interroger et afficher
 * les données géographiques selon différents critères.
 */

/**
 * Types de filtres disponibles
 */
export type FilterType =
  | 'administrative'
  | 'village'
  | 'church'
  | 'area'
  | 'population'
  | 'custom';

/**
 * Interface pour un filtre
 */
export interface Filter {
  id: string;
  name: string;
  type: FilterType;
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: any;
  active: boolean;
}

/**
 * Interface pour un groupe de filtres
 */
export interface FilterGroup {
  id: string;
  name: string;
  description: string;
  filters: Filter[];
  operator: 'AND' | 'OR';
}

/**
 * Filtres prédéfinis pour les niveaux administratifs
 */
export const administrativeFilters: FilterGroup = {
  id: 'administrative',
  name: 'Filtres Administratifs',
  description: 'Filtrer par région, division ou subdivision',
  operator: 'AND',
  filters: [
    {
      id: 'region',
      name: 'Région',
      type: 'administrative',
      field: 'NAME_1',
      operator: 'equals',
      value: null,
      active: false,
    },
    {
      id: 'division',
      name: 'Division',
      type: 'administrative',
      field: 'NAME_2',
      operator: 'equals',
      value: null,
      active: false,
    },
    {
      id: 'subdivision',
      name: 'Subdivision',
      type: 'administrative',
      field: 'NAME_3',
      operator: 'equals',
      value: null,
      active: false,
    },
  ],
};

/**
 * Filtres prédéfinis pour les villages
 */
export const villageFilters: FilterGroup = {
  id: 'village',
  name: 'Filtres Villages',
  description: 'Filtrer les villages par différents critères',
  operator: 'AND',
  filters: [
    {
      id: 'village-name',
      name: 'Nom du village',
      type: 'village',
      field: 'name',
      operator: 'contains',
      value: '',
      active: false,
    },
    {
      id: 'has-church',
      name: 'Possède une église',
      type: 'church',
      field: 'hasChurch',
      operator: 'equals',
      value: true,
      active: false,
    },
    {
      id: 'no-church',
      name: 'Sans église',
      type: 'church',
      field: 'hasChurch',
      operator: 'equals',
      value: false,
      active: false,
    },
  ],
};

/**
 * Filtres prédéfinis pour les aires (Voronoi)
 */
export const areaFilters: FilterGroup = {
  id: 'area',
  name: 'Filtres par Aire',
  description: 'Filtrer par superficie des zones Voronoi',
  operator: 'AND',
  filters: [
    {
      id: 'area-small',
      name: 'Petite aire (< 1000 km²)',
      type: 'area',
      field: 'area',
      operator: 'lessThan',
      value: 1000,
      active: false,
    },
    {
      id: 'area-medium',
      name: 'Aire moyenne (1000-5000 km²)',
      type: 'area',
      field: 'area',
      operator: 'between',
      value: [1000, 5000],
      active: false,
    },
    {
      id: 'area-large',
      name: 'Grande aire (> 5000 km²)',
      type: 'area',
      field: 'area',
      operator: 'greaterThan',
      value: 5000,
      active: false,
    },
  ],
};

/**
 * Tous les groupes de filtres
 */
export const allFilterGroups: FilterGroup[] = [
  administrativeFilters,
  villageFilters,
  areaFilters,
];

/**
 * Requêtes prédéfinies pour des analyses courantes
 */
export const predefinedQueries = {
  villagesWithoutChurch: {
    id: 'villages-without-church',
    name: 'Villages sans église',
    description: 'Afficher tous les villages qui n\'ont pas d\'église',
    filters: [
      {
        field: 'hasChurch',
        operator: 'equals' as const,
        value: false,
      },
    ],
  },
  largeUncoveredAreas: {
    id: 'large-uncovered-areas',
    name: 'Grandes zones non couvertes',
    description: 'Zones Voronoi de plus de 5000 km² sans église',
    filters: [
      {
        field: 'area',
        operator: 'greaterThan' as const,
        value: 5000,
      },
      {
        field: 'hasChurch',
        operator: 'equals' as const,
        value: false,
      },
    ],
  },
  regionSummary: {
    id: 'region-summary',
    name: 'Résumé par région',
    description: 'Statistiques groupées par région administrative',
    groupBy: 'NAME_1',
    aggregations: ['count', 'sum', 'avg'],
  },
  densityAnalysis: {
    id: 'density-analysis',
    name: 'Analyse de densité',
    description: 'Analyse de la densité d\'églises par zone',
    calculations: ['churchesPerArea', 'populationPerChurch'],
  },
};

/**
 * Configuration des options de recherche
 */
export const searchConfig = {
  minCharacters: 2,
  maxResults: 50,
  debounceMs: 300,
  searchFields: {
    villages: ['name', 'osm_id'],
    administrative: ['NAME_1', 'NAME_2', 'NAME_3'],
  },
  placeholder: 'Rechercher un village, une région...',
};

/**
 * Configuration des options d'export
 */
export const exportConfig = {
  formats: ['geojson', 'csv', 'kml', 'shapefile'],
  includeMetadata: true,
  coordinateSystem: 'WGS84',
  defaultFormat: 'geojson' as const,
};

/**
 * Fonction utilitaire pour appliquer un filtre
 */
export function applyFilter(data: any[], filter: Filter): any[] {
  if (!filter.active) return data;

  return data.filter((item) => {
    const fieldValue = item.properties?.[filter.field] ?? item[filter.field];

    switch (filter.operator) {
      case 'equals':
        return fieldValue === filter.value;
      case 'contains':
        return String(fieldValue)
          .toLowerCase()
          .includes(String(filter.value).toLowerCase());
      case 'greaterThan':
        return Number(fieldValue) > Number(filter.value);
      case 'lessThan':
        return Number(fieldValue) < Number(filter.value);
      case 'between':
        return (
          Number(fieldValue) >= Number(filter.value[0]) &&
          Number(fieldValue) <= Number(filter.value[1])
        );
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(fieldValue);
      default:
        return true;
    }
  });
}

/**
 * Fonction utilitaire pour appliquer un groupe de filtres
 */
export function applyFilterGroup(data: any[], filterGroup: FilterGroup): any[] {
  const activeFilters = filterGroup.filters.filter((f) => f.active);

  if (activeFilters.length === 0) return data;

  if (filterGroup.operator === 'AND') {
    return activeFilters.reduce((result, filter) => applyFilter(result, filter), data);
  } else {
    // OR operator
    const results = new Set();
    activeFilters.forEach((filter) => {
      applyFilter(data, filter).forEach((item) => results.add(item));
    });
    return Array.from(results) as any[];
  }
}

/**
 * Fonction utilitaire pour obtenir les valeurs uniques d'un champ
 */
export function getUniqueValues(data: any[], field: string): any[] {
  const values = new Set();
  data.forEach((item) => {
    const value = item.properties?.[field] ?? item[field];
    if (value !== null && value !== undefined) {
      values.add(value);
    }
  });
  return Array.from(values).sort();
}

/**
 * Fonction utilitaire pour obtenir les statistiques d'un champ numérique
 */
export function getFieldStatistics(data: any[], field: string) {
  const values = data
    .map((item) => Number(item.properties?.[field] ?? item[field]))
    .filter((v) => !isNaN(v));

  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = sum / values.length;

  return { min, max, avg, sum, count: values.length };
}

/**
 * Export de toutes les configurations de filtres
 */
export const filterConfig = {
  allFilterGroups,
  predefinedQueries,
  searchConfig,
  exportConfig,
};

export default filterConfig;
