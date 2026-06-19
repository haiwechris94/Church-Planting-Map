/**
 * Administrative Routes
 * API endpoints for Cameroon administrative boundary data
 * 
 * Base path: /api/administrative
 * 
 * Endpoints:
 * - GET /regions - Get all regions (Admin Level 1)
 * - GET /departments - Get departments (Admin Level 2), optionally filtered by region
 * - GET /subdivisions - Get subdivisions (Admin Level 3), optionally filtered by department
 * - GET /villages - Get villages (Admin Level 4), optionally filtered by subdivision
 * - GET /boundaries - Get all Cameroon boundaries
 * - GET /hierarchy - Get administrative hierarchy for a point
 * - GET /search - Search administrative units by name
 * - GET /cache - Get cache statistics
 * - POST /cache/clear - Clear the cache
 */
const express = require('express');
const router = express.Router();
const administrativeController = require('../controllers/administrativeController');

/**
 * @route GET /api/administrative
 * @description Get API information and available endpoints
 * @access Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Cameroon Administrative API',
    version: '1.0.0',
    description: 'API for accessing Cameroon administrative boundary data',
    levels: {
      1: { name: 'Régions', nameEn: 'Regions', endpoint: '/regions' },
      2: { name: 'Départements', nameEn: 'Departments', endpoint: '/departments' },
      3: { name: 'Arrondissements', nameEn: 'Subdivisions', endpoint: '/subdivisions' },
      4: { name: 'Villages', nameEn: 'Villages', endpoint: '/villages' }
    },
    endpoints: {
      regions: {
        method: 'GET',
        path: '/api/administrative/regions',
        description: 'Get all regions (Admin Level 1)',
        queryParams: {
          includeGeometry: 'boolean - Include GeoJSON geometry (default: false)'
        }
      },
      departments: {
        method: 'GET',
        path: '/api/administrative/departments',
        description: 'Get departments (Admin Level 2)',
        queryParams: {
          region: 'string - Filter by region name',
          includeGeometry: 'boolean - Include GeoJSON geometry (default: false)'
        }
      },
      subdivisions: {
        method: 'GET',
        path: '/api/administrative/subdivisions',
        description: 'Get subdivisions/arrondissements (Admin Level 3)',
        queryParams: {
          department: 'string - Filter by department name',
          includeGeometry: 'boolean - Include GeoJSON geometry (default: false)'
        }
      },
      villages: {
        method: 'GET',
        path: '/api/administrative/villages',
        description: 'Get villages (Admin Level 4)',
        queryParams: {
          subdivision: 'string - Filter by subdivision name',
          type: 'string - "points" or "polygons" (default: points)',
          includeGeometry: 'boolean - Include GeoJSON geometry (default: false)'
        }
      },
      boundaries: {
        method: 'GET',
        path: '/api/administrative/boundaries',
        description: 'Get all Cameroon administrative boundaries',
        queryParams: {
          level: 'number - Filter by level (1, 2, or 3)',
          includeGeometry: 'boolean - Include GeoJSON geometry (default: false)'
        }
      },
      hierarchy: {
        method: 'GET',
        path: '/api/administrative/hierarchy',
        description: 'Get administrative hierarchy for a specific point',
        queryParams: {
          lng: 'number (required) - Longitude',
          lat: 'number (required) - Latitude'
        }
      },
      search: {
        method: 'GET',
        path: '/api/administrative/search',
        description: 'Search administrative units by name',
        queryParams: {
          q: 'string (required) - Search query (min 2 characters)',
          level: 'number - Filter by level (1, 2, 3, or 4)',
          limit: 'number - Maximum results (default: 50, max: 100)'
        }
      }
    },
    examples: {
      getAllRegions: '/api/administrative/regions',
      getRegionsWithGeometry: '/api/administrative/regions?includeGeometry=true',
      getDepartmentsInRegion: '/api/administrative/departments?region=Centre',
      getSubdivisionsInDepartment: '/api/administrative/subdivisions?department=Mfoundi',
      getVillagesInSubdivision: '/api/administrative/villages?subdivision=Yaoundé I',
      getVillagePolygons: '/api/administrative/villages?type=polygons',
      getHierarchyForPoint: '/api/administrative/hierarchy?lng=11.5&lat=3.8',
      searchUnits: '/api/administrative/search?q=yaoundé'
    }
  });
});

/**
 * @route GET /api/administrative/regions
 * @description Get all regions (Admin Level 1)
 * @access Public
 * @query {boolean} includeGeometry - Include GeoJSON geometry
 */
router.get('/regions', administrativeController.getRegions);

/**
 * @route GET /api/administrative/departments
 * @description Get departments (Admin Level 2), optionally filtered by region
 * @access Public
 * @query {string} region - Filter by region name
 * @query {boolean} includeGeometry - Include GeoJSON geometry
 */
router.get('/departments', administrativeController.getDepartments);

/**
 * @route GET /api/administrative/subdivisions
 * @description Get subdivisions/arrondissements (Admin Level 3), optionally filtered by department
 * @access Public
 * @query {string} department - Filter by department name
 * @query {boolean} includeGeometry - Include GeoJSON geometry
 */
router.get('/subdivisions', administrativeController.getSubdivisions);

/**
 * @route GET /api/administrative/villages
 * @description Get villages (Admin Level 4), optionally filtered by subdivision
 * @access Public
 * @query {string} subdivision - Filter by subdivision name
 * @query {string} type - Type of village data ('points' or 'polygons')
 * @query {boolean} includeGeometry - Include GeoJSON geometry
 */
router.get('/villages', administrativeController.getVillages);

/**
 * @route GET /api/administrative/boundaries
 * @description Get all Cameroon administrative boundaries
 * @access Public
 * @query {number} level - Filter by specific level (1, 2, or 3)
 * @query {boolean} includeGeometry - Include GeoJSON geometry
 */
router.get('/boundaries', administrativeController.getAllBoundaries);

/**
 * @route GET /api/administrative/hierarchy
 * @description Get administrative hierarchy for a specific point
 * @access Public
 * @query {number} lng - Longitude (required)
 * @query {number} lat - Latitude (required)
 */
router.get('/hierarchy', administrativeController.getHierarchy);

/**
 * @route GET /api/administrative/search
 * @description Search administrative units by name
 * @access Public
 * @query {string} q - Search query (required, min 2 characters)
 * @query {number} level - Filter by level (1, 2, 3, or 4)
 * @query {number} limit - Maximum results (default: 50, max: 100)
 */
router.get('/search', administrativeController.searchUnits);

/**
 * @route GET /api/administrative/cache
 * @description Get cache statistics
 * @access Admin
 */
router.get('/cache', administrativeController.getCacheStats);

/**
 * @route POST /api/administrative/cache/clear
 * @description Clear the cache
 * @access Admin
 */
router.post('/cache/clear', administrativeController.clearCache);

module.exports = router;
