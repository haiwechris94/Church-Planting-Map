/**
 * Boundaries Routes
 * Endpoints for serving administrative boundary data
 * Multi-country support: All 54 African countries
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const countriesConfig = require('../config/countries');
const administrativeService = require('../services/administrativeService');

// Base path for boundary data files
const BOUNDARIES_PATH = path.join(__dirname, '../../frontend/public/data');

// Default country code for backward compatibility
const DEFAULT_COUNTRY_CODE = countriesConfig.DEFAULT_COUNTRY_CODE;

/**
 * GET /api/boundaries/countries
 * Get list of all supported African countries
 */
router.get('/countries', async (req, res) => {
  try {
    const countries = countriesConfig.getCountryList();
    const regions = countriesConfig.getRegions();
    
    res.json({
      success: true,
      totalCountries: countries.length,
      regions,
      countries
    });
  } catch (error) {
    console.error('Error getting countries list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get countries list',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/countries/:countryCode
 * Get detailed information about a specific country
 */
router.get('/countries/:countryCode', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const country = countriesConfig.getCountryByCode(countryCode);
    
    if (!country) {
      return res.status(404).json({
        success: false,
        error: 'Country not found',
        message: `No country found with code: ${countryCode}. Use ISO 3166-1 alpha-3 codes.`
      });
    }
    
    res.json({
      success: true,
      country
    });
  } catch (error) {
    console.error('Error getting country info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get country info',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries
 * Get list of available boundary files (default: Cameroon for backward compatibility)
 */
router.get('/', async (req, res) => {
  try {
    const { countryCode = DEFAULT_COUNTRY_CODE } = req.query;
    const code = countryCode.toUpperCase();
    
    const files = await fs.readdir(BOUNDARIES_PATH);
    const boundaryFiles = files.filter(file => file.startsWith(`gadm41_${code}_`));
    
    const boundaries = boundaryFiles.map(file => {
      const level = file.match(new RegExp(`gadm41_${code}_(\\d+)\\.json`))?.[1];
      return {
        level: parseInt(level),
        name: getLevelName(parseInt(level), code),
        filename: file,
        url: `/api/boundaries/${code}/level/${level}`
      };
    }).filter(b => !isNaN(b.level));

    const country = countriesConfig.getCountryByCode(code);

    res.json({
      success: true,
      countryCode: code,
      countryName: country?.name || 'Unknown',
      count: boundaries.length,
      boundaries: boundaries.sort((a, b) => a.level - b.level)
    });
  } catch (error) {
    console.error('Error reading boundary files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read boundary files',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/:countryCode/levels
 * Get available admin levels for a specific country
 */
router.get('/:countryCode/levels', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const code = countryCode.toUpperCase();
    
    if (!countriesConfig.isValidCountryCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code',
        message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
      });
    }
    
    const country = countriesConfig.getCountryByCode(code);
    const adminLevels = administrativeService.getAdminLevels(code);
    
    // Check which GADM files are available
    const files = await fs.readdir(BOUNDARIES_PATH);
    const availableLevels = [];
    
    for (let level = 0; level <= 4; level++) {
      const filename = `gadm41_${code}_${level}.json`;
      if (files.includes(filename)) {
        availableLevels.push({
          level,
          name: adminLevels[level]?.name || getLevelName(level, code),
          nameEn: adminLevels[level]?.nameEn || getLevelName(level, code),
          filename,
          url: `/api/boundaries/${code}/level/${level}`,
          available: true
        });
      }
    }
    
    res.json({
      success: true,
      countryCode: code,
      countryName: country.name,
      countryNameFr: country.nameFr,
      gadmAvailable: country.gadmAvailable,
      maxGadmLevel: country.gadmLevels,
      levels: availableLevels,
      adminLevelConfig: country.adminLevels
    });
  } catch (error) {
    console.error('Error getting admin levels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admin levels',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/:countryCode/level/:level
 * Get boundary data for a specific country and administrative level
 */
router.get('/:countryCode/level/:level', async (req, res) => {
  try {
    const { countryCode, level } = req.params;
    const code = countryCode.toUpperCase();
    
    // Validate country code
    if (!countriesConfig.isValidCountryCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code',
        message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
      });
    }
    
    // Validate level
    if (!['0', '1', '2', '3', '4'].includes(level)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid level',
        message: 'Level must be 0 (Country), 1 (Regions), 2 (Departments), 3 (Subdivisions), or 4 (Localities)'
      });
    }

    const filename = `gadm41_${code}_${level}.json`;
    const filePath = path.join(BOUNDARIES_PATH, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `Boundary file for ${code} level ${level} not found. File: ${filename}`
      });
    }

    // Read and parse the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const boundaryData = JSON.parse(fileContent);
    
    const country = countriesConfig.getCountryByCode(code);

    res.json({
      success: true,
      countryCode: code,
      countryName: country?.name,
      level: parseInt(level),
      levelName: getLevelName(parseInt(level), code),
      featureCount: boundaryData.features?.length || 0,
      data: boundaryData
    });
  } catch (error) {
    console.error('Error reading boundary file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read boundary file',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/:countryCode/all
 * Get all boundaries for a country (all levels combined)
 */
router.get('/:countryCode/all', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const code = countryCode.toUpperCase();
    
    if (!countriesConfig.isValidCountryCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code',
        message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
      });
    }
    
    const result = await administrativeService.getAllBoundaries(code);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting all boundaries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get boundaries',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/:countryCode/regions
 * Get all regions for a specific country
 */
router.get('/:countryCode/regions', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const code = countryCode.toUpperCase();
    
    if (!countriesConfig.isValidCountryCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code',
        message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
      });
    }
    
    const result = await administrativeService.getRegions(code);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting regions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get regions',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/:countryCode/departments
 * Get all departments for a specific country
 */
router.get('/:countryCode/departments', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { region } = req.query;
    const code = countryCode.toUpperCase();
    
    if (!countriesConfig.isValidCountryCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code',
        message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
      });
    }
    
    const result = await administrativeService.getDepartments(region || null, code);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get departments',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/:countryCode/subdivisions
 * Get all subdivisions for a specific country
 */
router.get('/:countryCode/subdivisions', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { department } = req.query;
    const code = countryCode.toUpperCase();
    
    if (!countriesConfig.isValidCountryCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code',
        message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
      });
    }
    
    const result = await administrativeService.getSubdivisions(department || null, code);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting subdivisions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subdivisions',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/:countryCode/boundary
 * Get the outer boundary of a country
 */
router.get('/:countryCode/boundary', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const code = countryCode.toUpperCase();
    
    if (!countriesConfig.isValidCountryCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code',
        message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
      });
    }
    
    const boundary = await administrativeService.getCountryBoundary(code);
    const country = countriesConfig.getCountryByCode(code);
    
    res.json({
      success: true,
      countryCode: code,
      countryName: country?.name,
      area: country?.area,
      center: country?.center,
      bounds: country?.bounds,
      boundary
    });
  } catch (error) {
    console.error('Error getting country boundary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get country boundary',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/:countryCode/point
 * Get administrative hierarchy for a point in a specific country
 */
router.get('/:countryCode/point', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { lng, lat } = req.query;
    const code = countryCode.toUpperCase();
    
    if (!countriesConfig.isValidCountryCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code',
        message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
      });
    }
    
    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameters',
        message: 'Both lng and lat query parameters are required'
      });
    }
    
    const result = await administrativeService.getHierarchyForPoint(
      parseFloat(lng), 
      parseFloat(lat),
      code
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting hierarchy for point:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hierarchy',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/level/:level
 * Get boundary data for a specific administrative level
 * @param level - Administrative level (1, 2, or 3)
 */
router.get('/level/:level', async (req, res) => {
  try {
    const { level } = req.params;
    
    // Validate level
    if (!['1', '2', '3'].includes(level)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid level',
        message: 'Level must be 1 (Regions), 2 (Departments), or 3 (Arrondissements)'
      });
    }

    const filename = `gadm41_CMR_${level}.json`;
    const filePath = path.join(BOUNDARIES_PATH, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `Boundary file for level ${level} not found`
      });
    }

    // Read and parse the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const boundaryData = JSON.parse(fileContent);

    res.json({
      success: true,
      level: parseInt(level),
      levelName: getLevelName(parseInt(level)),
      data: boundaryData
    });
  } catch (error) {
    console.error('Error reading boundary file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read boundary file',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/regions
 * Get all regions (Level 1)
 */
router.get('/regions', async (req, res) => {
  try {
    const filePath = path.join(BOUNDARIES_PATH, 'gadm41_CMR_1.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const boundaryData = JSON.parse(fileContent);

    // Extract region names and basic info
    const regions = boundaryData.features.map(feature => ({
      id: feature.properties.GID_1,
      name: feature.properties.NAME_1,
      type: feature.properties.TYPE_1,
      engType: feature.properties.ENGTYPE_1,
      hasc: feature.properties.HASC_1,
      iso: feature.properties.ISO_1
    }));

    res.json({
      success: true,
      count: regions.length,
      regions
    });
  } catch (error) {
    console.error('Error reading regions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read regions',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/departments
 * Get all departments (Level 2)
 */
router.get('/departments', async (req, res) => {
  try {
    const filePath = path.join(BOUNDARIES_PATH, 'gadm41_CMR_2.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const boundaryData = JSON.parse(fileContent);

    // Extract department names and basic info
    const departments = boundaryData.features.map(feature => ({
      id: feature.properties.GID_2,
      name: feature.properties.NAME_2,
      region: feature.properties.NAME_1,
      regionId: feature.properties.GID_1,
      type: feature.properties.TYPE_2,
      engType: feature.properties.ENGTYPE_2
    }));

    res.json({
      success: true,
      count: departments.length,
      departments
    });
  } catch (error) {
    console.error('Error reading departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read departments',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/arrondissements
 * Get all arrondissements (Level 3)
 */
router.get('/arrondissements', async (req, res) => {
  try {
    const filePath = path.join(BOUNDARIES_PATH, 'gadm41_CMR_3.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const boundaryData = JSON.parse(fileContent);

    // Extract arrondissement names and basic info
    const arrondissements = boundaryData.features.map(feature => ({
      id: feature.properties.GID_3,
      name: feature.properties.NAME_3,
      department: feature.properties.NAME_2,
      departmentId: feature.properties.GID_2,
      region: feature.properties.NAME_1,
      regionId: feature.properties.GID_1,
      type: feature.properties.TYPE_3,
      engType: feature.properties.ENGTYPE_3
    }));

    res.json({
      success: true,
      count: arrondissements.length,
      arrondissements
    });
  } catch (error) {
    console.error('Error reading arrondissements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read arrondissements',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/combined
 * Get combined boundary data with villages and voronoi
 */
router.get('/combined', async (req, res) => {
  try {
    const { level = '1', includeVillages = 'false', includeVoronoi = 'false' } = req.query;

    // Read boundary data
    const boundaryPath = path.join(BOUNDARIES_PATH, `gadm41_CMR_${level}.json`);
    const boundaryContent = await fs.readFile(boundaryPath, 'utf-8');
    const boundaryData = JSON.parse(boundaryContent);

    const result = {
      success: true,
      level: parseInt(level),
      levelName: getLevelName(parseInt(level)),
      boundaries: boundaryData
    };

    // Optionally include villages
    if (includeVillages === 'true') {
      try {
        const villagesPath = path.join(BOUNDARIES_PATH, 'villages.geojson');
        const villagesContent = await fs.readFile(villagesPath, 'utf-8');
        result.villages = JSON.parse(villagesContent);
      } catch (error) {
        console.warn('Villages file not found or error reading:', error.message);
      }
    }

    // Optionally include voronoi
    if (includeVoronoi === 'true') {
      try {
        const voronoiPath = path.join(BOUNDARIES_PATH, 'villages_voronoi.geojson');
        const voronoiContent = await fs.readFile(voronoiPath, 'utf-8');
        result.voronoi = JSON.parse(voronoiContent);
      } catch (error) {
        console.warn('Voronoi file not found or error reading:', error.message);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error reading combined data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read combined data',
      message: error.message
    });
  }
});

// ============================================
// Legacy routes for backward compatibility (Cameroon)
// ============================================

/**
 * GET /api/boundaries/level/:level
 * Get boundary data for a specific administrative level (Cameroon - backward compatibility)
 * @deprecated Use GET /api/boundaries/:countryCode/level/:level instead
 */
router.get('/level/:level', async (req, res) => {
  try {
    const { level } = req.params;
    
    // Validate level
    if (!['1', '2', '3'].includes(level)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid level',
        message: 'Level must be 1 (Regions), 2 (Departments), or 3 (Arrondissements)'
      });
    }

    const filename = `gadm41_CMR_${level}.json`;
    const filePath = path.join(BOUNDARIES_PATH, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `Boundary file for level ${level} not found`
      });
    }

    // Read and parse the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const boundaryData = JSON.parse(fileContent);

    res.json({
      success: true,
      level: parseInt(level),
      levelName: getLevelName(parseInt(level)),
      data: boundaryData
    });
  } catch (error) {
    console.error('Error reading boundary file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read boundary file',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/regions
 * Get all regions (Level 1) - Cameroon backward compatibility
 * @deprecated Use GET /api/boundaries/:countryCode/regions instead
 */
router.get('/regions', async (req, res) => {
  try {
    const filePath = path.join(BOUNDARIES_PATH, 'gadm41_CMR_1.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const boundaryData = JSON.parse(fileContent);

    // Extract region names and basic info
    const regions = boundaryData.features.map(feature => ({
      id: feature.properties.GID_1,
      name: feature.properties.NAME_1,
      type: feature.properties.TYPE_1,
      engType: feature.properties.ENGTYPE_1,
      hasc: feature.properties.HASC_1,
      iso: feature.properties.ISO_1
    }));

    res.json({
      success: true,
      count: regions.length,
      regions
    });
  } catch (error) {
    console.error('Error reading regions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read regions',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/departments
 * Get all departments (Level 2) - Cameroon backward compatibility
 * @deprecated Use GET /api/boundaries/:countryCode/departments instead
 */
router.get('/departments', async (req, res) => {
  try {
    const filePath = path.join(BOUNDARIES_PATH, 'gadm41_CMR_2.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const boundaryData = JSON.parse(fileContent);

    // Extract department names and basic info
    const departments = boundaryData.features.map(feature => ({
      id: feature.properties.GID_2,
      name: feature.properties.NAME_2,
      region: feature.properties.NAME_1,
      regionId: feature.properties.GID_1,
      type: feature.properties.TYPE_2,
      engType: feature.properties.ENGTYPE_2
    }));

    res.json({
      success: true,
      count: departments.length,
      departments
    });
  } catch (error) {
    console.error('Error reading departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read departments',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/arrondissements
 * Get all arrondissements (Level 3) - Cameroon backward compatibility
 * @deprecated Use GET /api/boundaries/:countryCode/subdivisions instead
 */
router.get('/arrondissements', async (req, res) => {
  try {
    const filePath = path.join(BOUNDARIES_PATH, 'gadm41_CMR_3.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const boundaryData = JSON.parse(fileContent);

    // Extract arrondissement names and basic info
    const arrondissements = boundaryData.features.map(feature => ({
      id: feature.properties.GID_3,
      name: feature.properties.NAME_3,
      department: feature.properties.NAME_2,
      departmentId: feature.properties.GID_2,
      region: feature.properties.NAME_1,
      regionId: feature.properties.GID_1,
      type: feature.properties.TYPE_3,
      engType: feature.properties.ENGTYPE_3
    }));

    res.json({
      success: true,
      count: arrondissements.length,
      arrondissements
    });
  } catch (error) {
    console.error('Error reading arrondissements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read arrondissements',
      message: error.message
    });
  }
});

/**
 * GET /api/boundaries/combined
 * Get combined boundary data with villages and voronoi - Cameroon backward compatibility
 * @deprecated Use country-specific endpoints instead
 */
router.get('/combined', async (req, res) => {
  try {
    const { level = '1', includeVillages = 'false', includeVoronoi = 'false' } = req.query;

    // Read boundary data
    const boundaryPath = path.join(BOUNDARIES_PATH, `gadm41_CMR_${level}.json`);
    const boundaryContent = await fs.readFile(boundaryPath, 'utf-8');
    const boundaryData = JSON.parse(boundaryContent);

    const result = {
      success: true,
      level: parseInt(level),
      levelName: getLevelName(parseInt(level)),
      boundaries: boundaryData
    };

    // Optionally include villages
    if (includeVillages === 'true') {
      try {
        const villagesPath = path.join(BOUNDARIES_PATH, 'villages.geojson');
        const villagesContent = await fs.readFile(villagesPath, 'utf-8');
        result.villages = JSON.parse(villagesContent);
      } catch (error) {
        console.warn('Villages file not found or error reading:', error.message);
      }
    }

    // Optionally include voronoi
    if (includeVoronoi === 'true') {
      try {
        const voronoiPath = path.join(BOUNDARIES_PATH, 'villages_voronoi.geojson');
        const voronoiContent = await fs.readFile(voronoiPath, 'utf-8');
        result.voronoi = JSON.parse(voronoiContent);
      } catch (error) {
        console.warn('Voronoi file not found or error reading:', error.message);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error reading combined data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read combined data',
      message: error.message
    });
  }
});

/**
 * Helper function to get level name
 * @param {number} level - Admin level
 * @param {string} countryCode - Optional country code for country-specific names
 */
function getLevelName(level, countryCode = 'CMR') {
  const country = countriesConfig.getCountryByCode(countryCode);
  
  if (country?.adminLevels?.[level]) {
    return country.adminLevels[level].nameEn;
  }
  
  // Default names
  const defaultNames = {
    0: 'Country',
    1: 'Regions',
    2: 'Departments',
    3: 'Subdivisions',
    4: 'Localities'
  };
  return defaultNames[level] || 'Unknown';
}

module.exports = router;
