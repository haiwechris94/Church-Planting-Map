/**
 * Configuration des pays supportés pour l'affichage des polygones administratifs
 * 
 * Chaque pays a:
 * - code: Code ISO 3166-1 alpha-3
 * - code2: Code ISO 3166-1 alpha-2 (utilisé par OSM)
 * - name: Nom en anglais
 * - nameFr: Nom en français
 * - adminFile: Chemin vers le fichier GeoJSON des limites administratives fusionnées
 * - gadmFiles: Fichiers GADM par niveau (si disponibles)
 * - hasOsmVillages: Si les villages ont été extraits via OSM
 * - center: Coordonnées du centre [lat, lng]
 * - zoom: Niveau de zoom par défaut
 * - bounds: Limites géographiques [minLng, minLat, maxLng, maxLat]
 */

export const SUPPORTED_COUNTRIES = {
  CMR: {
    code: 'CMR',
    code2: 'CM',
    name: 'Cameroon',
    nameFr: 'Cameroun',
    adminFile: '/data/Admin123CMR fusionnées.geojson',
    villagesFile: '/data/villages.geojson',
    villagesBoundaryFile: '/data/Villages découpés.geojson',
    hasOsmVillages: true,
    hasAdminPolygons: true,
    center: [7.3697, 12.3547],
    zoom: 6,
    bounds: [8.4994, 1.6559, 16.1921, 13.0780],
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 10 },
      2: { name: 'Départements', nameEn: 'Departments', count: 58 },
      3: { name: 'Arrondissements', nameEn: 'Subdivisions', count: 360 }
    }
  },
  
  TCD: {
    code: 'TCD',
    code2: 'TD',
    name: 'Chad',
    nameFr: 'Tchad',
    adminFile: '/data/TCD_admin123.geojson', // Merged admin boundaries file
    villagesFile: null, // No Chad-specific villages point file yet
    villagesBoundaryFile: '/data/VChad_polygons.geojson', // Chad village polygons
    gadmFiles: {
      1: '/data/gadm41_TCD_1.json',
      2: '/data/gadm41_TCD_2.json',
      3: '/data/gadm41_TCD_3.json'
    },
    hasOsmVillages: true, // Chad has village polygons now
    hasAdminPolygons: true, // Has merged admin file
    center: [15.4542, 18.7322],
    zoom: 5,
    bounds: [13.4734, 7.4419, 24.0000, 23.4505],
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 23 },
      2: { name: 'Départements', nameEn: 'Departments', count: 95 },
      3: { name: 'Sous-préfectures', nameEn: 'Sub-prefectures', count: 365 }
    }
  },
  
  CAF: {
    code: 'CAF',
    code2: 'CF',
    name: 'Central African Republic',
    nameFr: 'République centrafricaine',
    adminFile: '/data/CAF_admin123.geojson', // Merged admin boundaries file
    villagesFile: null, // No CAF-specific villages file yet - prevents fallback to Cameroon data
    villagesBoundaryFile: '/data/VCAF_Polygons.geojson', // CAF village polygons
    gadmFiles: {
      1: '/data/gadm41_CAF_1.json',
      2: '/data/gadm41_CAF_2.json'
    },
    hasOsmVillages: true, // CAF has village polygons now
    hasAdminPolygons: true, // Now has merged admin file
    center: [6.6111, 20.9394],
    zoom: 6,
    bounds: [14.4200, 2.2205, 27.4583, 11.0076],
    adminLevels: {
      1: { name: 'Préfectures', nameEn: 'Prefectures', count: 17 },
      2: { name: 'Sous-préfectures', nameEn: 'Sub-prefectures', count: 71 }
    }
  },
  
  COG: {
    code: 'COG',
    code2: 'CG',
    name: 'Republic of the Congo',
    nameFr: 'Congo Brazzaville',
    adminFile: '/data/Admin123COG fusionnées.geojson',
    villagesFile: null, // No Congo-specific villages file yet - prevents fallback to Cameroon data
    villagesBoundaryFile: '/data/VCongoBrazza_Polygons.geojson', // Congo Brazzaville village polygons
    gadmFiles: {
      1: '/data/gadm41_COG_1.json',
      2: '/data/gadm41_COG_2.json'
    },
    hasOsmVillages: true, // Congo Brazzaville has village polygons now
    hasAdminPolygons: true,
    center: [-0.2280, 15.8277],
    zoom: 6,
    bounds: [11.2050, -5.0270, 18.6500, 3.7031],
    adminLevels: {
      1: { name: 'Départements', nameEn: 'Departments', count: 12 },
      2: { name: 'Districts', nameEn: 'Districts', count: 48 }
    }
  },
  
  GAB: {
    code: 'GAB',
    code2: 'GA',
    name: 'Gabon',
    nameFr: 'Gabon',
    adminFile: '/data/GAB_admin123.geojson', // Merged admin boundaries file
    villagesFile: null, // No Gabon-specific villages file yet - prevents fallback to Cameroon data
    villagesBoundaryFile: '/data/VGabon_Polygons.geojson', // Gabon village polygons
    gadmFiles: {
      1: '/data/gadm41_GAB_1.json',
      2: '/data/gadm41_GAB_2.json'
    },
    hasOsmVillages: true, // Gabon has village polygons now
    hasAdminPolygons: true, // Now has merged admin file
    center: [-0.8037, 11.6094],
    zoom: 6,
    bounds: [8.6954, -3.9785, 14.5024, 2.3226],
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 9 },
      2: { name: 'Départements', nameEn: 'Departments', count: 50 }
    }
  },
  
  COD: {
    code: 'COD',
    code2: 'CD',
    name: 'Democratic Republic of the Congo',
    nameFr: 'République démocratique du Congo',
    adminFile: '/data/Admin123COD fusionnées.geojson',
    gadmFiles: {
      1: '/data/gadm41_COD_1.json',
      2: '/data/gadm41_COD_2.json',
      3: '/data/gadm41_COD_3.json'
    },
    hasOsmVillages: false,
    hasAdminPolygons: true,
    center: [-4.0383, 21.7587],
    zoom: 5,
    bounds: [12.2, -13.5, 31.3, 5.4],
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 26 },
      2: { name: 'Territoires', nameEn: 'Territories', count: 240 },
      3: { name: 'Secteurs', nameEn: 'Sectors', count: 737 }
    }
  },
  
  GNQ: {
    code: 'GNQ',
    code2: 'GQ',
    name: 'Equatorial Guinea',
    nameFr: 'Guinée équatoriale',
    adminFile: '/data/Admin123GNQ fusionnées.geojson',
    gadmFiles: {
      1: '/data/gadm41_GNQ_1.json',
      2: '/data/gadm41_GNQ_2.json'
    },
    hasOsmVillages: false,
    hasAdminPolygons: true,
    center: [1.6508, 10.2679],
    zoom: 8,
    bounds: [5.6172, -1.4689, 11.3357, 3.7886],
    adminLevels: {
      1: { name: 'Provincias', nameEn: 'Provinces', count: 7 },
      2: { name: 'Distritos', nameEn: 'Districts', count: 32 }
    }
  },
  
  STP: {
    code: 'STP',
    code2: 'ST',
    name: 'São Tomé and Príncipe',
    nameFr: 'São Tomé-et-Príncipe',
    adminFile: null,
    gadmFiles: {
      1: '/data/gadm41_STP_1.json'
    },
    hasOsmVillages: false,
    hasAdminPolygons: false,
    center: [0.1864, 6.6131],
    zoom: 10,
    bounds: [6.4, -0.1, 7.5, 1.7],
    adminLevels: {
      1: { name: 'Distritos', nameEn: 'Districts', count: 7 }
    }
  }
};

// Liste des pays avec villages OSM extraits
export const COUNTRIES_WITH_OSM_VILLAGES = Object.entries(SUPPORTED_COUNTRIES)
  .filter(([_, config]) => config.hasOsmVillages)
  .map(([code, config]) => ({
    code,
    code2: config.code2,
    name: config.name,
    nameFr: config.nameFr
  }));

// Liste des pays avec polygones administratifs disponibles
export const COUNTRIES_WITH_ADMIN_POLYGONS = Object.entries(SUPPORTED_COUNTRIES)
  .filter(([_, config]) => config.hasAdminPolygons || config.gadmFiles)
  .map(([code, config]) => ({
    code,
    code2: config.code2,
    name: config.name,
    nameFr: config.nameFr,
    hasAdminPolygons: config.hasAdminPolygons,
    hasGadmFiles: !!config.gadmFiles
  }));

// Obtenir la configuration d'un pays par son code
export function getCountryConfig(code) {
  const upperCode = code?.toUpperCase();
  // Chercher par code ISO3 ou ISO2
  return SUPPORTED_COUNTRIES[upperCode] || 
    Object.values(SUPPORTED_COUNTRIES).find(c => c.code2 === upperCode);
}

// Obtenir le fichier admin pour un pays
export function getAdminFile(countryCode) {
  const config = getCountryConfig(countryCode);
  return config?.adminFile || null;
}

// Obtenir les fichiers GADM pour un pays
export function getGadmFiles(countryCode) {
  const config = getCountryConfig(countryCode);
  return config?.gadmFiles || null;
}

// Pays par défaut
export const DEFAULT_COUNTRY = 'CMR';

export default SUPPORTED_COUNTRIES;
