/**
 * Administrative Service
 * Handles loading, caching, and filtering of GeoJSON administrative data
 * for African countries' hierarchical administrative divisions
 * 
 * Multi-country support: All 54 African countries
 */
const fs = require('fs').promises;
const path = require('path');
const turf = require('@turf/turf');
const countriesConfig = require('../config/countries');

// Cache for loaded GeoJSON data (per country)
const cache = {
  adminData: new Map(),      // Map<countryCode, adminData>
  villages: new Map(),       // Map<countryCode, villagesData>
  villagesDecoupes: new Map(), // Map<countryCode, villagesDecoupesData>
  countryBoundaries: new Map(), // Map<countryCode, boundaryData>
  lastLoaded: {}
};

// Cache TTL in milliseconds (30 minutes)
const CACHE_TTL = 30 * 60 * 1000;

// Base path for GeoJSON files
const DATA_PATH = path.join(__dirname, '../../frontend/public/data');

// Default country code for backward compatibility
const DEFAULT_COUNTRY_CODE = countriesConfig.DEFAULT_COUNTRY_CODE;

/**
 * Default administrative level definitions (Cameroon-style)
 * Countries may have different admin level structures
 */
const DEFAULT_ADMIN_LEVELS = {
  1: { name: 'Régions', nameEn: 'Regions', field: 'NAME_1', gidField: 'GID_1' },
  2: { name: 'Départements', nameEn: 'Departments', field: 'NAME_2', gidField: 'GID_2' },
  3: { name: 'Arrondissements', nameEn: 'Subdivisions', field: 'NAME_3', gidField: 'GID_3' },
  4: { name: 'Villages', nameEn: 'Villages', field: 'name', gidField: 'osm_id' }
};

/**
 * Get admin levels for a specific country
 * @param {string} countryCode - ISO country code
 * @returns {Object} - Admin levels configuration
 */
function getAdminLevels(countryCode = DEFAULT_COUNTRY_CODE) {
  const country = countriesConfig.getCountryByCode(countryCode);
  if (!country || !country.adminLevels) {
    return DEFAULT_ADMIN_LEVELS;
  }
  
  // Build admin levels from country config
  const levels = {};
  for (const [level, config] of Object.entries(country.adminLevels)) {
    levels[level] = {
      name: config.name,
      nameEn: config.nameEn,
      field: `NAME_${level}`,
      gidField: `GID_${level}`,
      count: config.count
    };
  }
  // Add villages level
  levels[4] = { name: 'Villages', nameEn: 'Villages', field: 'name', gidField: 'osm_id' };
  return levels;
}

// Keep ADMIN_LEVELS for backward compatibility
const ADMIN_LEVELS = DEFAULT_ADMIN_LEVELS;

/**
 * Check if cache is valid
 * @param {string} key - Cache key
 * @returns {boolean} - Whether cache is valid
 */
function isCacheValid(key) {
  if (!cache.lastLoaded[key]) return false;
  return (Date.now() - cache.lastLoaded[key]) < CACHE_TTL;
}

/**
 * Load and cache the Admin123 GeoJSON file for a country
 * Contains regions, departments, and subdivisions
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - GeoJSON FeatureCollection
 */
async function loadAdmin123Data(countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const cacheKey = `admin123_${code}`;
  
  // Check cache
  if (cache.adminData.has(code) && isCacheValid(cacheKey)) {
    return cache.adminData.get(code);
  }

  // Validate country code
  if (!countriesConfig.isValidCountryCode(code)) {
    throw new Error(`Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`);
  }

  const country = countriesConfig.getCountryByCode(code);

  try {
    let filePath;
    let adminData;
    
    // Try merged admin file first - country-specific file paths
    if (code === 'CMR') {
      // Backward compatibility: use existing Cameroon file
      filePath = path.join(DATA_PATH, 'Admin123CMR fusionnées.geojson');
    } else if (code === 'TCD') {
      // Chad uses TCD_admin123.geojson
      filePath = path.join(DATA_PATH, 'TCD_admin123.geojson');
    } else {
      filePath = path.join(DATA_PATH, `Admin123${code} fusionnées.geojson`);
    }
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      adminData = JSON.parse(fileContent);
    } catch (e) {
      // Try GADM files as fallback
      console.log(`⚠️ Merged admin file not found for ${country.name}, trying GADM files...`);
      adminData = await loadGADMData(code);
    }
    
    cache.adminData.set(code, adminData);
    cache.lastLoaded[cacheKey] = Date.now();
    console.log(`✅ Loaded Admin123 data for ${country.name}: ${adminData.features?.length || 0} features`);
    return adminData;
  } catch (error) {
    console.error(`❌ Error loading Admin123 data for ${country.name}:`, error.message);
    throw new Error(`Failed to load administrative data for ${country.name}: ${error.message}`);
  }
}

/**
 * Load GADM data for a country (fallback when merged file not available)
 * @param {string} countryCode - ISO country code
 * @returns {Promise<Object>} - Combined GeoJSON FeatureCollection
 */
async function loadGADMData(countryCode) {
  const code = countryCode.toUpperCase();
  const country = countriesConfig.getCountryByCode(code);
  const maxLevel = country?.gadmLevels || 3;
  
  const allFeatures = [];
  
  for (let level = 1; level <= Math.min(maxLevel, 3); level++) {
    const gadmPath = path.join(DATA_PATH, `gadm41_${code}_${level}.json`);
    try {
      const content = await fs.readFile(gadmPath, 'utf-8');
      const data = JSON.parse(content);
      if (data.features) {
        allFeatures.push(...data.features);
      }
    } catch (e) {
      console.warn(`⚠️ GADM level ${level} not found for ${code}`);
    }
  }
  
  if (allFeatures.length === 0) {
    throw new Error(`No GADM data found for ${country?.name || code}`);
  }
  
  return {
    type: 'FeatureCollection',
    features: allFeatures
  };
}

/**
 * Load and cache the villages GeoJSON file (points)
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - GeoJSON FeatureCollection
 */
async function loadVillagesData(countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const cacheKey = `villages_${code}`;
  
  if (cache.villages.has(code) && isCacheValid(cacheKey)) {
    return cache.villages.get(code);
  }

  const country = countriesConfig.getCountryByCode(code);

  try {
    let filePath;
    if (code === 'CMR') {
      filePath = path.join(DATA_PATH, 'villages.geojson');
    } else {
      filePath = path.join(DATA_PATH, `villages_${code}.geojson`);
    }
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const villagesData = JSON.parse(fileContent);
    cache.villages.set(code, villagesData);
    cache.lastLoaded[cacheKey] = Date.now();
    console.log(`✅ Loaded villages data for ${country?.name || code}: ${villagesData.features?.length || 0} features`);
    return villagesData;
  } catch (error) {
    console.error(`❌ Error loading villages data for ${country?.name || code}:`, error.message);
    throw new Error(`Failed to load villages data for ${country?.name || code}: ${error.message}`);
  }
}

/**
 * Load and cache the villages découpés GeoJSON file (polygons)
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - GeoJSON FeatureCollection
 */
async function loadVillagesDecoupesData(countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const cacheKey = `villagesDecoupes_${code}`;
  
  if (cache.villagesDecoupes.has(code) && isCacheValid(cacheKey)) {
    return cache.villagesDecoupes.get(code);
  }

  const country = countriesConfig.getCountryByCode(code);

  try {
    let filePath;
    // Country-specific file paths for village polygons
    if (code === 'CMR') {
      filePath = path.join(DATA_PATH, 'Villages découpés.geojson');
    } else if (code === 'TCD') {
      // Chad uses VChad_polygons.geojson
      filePath = path.join(DATA_PATH, 'VChad_polygons.geojson');
    } else {
      // Default pattern for other countries
      filePath = path.join(DATA_PATH, `Villages découpés_${code}.geojson`);
    }
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const villagesData = JSON.parse(fileContent);
    cache.villagesDecoupes.set(code, villagesData);
    cache.lastLoaded[cacheKey] = Date.now();
    console.log(`✅ Loaded villages découpés data for ${country?.name || code}: ${villagesData.features?.length || 0} features`);
    return villagesData;
  } catch (error) {
    console.error(`❌ Error loading villages découpés data for ${country?.name || code}:`, error.message);
    throw new Error(`Failed to load villages découpés data for ${country?.name || code}: ${error.message}`);
  }
}

/**
 * Get country's outer boundary for clipping
 * Extracts from Admin Level 1 data
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - GeoJSON Feature (MultiPolygon)
 */
async function getCountryBoundary(countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const cacheKey = `countryBoundary_${code}`;
  
  if (cache.countryBoundaries.has(code) && isCacheValid(cacheKey)) {
    return cache.countryBoundaries.get(code);
  }

  // Validate country code
  if (!countriesConfig.isValidCountryCode(code)) {
    throw new Error(`Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`);
  }

  const country = countriesConfig.getCountryByCode(code);

  try {
    const admin123 = await loadAdmin123Data(code);
    
    // Get all level 1 features (regions)
    const regions = admin123.features.filter(f => 
      f.properties.GID_1 && !f.properties.GID_2 && !f.properties.GID_3
    );

    if (regions.length === 0) {
      // Fallback: create boundary from config bounds
      console.warn(`⚠️ No region boundaries found for ${country.name}, using config bounds`);
      const bounds = country.bounds;
      const boundary = turf.bboxPolygon(bounds);
      boundary.properties = {
        COUNTRY: country.name,
        ISO: code,
        generated: true
      };
      cache.countryBoundaries.set(code, boundary);
      cache.lastLoaded[cacheKey] = Date.now();
      return boundary;
    }

    // Union all regions to get country boundary
    let countryBoundary = regions[0];
    for (let i = 1; i < regions.length; i++) {
      try {
        countryBoundary = turf.union(
          turf.featureCollection([countryBoundary, regions[i]])
        );
      } catch (e) {
        console.warn(`Warning: Could not union region ${i} for ${country.name}:`, e.message);
      }
    }

    cache.countryBoundaries.set(code, countryBoundary);
    cache.lastLoaded[cacheKey] = Date.now();
    console.log(`✅ Generated ${country.name} boundary`);
    return countryBoundary;
  } catch (error) {
    console.error(`❌ Error generating ${country.name} boundary:`, error.message);
    throw error;
  }
}

/**
 * Get Cameroon's outer boundary for clipping (backward compatibility)
 * @deprecated Use getCountryBoundary('CMR') instead
 * @returns {Promise<Object>} - GeoJSON Feature (MultiPolygon)
 */
async function getCameroonBoundary() {
  return getCountryBoundary('CMR');
}

/**
 * Filter features by administrative level
 * @param {number} level - Administrative level (1, 2, or 3)
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Array>} - Array of features at the specified level
 */
async function getFeaturesByLevel(level, countryCode = DEFAULT_COUNTRY_CODE) {
  const admin123 = await loadAdmin123Data(countryCode);
  
  return admin123.features.filter(feature => {
    const props = feature.properties;
    switch (level) {
      case 1:
        // Level 1: Has GID_1 but no GID_2 or GID_3
        return props.GID_1 && !props.GID_2 && !props.GID_3;
      case 2:
        // Level 2: Has GID_2 but no GID_3
        return props.GID_2 && !props.GID_3;
      case 3:
        // Level 3: Has GID_3
        return props.GID_3;
      default:
        return false;
    }
  });
}

/**
 * Get all regions (Admin Level 1)
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - Object with regions list and GeoJSON
 */
async function getRegions(countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const features = await getFeaturesByLevel(1, code);
  const adminLevels = getAdminLevels(code);
  const country = countriesConfig.getCountryByCode(code);
  
  const regions = features.map(f => ({
    id: f.properties.GID_1,
    name: f.properties.NAME_1,
    varName: f.properties.VARNAME_1,
    type: f.properties.TYPE_1,
    typeEn: f.properties.ENGTYPE_1,
    hasc: f.properties.HASC_1,
    iso: f.properties.ISO_1,
    country: f.properties.COUNTRY || country?.name
  }));

  return {
    level: 1,
    levelName: adminLevels[1]?.name || ADMIN_LEVELS[1].name,
    levelNameEn: adminLevels[1]?.nameEn || ADMIN_LEVELS[1].nameEn,
    countryCode: code,
    countryName: country?.name,
    count: regions.length,
    items: regions.sort((a, b) => a.name.localeCompare(b.name)),
    geojson: {
      type: 'FeatureCollection',
      features: features
    }
  };
}

/**
 * Get departments (Admin Level 2) optionally filtered by region
 * @param {string} regionName - Optional region name to filter by
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - Object with departments list and GeoJSON
 */
async function getDepartments(regionName = null, countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  let features = await getFeaturesByLevel(2, code);
  const adminLevels = getAdminLevels(code);
  const country = countriesConfig.getCountryByCode(code);
  
  if (regionName) {
    const normalizedRegion = regionName.toLowerCase().trim();
    features = features.filter(f => 
      f.properties.NAME_1?.toLowerCase().trim() === normalizedRegion
    );
  }

  const departments = features.map(f => ({
    id: f.properties.GID_2,
    name: f.properties.NAME_2,
    varName: f.properties.VARNAME_2,
    type: f.properties.TYPE_2,
    typeEn: f.properties.ENGTYPE_2,
    hasc: f.properties.HASC_2,
    region: f.properties.NAME_1,
    regionId: f.properties.GID_1
  }));

  return {
    level: 2,
    levelName: adminLevels[2]?.name || ADMIN_LEVELS[2].name,
    levelNameEn: adminLevels[2]?.nameEn || ADMIN_LEVELS[2].nameEn,
    countryCode: code,
    countryName: country?.name,
    filter: regionName ? { region: regionName } : null,
    count: departments.length,
    items: departments.sort((a, b) => a.name.localeCompare(b.name)),
    geojson: {
      type: 'FeatureCollection',
      features: features
    }
  };
}

/**
 * Get subdivisions/arrondissements (Admin Level 3) optionally filtered by department
 * @param {string} departmentName - Optional department name to filter by
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - Object with subdivisions list and GeoJSON
 */
async function getSubdivisions(departmentName = null, countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  let features = await getFeaturesByLevel(3, code);
  const adminLevels = getAdminLevels(code);
  const country = countriesConfig.getCountryByCode(code);
  
  if (departmentName) {
    const normalizedDept = departmentName.toLowerCase().trim();
    features = features.filter(f => 
      f.properties.NAME_2?.toLowerCase().trim() === normalizedDept
    );
  }

  const subdivisions = features.map(f => ({
    id: f.properties.GID_3,
    name: f.properties.NAME_3,
    varName: f.properties.VARNAME_3,
    type: f.properties.TYPE_3,
    typeEn: f.properties.ENGTYPE_3,
    hasc: f.properties.HASC_3,
    department: f.properties.NAME_2,
    departmentId: f.properties.GID_2,
    region: f.properties.NAME_1,
    regionId: f.properties.GID_1
  }));

  return {
    level: 3,
    levelName: adminLevels[3]?.name || ADMIN_LEVELS[3].name,
    levelNameEn: adminLevels[3]?.nameEn || ADMIN_LEVELS[3].nameEn,
    countryCode: code,
    countryName: country?.name,
    filter: departmentName ? { department: departmentName } : null,
    count: subdivisions.length,
    items: subdivisions.sort((a, b) => a.name.localeCompare(b.name)),
    geojson: {
      type: 'FeatureCollection',
      features: features
    }
  };
}

/**
 * Get villages (Admin Level 4) optionally filtered by subdivision
 * Uses point-in-polygon to determine which subdivision a village belongs to
 * @param {string} subdivisionName - Optional subdivision name to filter by
 * @param {boolean} usePolygons - Whether to return polygon data (Villages découpés)
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - Object with villages list and GeoJSON
 */
async function getVillages(subdivisionName = null, usePolygons = false, countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const adminLevels = getAdminLevels(code);
  const country = countriesConfig.getCountryByCode(code);
  
  const villagesData = usePolygons 
    ? await loadVillagesDecoupesData(code) 
    : await loadVillagesData(code);
  
  let features = villagesData.features || [];

  if (subdivisionName) {
    // Get the subdivision boundary
    const subdivisions = await getFeaturesByLevel(3, code);
    const normalizedSubdiv = subdivisionName.toLowerCase().trim();
    const subdivision = subdivisions.find(f => 
      f.properties.NAME_3?.toLowerCase().trim() === normalizedSubdiv
    );

    if (subdivision) {
      // Filter villages that are within the subdivision
      features = features.filter(village => {
        try {
          if (village.geometry.type === 'Point') {
            return turf.booleanPointInPolygon(village, subdivision);
          } else {
            // For polygons, check if centroid is within subdivision
            const centroid = turf.centroid(village);
            return turf.booleanPointInPolygon(centroid, subdivision);
          }
        } catch (e) {
          return false;
        }
      });
    } else {
      features = [];
    }
  }

  const villages = features.map(f => ({
    id: f.properties.osm_id || f.properties.id,
    name: f.properties.name,
    place: f.properties.place,
    coordinates: f.geometry.type === 'Point' 
      ? f.geometry.coordinates 
      : turf.centroid(f).geometry.coordinates,
    geometryType: f.geometry.type
  })).filter(v => v.name); // Only include villages with names

  return {
    level: 4,
    levelName: adminLevels[4]?.name || ADMIN_LEVELS[4].name,
    levelNameEn: adminLevels[4]?.nameEn || ADMIN_LEVELS[4].nameEn,
    countryCode: code,
    countryName: country?.name,
    filter: subdivisionName ? { subdivision: subdivisionName } : null,
    dataType: usePolygons ? 'polygons' : 'points',
    count: villages.length,
    items: villages.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    geojson: {
      type: 'FeatureCollection',
      features: features
    }
  };
}

/**
 * Get all boundaries for a country (all levels combined)
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - Object with all boundary data
 */
async function getAllBoundaries(countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const adminLevels = getAdminLevels(code);
  const country = countriesConfig.getCountryByCode(code);
  
  const [regions, departments, subdivisions] = await Promise.all([
    getRegions(code),
    getDepartments(null, code),
    getSubdivisions(null, code)
  ]);

  return {
    country: country?.name || 'Unknown',
    countryCode: code,
    countryNameFr: country?.nameFr,
    area: country?.area,
    center: country?.center,
    bounds: country?.bounds,
    levels: {
      1: {
        name: adminLevels[1]?.name || ADMIN_LEVELS[1].name,
        nameEn: adminLevels[1]?.nameEn || ADMIN_LEVELS[1].nameEn,
        count: regions.count
      },
      2: {
        name: adminLevels[2]?.name || ADMIN_LEVELS[2].name,
        nameEn: adminLevels[2]?.nameEn || ADMIN_LEVELS[2].nameEn,
        count: departments.count
      },
      3: {
        name: adminLevels[3]?.name || ADMIN_LEVELS[3].name,
        nameEn: adminLevels[3]?.nameEn || ADMIN_LEVELS[3].nameEn,
        count: subdivisions.count
      }
    },
    geojson: {
      type: 'FeatureCollection',
      features: [
        ...regions.geojson.features,
        ...departments.geojson.features,
        ...subdivisions.geojson.features
      ]
    }
  };
}

/**
 * Clip a GeoJSON feature to country boundaries
 * @param {Object} feature - GeoJSON feature to clip
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - Clipped feature
 */
async function clipToCountry(feature, countryCode = DEFAULT_COUNTRY_CODE) {
  const boundary = await getCountryBoundary(countryCode);
  
  try {
    if (feature.geometry.type === 'Point') {
      // For points, check if within boundary
      if (turf.booleanPointInPolygon(feature, boundary)) {
        return feature;
      }
      return null;
    } else {
      // For polygons, intersect with boundary
      const clipped = turf.intersect(
        turf.featureCollection([feature, boundary])
      );
      return clipped;
    }
  } catch (error) {
    console.warn('Warning: Could not clip feature:', error.message);
    return feature;
  }
}

/**
 * Clip a GeoJSON feature to Cameroon boundaries (backward compatibility)
 * @deprecated Use clipToCountry(feature, 'CMR') instead
 * @param {Object} feature - GeoJSON feature to clip
 * @returns {Promise<Object>} - Clipped feature
 */
async function clipToCameroon(feature) {
  return clipToCountry(feature, 'CMR');
}

/**
 * Get hierarchical data for a specific location
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Object>} - Hierarchical administrative data
 */
async function getHierarchyForPoint(lng, lat, countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const point = turf.point([lng, lat]);
  const admin123 = await loadAdmin123Data(code);
  const country = countriesConfig.getCountryByCode(code);

  const result = {
    coordinates: { lng, lat },
    countryCode: code,
    countryName: country?.name,
    region: null,
    department: null,
    subdivision: null
  };

  // Find region
  const regions = admin123.features.filter(f => 
    f.properties.GID_1 && !f.properties.GID_2 && !f.properties.GID_3
  );
  for (const region of regions) {
    if (turf.booleanPointInPolygon(point, region)) {
      result.region = {
        id: region.properties.GID_1,
        name: region.properties.NAME_1
      };
      break;
    }
  }

  // Find department
  const departments = admin123.features.filter(f => 
    f.properties.GID_2 && !f.properties.GID_3
  );
  for (const dept of departments) {
    if (turf.booleanPointInPolygon(point, dept)) {
      result.department = {
        id: dept.properties.GID_2,
        name: dept.properties.NAME_2
      };
      break;
    }
  }

  // Find subdivision
  const subdivisions = admin123.features.filter(f => f.properties.GID_3);
  for (const subdiv of subdivisions) {
    if (turf.booleanPointInPolygon(point, subdiv)) {
      result.subdivision = {
        id: subdiv.properties.GID_3,
        name: subdiv.properties.NAME_3
      };
      break;
    }
  }

  return result;
}

/**
 * Search administrative units by name
 * @param {string} query - Search query
 * @param {number} level - Optional level to search in (1, 2, 3, or 4)
 * @param {string} countryCode - ISO country code (default: CMR)
 * @returns {Promise<Array>} - Matching administrative units
 */
async function searchAdministrativeUnits(query, level = null, countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const normalizedQuery = query.toLowerCase().trim();
  const results = [];

  if (!level || level === 1) {
    const regions = await getRegions(code);
    const matchingRegions = regions.items.filter(r => 
      r.name.toLowerCase().includes(normalizedQuery) ||
      (r.varName && r.varName.toLowerCase().includes(normalizedQuery))
    );
    results.push(...matchingRegions.map(r => ({ ...r, level: 1, levelName: 'Region', countryCode: code })));
  }

  if (!level || level === 2) {
    const departments = await getDepartments(null, code);
    const matchingDepts = departments.items.filter(d => 
      d.name.toLowerCase().includes(normalizedQuery) ||
      (d.varName && d.varName.toLowerCase().includes(normalizedQuery))
    );
    results.push(...matchingDepts.map(d => ({ ...d, level: 2, levelName: 'Department', countryCode: code })));
  }

  if (!level || level === 3) {
    const subdivisions = await getSubdivisions(null, code);
    const matchingSubdivs = subdivisions.items.filter(s => 
      s.name.toLowerCase().includes(normalizedQuery) ||
      (s.varName && s.varName.toLowerCase().includes(normalizedQuery))
    );
    results.push(...matchingSubdivs.map(s => ({ ...s, level: 3, levelName: 'Subdivision', countryCode: code })));
  }

  if (!level || level === 4) {
    try {
      const villages = await getVillages(null, false, code);
      const matchingVillages = villages.items.filter(v => 
        v.name && v.name.toLowerCase().includes(normalizedQuery)
      );
      results.push(...matchingVillages.slice(0, 50).map(v => ({ ...v, level: 4, levelName: 'Village', countryCode: code })));
    } catch (e) {
      // Villages data may not be available for all countries
    }
  }

  return results;
}

/**
 * Clear the cache
 * @param {string} countryCode - Optional: clear only specific country cache
 */
function clearCache(countryCode = null) {
  if (countryCode) {
    const code = countryCode.toUpperCase();
    cache.adminData.delete(code);
    cache.villages.delete(code);
    cache.villagesDecoupes.delete(code);
    cache.countryBoundaries.delete(code);
    // Clear related lastLoaded entries
    Object.keys(cache.lastLoaded).forEach(key => {
      if (key.includes(`_${code}`)) {
        delete cache.lastLoaded[key];
      }
    });
    console.log(`✅ Administrative data cache cleared for ${code}`);
  } else {
    cache.adminData.clear();
    cache.villages.clear();
    cache.villagesDecoupes.clear();
    cache.countryBoundaries.clear();
    cache.lastLoaded = {};
    console.log('✅ All administrative data cache cleared');
  }
}

/**
 * Get list of supported countries
 * @returns {Array} - List of supported countries
 */
function getSupportedCountries() {
  return countriesConfig.getCountryList();
}

/**
 * Get country configuration
 * @param {string} countryCode - ISO country code
 * @returns {Object|null} - Country configuration
 */
function getCountryConfig(countryCode) {
  return countriesConfig.getCountryByCode(countryCode);
}

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
function getCacheStats() {
  const adminDataStats = {};
  for (const [code, data] of cache.adminData) {
    adminDataStats[code] = {
      loaded: true,
      featureCount: data?.features?.length || 0,
      lastLoaded: cache.lastLoaded[`admin123_${code}`] 
        ? new Date(cache.lastLoaded[`admin123_${code}`]).toISOString() 
        : null
    };
  }

  const villagesStats = {};
  for (const [code, data] of cache.villages) {
    villagesStats[code] = {
      loaded: true,
      featureCount: data?.features?.length || 0,
      lastLoaded: cache.lastLoaded[`villages_${code}`] 
        ? new Date(cache.lastLoaded[`villages_${code}`]).toISOString() 
        : null
    };
  }

  const villagesDecoupesStats = {};
  for (const [code, data] of cache.villagesDecoupes) {
    villagesDecoupesStats[code] = {
      loaded: true,
      featureCount: data?.features?.length || 0,
      lastLoaded: cache.lastLoaded[`villagesDecoupes_${code}`] 
        ? new Date(cache.lastLoaded[`villagesDecoupes_${code}`]).toISOString() 
        : null
    };
  }

  const countryBoundaryStats = {};
  for (const [code, data] of cache.countryBoundaries) {
    countryBoundaryStats[code] = {
      loaded: true,
      lastLoaded: cache.lastLoaded[`countryBoundary_${code}`] 
        ? new Date(cache.lastLoaded[`countryBoundary_${code}`]).toISOString() 
        : null
    };
  }

  return {
    adminData: adminDataStats,
    villages: villagesStats,
    villagesDecoupes: villagesDecoupesStats,
    countryBoundaries: countryBoundaryStats,
    cameroonBoundary: {
      loaded: !!cache.cameroonBoundary,
      lastLoaded: cache.lastLoaded.cameroonBoundary ? new Date(cache.lastLoaded.cameroonBoundary).toISOString() : null
    },
    cacheTTL: CACHE_TTL
  };
}

module.exports = {
  // Data loading
  loadAdmin123Data,
  loadGADMData,
  loadVillagesData,
  loadVillagesDecoupesData,
  getCountryBoundary,
  getCameroonBoundary, // Deprecated, for backward compatibility
  
  // Level-based queries
  getFeaturesByLevel,
  getRegions,
  getDepartments,
  getSubdivisions,
  getVillages,
  getAllBoundaries,
  getAdminLevels,
  
  // Spatial operations
  clipToCountry,
  clipToCameroon, // Deprecated, for backward compatibility
  getHierarchyForPoint,
  
  // Search
  searchAdministrativeUnits,
  
  // Cache management
  clearCache,
  getCacheStats,
  
  // Country support
  getSupportedCountries,
  getCountryConfig,
  
  // Constants
  ADMIN_LEVELS,
  DEFAULT_ADMIN_LEVELS,
  DATA_PATH,
  DEFAULT_COUNTRY_CODE
};
