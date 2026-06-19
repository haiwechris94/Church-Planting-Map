/**
 * Joshua Project API Routes
 * 
 * Provides endpoints for managing Joshua Project people groups data.
 * 
 * Endpoints:
 * - POST /api/jp/sync/country      - Sync data for a specific country
 * - GET  /api/people-groups        - List all people groups (paginated)
 * - GET  /api/people-groups/:id    - Get specific people group
 * - GET  /api/people-groups/unreached - List unreached groups
 * - GET  /api/map/people-groups    - Get all for map display
 * - GET  /api/map/people-groups?bbox= - Get by bounding box
 * - GET  /api/map/people-groups?radius= - Get by radius
 */

const express = require('express');
const router = express.Router();
const joshuaProjectService = require('../services/joshuaProjectService');

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Validate country code parameter
 */
const validateCountryCode = (req, res, next) => {
  const { countryCode } = req.params;
  
  if (!countryCode || countryCode.length !== 2) {
    return res.status(400).json({
      success: false,
      error: 'Invalid country code',
      message: 'Please provide a valid 2-letter ISO country code (e.g., CM, NG, GH)'
    });
  }
  
  req.countryCode = countryCode.toUpperCase();
  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 500); // Max 500 per page
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid page number',
      message: 'Page number must be 1 or greater'
    });
  }
  
  req.pagination = { page, limit };
  next();
};

/**
 * Validate bounding box parameters
 */
const validateBoundingBox = (req, res, next) => {
  const { bbox } = req.query;
  
  if (bbox) {
    const coords = bbox.split(',').map(Number);
    
    if (coords.length !== 4 || coords.some(isNaN)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounding box',
        message: 'Bounding box must be in format: minLng,minLat,maxLng,maxLat'
      });
    }
    
    const [minLng, minLat, maxLng, maxLat] = coords;
    
    if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        message: 'Coordinates must be within valid ranges (lng: -180 to 180, lat: -90 to 90)'
      });
    }
    
    req.bbox = { minLng, minLat, maxLng, maxLat };
  }
  
  next();
};

/**
 * Validate radius query parameters
 */
const validateRadius = (req, res, next) => {
  const { lat, lng, radius } = req.query;
  
  if (radius) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    
    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid radius parameters',
        message: 'Radius query requires lat, lng, and radius (in km) parameters'
      });
    }
    
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        message: 'Coordinates must be within valid ranges'
      });
    }
    
    if (radiusKm <= 0 || radiusKm > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid radius',
        message: 'Radius must be between 0 and 1000 km'
      });
    }
    
    req.radiusQuery = { lat: latitude, lng: longitude, radius: radiusKm };
  }
  
  next();
};

// ============================================================================
// Sync Routes
// ============================================================================

/**
 * @route   POST /sync/country
 * @desc    Sync people groups data for a specific country from Joshua Project API
 * @access  Public (should be protected in production)
 * @param   {string} countryCode - 2-letter ISO country code
 * @returns {Object} Sync statistics
 */
router.post('/sync/country', async (req, res) => {
  try {
    const { countryCode } = req.body;
    
    if (!countryCode || countryCode.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code',
        message: 'Please provide a valid 2-letter ISO country code in the request body'
      });
    }
    
    // Get admin user ID from request if authenticated
    const adminUserId = req.user?._id;
    
    const result = await joshuaProjectService.syncCountryData(countryCode, adminUserId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Joshua Project sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync with Joshua Project API',
      details: error.message
    });
  }
});

/**
 * @route   POST /sync/:countryCode
 * @desc    Sync people groups data for a specific country (legacy route)
 * @access  Public
 */
router.post('/sync/:countryCode', validateCountryCode, async (req, res) => {
  try {
    const adminUserId = req.user?._id;
    const result = await joshuaProjectService.syncCountryData(req.countryCode, adminUserId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Joshua Project sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync with Joshua Project API',
      details: error.message
    });
  }
});

// ============================================================================
// People Groups Routes
// ============================================================================

/**
 * @route   GET /people-groups
 * @desc    Get all Joshua Project people groups with pagination
 * @access  Public
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 50, max: 500)
 * @query   {string} country - Filter by country code
 * @query   {string} status - Filter by status
 * @query   {string} sortBy - Sort field (default: name)
 * @query   {string} sortOrder - Sort order: asc/desc (default: asc)
 */
router.get('/people-groups', validatePagination, async (req, res) => {
  try {
    const { country, status, sortBy, sortOrder } = req.query;
    
    const result = await joshuaProjectService.getAllPeopleGroups({
      ...req.pagination,
      country,
      status,
      sortBy,
      sortOrder
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get people groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve people groups',
      details: error.message
    });
  }
});

/**
 * @route   GET /people-groups/unreached
 * @desc    Get unreached people groups (status = 'unreached')
 * @access  Public
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {string} country - Filter by country code
 */
router.get('/people-groups/unreached', validatePagination, async (req, res) => {
  try {
    const { country } = req.query;
    
    const result = await joshuaProjectService.getUnreachedGroups({
      ...req.pagination,
      country
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get unreached groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve unreached people groups',
      details: error.message
    });
  }
});

/**
 * @route   GET /people-groups/:id
 * @desc    Get a specific people group by ID
 * @access  Public
 * @param   {string} id - MongoDB ObjectId or Joshua Project peopleId
 */
router.get('/people-groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const peopleGroup = await joshuaProjectService.getPeopleGroupById(id);
    
    if (!peopleGroup) {
      return res.status(404).json({
        success: false,
        error: 'People group not found',
        message: `No people group found with ID: ${id}`
      });
    }
    
    res.json({
      success: true,
      data: peopleGroup
    });
  } catch (error) {
    console.error('Get people group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve people group',
      details: error.message
    });
  }
});

// ============================================================================
// Map Routes
// ============================================================================

/**
 * @route   GET /map/people-groups
 * @desc    Get people groups optimized for map display
 * @access  Public
 * @query   {string} country - Filter by country code
 * @query   {string} status - Filter by status
 * @query   {string} bbox - Bounding box: minLng,minLat,maxLng,maxLat
 * @query   {number} lat - Center latitude (for radius query)
 * @query   {number} lng - Center longitude (for radius query)
 * @query   {number} radius - Radius in km (for radius query)
 */
router.get('/map/people-groups', validateBoundingBox, validateRadius, async (req, res) => {
  try {
    let data;
    
    // Handle bounding box query
    if (req.bbox) {
      data = await joshuaProjectService.getByBoundingBox(req.bbox);
    }
    // Handle radius query
    else if (req.radiusQuery) {
      const { lat, lng, radius } = req.radiusQuery;
      data = await joshuaProjectService.getByRadius(lat, lng, radius);
    }
    // Default: get all for map
    else {
      const { country, status } = req.query;
      data = await joshuaProjectService.getMapPeopleGroups({ country, status });
    }
    
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Get map people groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve map data',
      details: error.message
    });
  }
});

// ============================================================================
// Status & Management Routes
// ============================================================================

/**
 * @route   GET /status
 * @desc    Get sync status and statistics
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const statistics = await joshuaProjectService.getSyncStatus();
    
    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync status',
      details: error.message
    });
  }
});

/**
 * @route   DELETE /clear
 * @desc    Remove all Joshua Project data
 * @access  Public (should be protected in production)
 */
router.delete('/clear', async (req, res) => {
  try {
    const result = await joshuaProjectService.clearAllData();
    
    res.json({
      success: true,
      message: 'All Joshua Project data has been cleared',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear Joshua Project data',
      details: error.message
    });
  }
});

/**
 * @route   GET /unreached/:countryCode
 * @desc    Get unreached people groups for a specific country (legacy route)
 * @access  Public
 */
router.get('/unreached/:countryCode', validateCountryCode, async (req, res) => {
  try {
    const result = await joshuaProjectService.getUnreachedGroups({
      country: req.countryCode,
      page: 1,
      limit: 1000
    });
    
    // Transform to legacy format
    const formattedGroups = result.data.map(group => ({
      name: group.name,
      latitude: group.location?.coordinates?.[1],
      longitude: group.location?.coordinates?.[0],
      status: group.status,
      source: group.source,
      population: group.population,
      language: group.language
    }));
    
    res.json({
      success: true,
      countryCode: req.countryCode,
      count: formattedGroups.length,
      data: formattedGroups
    });
  } catch (error) {
    console.error('Get unreached groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve unreached people groups',
      details: error.message
    });
  }
});

module.exports = router;