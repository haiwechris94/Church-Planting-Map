/**
 * Administrative Controller
 * Handles HTTP requests for Cameroon administrative boundary data
 * Provides hierarchical filtering for regions, departments, subdivisions, and villages
 */
const administrativeService = require('../services/administrativeService');

/**
 * GET /api/administrative/regions
 * Get all regions (Admin Level 1)
 * 
 * Query Parameters:
 * - includeGeometry: boolean (default: false) - Include GeoJSON geometry
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getRegions(req, res) {
  try {
    const { includeGeometry = 'false' } = req.query;
    const result = await administrativeService.getRegions();

    const response = {
      success: true,
      level: result.level,
      levelName: result.levelName,
      levelNameEn: result.levelNameEn,
      count: result.count,
      regions: result.items
    };

    if (includeGeometry === 'true') {
      response.geojson = result.geojson;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch regions',
      message: error.message
    });
  }
}

/**
 * GET /api/administrative/departments
 * Get departments (Admin Level 2), optionally filtered by region
 * 
 * Query Parameters:
 * - region: string - Filter by region name
 * - includeGeometry: boolean (default: false) - Include GeoJSON geometry
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getDepartments(req, res) {
  try {
    const { region, includeGeometry = 'false' } = req.query;
    const result = await administrativeService.getDepartments(region);

    const response = {
      success: true,
      level: result.level,
      levelName: result.levelName,
      levelNameEn: result.levelNameEn,
      filter: result.filter,
      count: result.count,
      departments: result.items
    };

    if (includeGeometry === 'true') {
      response.geojson = result.geojson;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments',
      message: error.message
    });
  }
}

/**
 * GET /api/administrative/subdivisions
 * Get subdivisions/arrondissements (Admin Level 3), optionally filtered by department
 * 
 * Query Parameters:
 * - department: string - Filter by department name
 * - includeGeometry: boolean (default: false) - Include GeoJSON geometry
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSubdivisions(req, res) {
  try {
    const { department, includeGeometry = 'false' } = req.query;
    const result = await administrativeService.getSubdivisions(department);

    const response = {
      success: true,
      level: result.level,
      levelName: result.levelName,
      levelNameEn: result.levelNameEn,
      filter: result.filter,
      count: result.count,
      subdivisions: result.items
    };

    if (includeGeometry === 'true') {
      response.geojson = result.geojson;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching subdivisions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subdivisions',
      message: error.message
    });
  }
}

/**
 * GET /api/administrative/villages
 * Get villages (Admin Level 4), optionally filtered by subdivision
 * 
 * Query Parameters:
 * - subdivision: string - Filter by subdivision name
 * - type: string ('points' | 'polygons') - Type of village data (default: 'points')
 * - includeGeometry: boolean (default: false) - Include GeoJSON geometry
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getVillages(req, res) {
  try {
    const { subdivision, type = 'points', includeGeometry = 'false' } = req.query;
    const usePolygons = type === 'polygons';
    const result = await administrativeService.getVillages(subdivision, usePolygons);

    const response = {
      success: true,
      level: result.level,
      levelName: result.levelName,
      levelNameEn: result.levelNameEn,
      filter: result.filter,
      dataType: result.dataType,
      count: result.count,
      villages: result.items
    };

    if (includeGeometry === 'true') {
      response.geojson = result.geojson;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching villages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch villages',
      message: error.message
    });
  }
}

/**
 * GET /api/administrative/boundaries
 * Get all Cameroon administrative boundaries
 * 
 * Query Parameters:
 * - level: number (1, 2, 3) - Filter by specific level
 * - includeGeometry: boolean (default: false) - Include GeoJSON geometry
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllBoundaries(req, res) {
  try {
    const { level, includeGeometry = 'false' } = req.query;
    
    if (level) {
      const levelNum = parseInt(level);
      if (![1, 2, 3].includes(levelNum)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid level',
          message: 'Level must be 1 (Regions), 2 (Departments), or 3 (Subdivisions)'
        });
      }

      let result;
      switch (levelNum) {
        case 1:
          result = await administrativeService.getRegions();
          break;
        case 2:
          result = await administrativeService.getDepartments();
          break;
        case 3:
          result = await administrativeService.getSubdivisions();
          break;
      }

      const response = {
        success: true,
        level: result.level,
        levelName: result.levelName,
        levelNameEn: result.levelNameEn,
        count: result.count,
        items: result.items
      };

      if (includeGeometry === 'true') {
        response.geojson = result.geojson;
      }

      return res.json(response);
    }

    // Return all boundaries
    const result = await administrativeService.getAllBoundaries();

    const response = {
      success: true,
      country: result.country,
      countryCode: result.countryCode,
      levels: result.levels
    };

    if (includeGeometry === 'true') {
      response.geojson = result.geojson;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching boundaries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch boundaries',
      message: error.message
    });
  }
}

/**
 * GET /api/administrative/hierarchy
 * Get administrative hierarchy for a specific point
 * 
 * Query Parameters:
 * - lng: number (required) - Longitude
 * - lat: number (required) - Latitude
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getHierarchy(req, res) {
  try {
    const { lng, lat } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        error: 'Missing coordinates',
        message: 'Both lng (longitude) and lat (latitude) are required'
      });
    }

    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);

    if (isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        message: 'lng and lat must be valid numbers'
      });
    }

    // Validate coordinates are within Cameroon's approximate bounds
    if (longitude < 8 || longitude > 16 || latitude < 1 || latitude > 14) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates out of bounds',
        message: 'Coordinates must be within Cameroon (lng: 8-16, lat: 1-14)'
      });
    }

    const result = await administrativeService.getHierarchyForPoint(longitude, latitude);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hierarchy',
      message: error.message
    });
  }
}

/**
 * GET /api/administrative/search
 * Search administrative units by name
 * 
 * Query Parameters:
 * - q: string (required) - Search query
 * - level: number (1, 2, 3, 4) - Filter by specific level
 * - limit: number (default: 50) - Maximum results
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function searchUnits(req, res) {
  try {
    const { q, level, limit = '50' } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query',
        message: 'Search query must be at least 2 characters'
      });
    }

    const levelNum = level ? parseInt(level) : null;
    if (levelNum && ![1, 2, 3, 4].includes(levelNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid level',
        message: 'Level must be 1 (Regions), 2 (Departments), 3 (Subdivisions), or 4 (Villages)'
      });
    }

    const results = await administrativeService.searchAdministrativeUnits(q, levelNum);
    const limitNum = Math.min(parseInt(limit) || 50, 100);

    res.json({
      success: true,
      query: q,
      level: levelNum,
      count: Math.min(results.length, limitNum),
      totalMatches: results.length,
      results: results.slice(0, limitNum)
    });
  } catch (error) {
    console.error('Error searching units:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search',
      message: error.message
    });
  }
}

/**
 * GET /api/administrative/cache
 * Get cache statistics (admin only)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCacheStats(req, res) {
  try {
    const stats = administrativeService.getCacheStats();
    res.json({
      success: true,
      cache: stats
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats',
      message: error.message
    });
  }
}

/**
 * POST /api/administrative/cache/clear
 * Clear the cache (admin only)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function clearCache(req, res) {
  try {
    administrativeService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
}

module.exports = {
  getRegions,
  getDepartments,
  getSubdivisions,
  getVillages,
  getAllBoundaries,
  getHierarchy,
  searchUnits,
  getCacheStats,
  clearCache
};
