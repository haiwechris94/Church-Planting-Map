/**
 * Demographic Service
 * Handles population data lookup and village-to-department mapping
 * 
 * This service:
 * 1. Loads and parses population CSV data from HumData.org
 * 2. Maps villages to their parent departments using coordinates
 * 3. Returns demographic information for villages
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const turf = require('@turf/turf');

// Data paths
const POPULATION_DATA_DIR = path.join(__dirname, '../data/population');
const ADMIN_DATA_PATH = path.join(__dirname, '../../frontend/public/data/Admin123CMR fusionnées.geojson');

// Cache for loaded data
const cache = {
  populationData: null,
  adminBoundaries: null,
  departmentPopulations: new Map(),
  regionPopulations: new Map(),
  lastLoaded: null
};

// Cache TTL (1 hour)
const CACHE_TTL = 60 * 60 * 1000;

/**
 * Parse CSV file and return array of records
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Load administrative boundaries GeoJSON
 */
async function loadAdminBoundaries() {
  if (cache.adminBoundaries && (Date.now() - cache.lastLoaded) < CACHE_TTL) {
    return cache.adminBoundaries;
  }

  try {
    const content = fs.readFileSync(ADMIN_DATA_PATH, 'utf-8');
    cache.adminBoundaries = JSON.parse(content);
    console.log(`✅ Loaded admin boundaries: ${cache.adminBoundaries.features?.length || 0} features`);
    return cache.adminBoundaries;
  } catch (error) {
    console.error('❌ Error loading admin boundaries:', error.message);
    throw error;
  }
}

/**
 * Load and parse population data from CSV files
 */
async function loadPopulationData() {
  if (cache.populationData && (Date.now() - cache.lastLoaded) < CACHE_TTL) {
    return cache.populationData;
  }

  const populationData = {
    adm0: null, // Country level
    adm1: [],   // Region level
    adm2: []    // Department level
  };

  try {
    // Check if data directory exists
    if (!fs.existsSync(POPULATION_DATA_DIR)) {
      console.warn('⚠️ Population data directory not found. Run downloadPopulationData.js first.');
      return populationData;
    }

    const files = fs.readdirSync(POPULATION_DATA_DIR);
    
    for (const file of files) {
      if (!file.endsWith('.csv')) continue;
      
      const filePath = path.join(POPULATION_DATA_DIR, file);
      console.log(`📊 Loading population data from: ${file}`);
      
      try {
        const records = await parseCSV(filePath);
        
        if (records.length === 0) {
          console.warn(`   ⚠️ No records found in ${file}`);
          continue;
        }

        // Determine admin level from filename or content
        const firstRecord = records[0];
        const columns = Object.keys(firstRecord);
        
        console.log(`   Columns: ${columns.slice(0, 10).join(', ')}...`);
        console.log(`   Records: ${records.length}`);

        // Parse based on admin level - check filename first, then columns
        // ADM0 = country level (no ADM1 columns)
        // ADM1 = region level (has ADM1 but no ADM2)
        // ADM2 = department level (has ADM2)
        if (file.includes('adm0') && !file.includes('adm1')) {
          populationData.adm0 = parseAdm0Data(records);
          console.log(`   ✅ Parsed as ADM0 (country level)`);
        } else if (file.includes('adm1') && !file.includes('adm2')) {
          populationData.adm1 = parseAdm1Data(records);
          console.log(`   ✅ Parsed as ADM1 (region level): ${populationData.adm1.length} regions`);
        } else if (file.includes('adm2') || file.includes('admpop2')) {
          populationData.adm2 = parseAdm2Data(records);
          console.log(`   ✅ Parsed as ADM2 (department level): ${populationData.adm2.length} departments`);
        } else {
          // Try to auto-detect based on columns
          if (columns.some(c => c.includes('ADM2'))) {
            populationData.adm2 = parseAdm2Data(records);
            console.log(`   ✅ Auto-detected as ADM2: ${populationData.adm2.length} departments`);
          } else if (columns.some(c => c.includes('ADM1'))) {
            populationData.adm1 = parseAdm1Data(records);
            console.log(`   ✅ Auto-detected as ADM1: ${populationData.adm1.length} regions`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error parsing ${file}:`, error.message);
      }
    }

    cache.populationData = populationData;
    cache.lastLoaded = Date.now();

    // Build lookup maps
    buildPopulationMaps(populationData);

    console.log(`\n📊 Population Data Summary:`);
    console.log(`   Country (ADM0): ${populationData.adm0 ? 'Loaded' : 'Not available'}`);
    console.log(`   Regions (ADM1): ${populationData.adm1.length} records`);
    console.log(`   Departments (ADM2): ${populationData.adm2.length} records`);

    return populationData;
  } catch (error) {
    console.error('❌ Error loading population data:', error.message);
    throw error;
  }
}

/**
 * Parse ADM0 (country level) data
 * HumData CSV columns: ADM0_EN, ADM0_FR, ADM0_PCODE, T_TL, M_TL, F_TL
 */
function parseAdm0Data(records) {
  const record = records[0];
  return {
    name: record.ADM0_EN || record.ADM0_FR || record.ADM0_NAME || 'Cameroon',
    nameFr: record.ADM0_FR || record.ADM0_EN,
    code: record.ADM0_PCODE || 'CM',
    totalPopulation: parsePopulation(record.T_TL),
    malePopulation: parsePopulation(record.M_TL),
    femalePopulation: parsePopulation(record.F_TL),
    year: record.Year || 2025
  };
}

/**
 * Parse ADM1 (region level) data
 * HumData CSV columns: ADM1_EN, ADM1_FR, ADM1_PCODE, T_TL, M_TL, F_TL
 */
function parseAdm1Data(records) {
  return records.map(record => {
    // Get the English name (preferred) or French name
    const nameEn = record.ADM1_EN || record.ADM1_NAME;
    const nameFr = record.ADM1_FR;
    const displayName = nameEn || nameFr;
    
    return {
      name: displayName,
      nameNormalized: normalizeAdminName(displayName),
      nameFr: nameFr,
      code: record.ADM1_PCODE,
      totalPopulation: parsePopulation(record.T_TL),
      malePopulation: parsePopulation(record.M_TL),
      femalePopulation: parsePopulation(record.F_TL),
      // Age demographics - sum age groups
      children: parsePopulation(record.T_00_04) + parsePopulation(record.T_05_09) + parsePopulation(record.T_10_14),
      youth: parsePopulation(record.T_15_19) + parsePopulation(record.T_20_24),
      adults: parsePopulation(record.T_25_29) + parsePopulation(record.T_30_34) + parsePopulation(record.T_35_39) + 
              parsePopulation(record.T_40_44) + parsePopulation(record.T_45_49) + parsePopulation(record.T_50_54) +
              parsePopulation(record.T_55_59),
      elderly: parsePopulation(record.T_60_64) + parsePopulation(record.T_65_69) + parsePopulation(record.T_70_74) +
               parsePopulation(record.T_75_79) + parsePopulation(record.T_80Plus),
      year: record.Year || 2025
    };
  }).filter(r => r.name);
}

/**
 * Parse ADM2 (department level) data
 * HumData CSV columns: ADM2_EN, ADM2_FR, ADM2_PCODE, ADM1_EN, ADM1_FR, T_TL, M_TL, F_TL
 */
function parseAdm2Data(records) {
  return records.map(record => {
    // Get the English name (preferred) or French name
    const nameEn = record.ADM2_EN || record.ADM2_NAME;
    const nameFr = record.ADM2_FR;
    const displayName = nameEn || nameFr;
    
    const regionNameEn = record.ADM1_EN || record.ADM1_NAME;
    const regionNameFr = record.ADM1_FR;
    
    return {
      name: displayName,
      nameNormalized: normalizeAdminName(displayName),
      nameFr: nameFr,
      code: record.ADM2_PCODE,
      regionName: regionNameEn || regionNameFr,
      regionNameNormalized: normalizeAdminName(regionNameEn || regionNameFr),
      regionCode: record.ADM1_PCODE,
      totalPopulation: parsePopulation(record.T_TL),
      malePopulation: parsePopulation(record.M_TL),
      femalePopulation: parsePopulation(record.F_TL),
      // Age demographics - sum age groups
      children: parsePopulation(record.T_00_04) + parsePopulation(record.T_05_09) + parsePopulation(record.T_10_14),
      youth: parsePopulation(record.T_15_19) + parsePopulation(record.T_20_24),
      adults: parsePopulation(record.T_25_29) + parsePopulation(record.T_30_34) + parsePopulation(record.T_35_39) + 
              parsePopulation(record.T_40_44) + parsePopulation(record.T_45_49) + parsePopulation(record.T_50_54) +
              parsePopulation(record.T_55_59),
      elderly: parsePopulation(record.T_60_64) + parsePopulation(record.T_65_69) + parsePopulation(record.T_70_74) +
               parsePopulation(record.T_75_79) + parsePopulation(record.T_80Plus),
      year: record.Year || 2025
    };
  }).filter(r => r.name);
}

/**
 * Parse population value (handle various formats)
 */
function parsePopulation(value) {
  if (!value) return 0;
  if (typeof value === 'number') return Math.round(value);
  
  // Remove commas and parse
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalize administrative name for matching
 */
function normalizeAdminName(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')    // Remove special chars
    .replace(/\s+/g, ' ');           // Normalize spaces
}

/**
 * Build lookup maps for quick population queries
 */
function buildPopulationMaps(populationData) {
  cache.departmentPopulations.clear();
  cache.regionPopulations.clear();

  // Build department map
  for (const dept of populationData.adm2) {
    // Use pre-normalized name if available, otherwise normalize
    const key = dept.nameNormalized || normalizeAdminName(dept.name);
    cache.departmentPopulations.set(key, dept);
    
    // Also add with region prefix for disambiguation
    if (dept.regionName) {
      const regionKey = dept.regionNameNormalized || normalizeAdminName(dept.regionName);
      const keyWithRegion = `${regionKey}_${key}`;
      cache.departmentPopulations.set(keyWithRegion, dept);
    }
  }

  // Build region map
  for (const region of populationData.adm1) {
    const key = region.nameNormalized || normalizeAdminName(region.name);
    cache.regionPopulations.set(key, region);
    
    // Also add French name variant if different
    if (region.nameFr && region.nameFr !== region.name) {
      const frKey = normalizeAdminName(region.nameFr);
      cache.regionPopulations.set(frKey, region);
    }
  }

  console.log(`   Built lookup maps: ${cache.departmentPopulations.size} departments, ${cache.regionPopulations.size} regions`);
}

/**
 * Find department containing a point using admin boundaries
 */
async function findDepartmentForPoint(lng, lat) {
  const adminData = await loadAdminBoundaries();
  const point = turf.point([lng, lat]);

  // Find department (ADM2) containing the point
  const departments = adminData.features.filter(f => 
    f.properties.GID_2 && !f.properties.GID_3
  );

  for (const dept of departments) {
    try {
      if (turf.booleanPointInPolygon(point, dept)) {
        return {
          name: dept.properties.NAME_2,
          region: dept.properties.NAME_1,
          gid: dept.properties.GID_2
        };
      }
    } catch (e) {
      // Skip invalid geometries
    }
  }

  return null;
}

/**
 * Get population data for a department by name
 */
function getDepartmentPopulation(departmentName, regionName = null) {
  const key = normalizeAdminName(departmentName);
  
  // Try direct lookup
  let data = cache.departmentPopulations.get(key);
  
  // Try with region prefix if provided
  if (!data && regionName) {
    const keyWithRegion = `${normalizeAdminName(regionName)}_${key}`;
    data = cache.departmentPopulations.get(keyWithRegion);
  }

  // Try fuzzy match if exact match fails
  if (!data) {
    for (const [mapKey, mapData] of cache.departmentPopulations) {
      if (mapKey.includes(key) || key.includes(mapKey)) {
        data = mapData;
        break;
      }
    }
  }

  return data;
}

/**
 * Get population data for a region by name
 */
function getRegionPopulation(regionName) {
  const key = normalizeAdminName(regionName);
  return cache.regionPopulations.get(key);
}

/**
 * Get demographics for a village based on its location
 * Maps village to department and returns department-level population data
 */
async function getVillageDemographics(village) {
  // Ensure population data is loaded
  await loadPopulationData();

  const result = {
    villageName: village.name,
    villageId: village._id,
    mapped: false,
    department: null,
    region: null,
    demographics: null,
    source: null,
    error: null
  };

  try {
    // Method 1: Use existing department field if available
    if (village.departement) {
      const deptData = getDepartmentPopulation(village.departement, village.region);
      if (deptData) {
        result.mapped = true;
        result.department = village.departement;
        result.region = village.region || deptData.regionName;
        result.demographics = deptData;
        result.source = 'existing_field';
        return result;
      }
    }

    // Method 2: Use coordinates to find department
    if (village.location?.coordinates) {
      const [lng, lat] = village.location.coordinates;
      const deptInfo = await findDepartmentForPoint(lng, lat);
      
      if (deptInfo) {
        const deptData = getDepartmentPopulation(deptInfo.name, deptInfo.region);
        result.mapped = true;
        result.department = deptInfo.name;
        result.region = deptInfo.region;
        result.demographics = deptData || {
          name: deptInfo.name,
          regionName: deptInfo.region,
          totalPopulation: 0,
          note: 'Department found but no population data available'
        };
        result.source = 'coordinates';
        return result;
      }
    }

    // Method 3: Use region field to get region-level data
    if (village.region) {
      const regionData = getRegionPopulation(village.region);
      if (regionData) {
        result.mapped = true;
        result.region = village.region;
        result.demographics = regionData;
        result.source = 'region_fallback';
        return result;
      }
    }

    result.error = 'Could not map village to any administrative area';
    return result;

  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Estimate village population based on department data
 * Uses a simple distribution model based on number of villages in department
 */
async function estimateVillagePopulation(village, villagesInDepartment = 1) {
  const demographics = await getVillageDemographics(village);
  
  if (!demographics.mapped || !demographics.demographics?.totalPopulation) {
    return {
      ...demographics,
      estimatedPopulation: 0,
      confidence: 'none'
    };
  }

  const deptPopulation = demographics.demographics.totalPopulation;
  
  // Simple estimation: divide department population by number of villages
  // This is a rough estimate - real village populations vary significantly
  const estimatedPopulation = Math.round(deptPopulation / Math.max(villagesInDepartment, 1));
  
  // Determine confidence level
  let confidence = 'low';
  if (villagesInDepartment > 0 && villagesInDepartment < 50) {
    confidence = 'medium';
  } else if (villagesInDepartment >= 50) {
    confidence = 'low';
  }

  return {
    ...demographics,
    estimatedPopulation,
    villagesInDepartment,
    confidence,
    note: `Estimated by dividing department population (${deptPopulation.toLocaleString()}) by ${villagesInDepartment} villages`
  };
}

/**
 * Get all loaded population data
 */
async function getAllPopulationData() {
  return await loadPopulationData();
}

/**
 * Clear the cache
 */
function clearCache() {
  cache.populationData = null;
  cache.adminBoundaries = null;
  cache.departmentPopulations.clear();
  cache.regionPopulations.clear();
  cache.lastLoaded = null;
  console.log('✅ Demographic service cache cleared');
}

/**
 * Get service statistics
 */
async function getStats() {
  await loadPopulationData();
  
  return {
    dataLoaded: !!cache.populationData,
    lastLoaded: cache.lastLoaded ? new Date(cache.lastLoaded).toISOString() : null,
    departments: cache.departmentPopulations.size,
    regions: cache.regionPopulations.size,
    countryData: cache.populationData?.adm0 || null
  };
}

module.exports = {
  loadPopulationData,
  loadAdminBoundaries,
  getVillageDemographics,
  estimateVillagePopulation,
  getDepartmentPopulation,
  getRegionPopulation,
  findDepartmentForPoint,
  getAllPopulationData,
  clearCache,
  getStats,
  normalizeAdminName
};
