/**
 * Location Service - Handles administrative location data from GeoJSON
 * Provides cascading dropdown data for Région, Département, Arrondissement
 */

// Cache for loaded GeoJSON data
let adminDataCache = null;
let locationOptionsCache = null;

/**
 * Load and parse the Admin GeoJSON file
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function loadAdminGeoJSON() {
  if (adminDataCache) {
    return adminDataCache;
  }

  try {
    const response = await fetch('/data/Admin123CMR fusionnées.geojson');
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.status}`);
    }
    adminDataCache = await response.json();
    return adminDataCache;
  } catch (error) {
    console.error('Error loading admin GeoJSON:', error);
    throw error;
  }
}

/**
 * Extract unique location options from GeoJSON data
 * @returns {Promise<Object>} Object with regions, departments (Map), arrondissements (Map)
 */
export async function getLocationOptions() {
  if (locationOptionsCache) {
    return locationOptionsCache;
  }

  const adminData = await loadAdminGeoJSON();
  
  if (!adminData?.features) {
    return { regions: [], departments: new Map(), arrondissements: new Map() };
  }

  const regions = new Set();
  const departments = new Map(); // Map<region, Set<department>>
  const arrondissements = new Map(); // Map<department, Set<arrondissement>>

  adminData.features.forEach(f => {
    const props = f.properties || {};
    
    // Extract NAME_1 (Region), NAME_2 (Department), NAME_3 (Arrondissement)
    const region = props.NAME_1;
    const department = props.NAME_2;
    const arrondissement = props.NAME_3;
    
    // Add region
    if (region) {
      regions.add(region);
      
      // Add department under region
      if (department) {
        if (!departments.has(region)) departments.set(region, new Set());
        departments.get(region).add(department);
        
        // Add arrondissement under department
        if (arrondissement) {
          if (!arrondissements.has(department)) arrondissements.set(department, new Set());
          arrondissements.get(department).add(arrondissement);
        }
      }
    }
  });

  locationOptionsCache = {
    regions: Array.from(regions).sort(),
    departments,
    arrondissements
  };

  return locationOptionsCache;
}

/**
 * Get departments for a specific region
 * @param {string} region - Region name (NAME_1)
 * @returns {Promise<string[]>} Array of department names
 */
export async function getDepartmentsByRegion(region) {
  const options = await getLocationOptions();
  const depts = options.departments.get(region);
  return depts ? Array.from(depts).sort() : [];
}

/**
 * Get arrondissements for a specific department
 * @param {string} department - Department name (NAME_2)
 * @returns {Promise<string[]>} Array of arrondissement names
 */
export async function getArrondissementsByDepartment(department) {
  const options = await getLocationOptions();
  const arrs = options.arrondissements.get(department);
  return arrs ? Array.from(arrs).sort() : [];
}

/**
 * Get all regions
 * @returns {Promise<string[]>} Array of region names
 */
export async function getRegions() {
  const options = await getLocationOptions();
  return options.regions;
}

/**
 * Clear the cache (useful for testing or when data changes)
 */
export function clearLocationCache() {
  adminDataCache = null;
  locationOptionsCache = null;
}

export default {
  loadAdminGeoJSON,
  getLocationOptions,
  getDepartmentsByRegion,
  getArrondissementsByDepartment,
  getRegions,
  clearLocationCache
};
