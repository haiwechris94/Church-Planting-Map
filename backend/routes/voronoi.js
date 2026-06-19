/**
 * Voronoi Routes
 * API routes for Voronoi diagram management, generation, and analysis
 * Multi-country support: All 54 African countries
 * 
 * Base path: /api/voronoi
 */
const express = require('express');
const router = express.Router();
const voronoiController = require('../controllers/voronoiController');
const voronoiService = require('../services/voronoiService');
const countriesConfig = require('../config/countries');

// Optional: Import auth middleware for protected routes
// const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/voronoi/countries
 * @desc    Get list of supported countries for Voronoi generation
 * @access  Public
 * @returns {Object} List of supported countries
 */
router.get('/countries', (req, res) => {
  try {
    const countries = voronoiService.getSupportedCountries();
    res.json({
      success: true,
      totalCountries: countries.length,
      defaultCountry: voronoiService.DEFAULT_COUNTRY_CODE,
      countries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get supported countries',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/voronoi/countries/:countryCode
 * @desc    Get country configuration for Voronoi generation
 * @access  Public
 * @param   {string} countryCode - ISO 3166-1 alpha-3 country code
 * @returns {Object} Country configuration
 */
router.get('/countries/:countryCode', (req, res) => {
  try {
    const { countryCode } = req.params;
    const country = voronoiService.getCountryConfig(countryCode);
    
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
    res.status(500).json({
      success: false,
      error: 'Failed to get country config',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/voronoi
 * @desc    Get all available Voronoi diagrams
 * @access  Public
 * @returns {Object} List of available diagrams (preloaded and generated)
 */
router.get('/', voronoiController.getVoronoiDiagrams);

/**
 * @route   GET /api/voronoi/cache
 * @desc    Get cache statistics
 * @access  Public (consider making admin-only)
 * @returns {Object} Cache statistics including loaded data and TTL
 */
router.get('/cache', voronoiController.getCacheStats);

/**
 * @route   POST /api/voronoi/cache/clear
 * @desc    Clear the Voronoi cache
 * @access  Public (consider making admin-only)
 * @query   {string} [countryCode] - Optional: clear only specific country cache
 * @returns {Object} Success message
 */
router.post('/cache/clear', voronoiController.clearCache);

/**
 * @route   POST /api/voronoi/generate
 * @desc    Generate a new Voronoi diagram from custom points
 * @access  Public
 * @body    {Object} points - Array of point objects with coordinates
 * @body    {string} [name] - Name for the diagram
 * @body    {string} [description] - Description
 * @body    {string} [countryCode=CMR] - ISO country code for clipping
 * @body    {boolean} [clipToCountry=true] - Clip cells to country boundary
 * @body    {boolean} [clipToCameroon] - Deprecated: use clipToCountry instead
 * @body    {boolean} [calculateAreas=true] - Calculate area for each cell
 * @body    {Array} [bounds] - Custom bounds [minLng, minLat, maxLng, maxLat]
 * @body    {boolean} [saveToCache=true] - Save to cache for later retrieval
 * @returns {Object} Generated Voronoi diagram with GeoJSON
 */
router.post('/generate', voronoiController.generateVoronoi);

/**
 * @route   POST /api/voronoi/generate/:countryCode
 * @desc    Generate a new Voronoi diagram for a specific country
 * @access  Public
 * @param   {string} countryCode - ISO 3166-1 alpha-3 country code
 * @body    {Object} points - Array of point objects with coordinates
 * @body    {string} [name] - Name for the diagram
 * @body    {string} [description] - Description
 * @body    {boolean} [clipToCountry=true] - Clip cells to country boundary
 * @body    {boolean} [calculateAreas=true] - Calculate area for each cell
 * @body    {boolean} [saveToCache=true] - Save to cache for later retrieval
 * @returns {Object} Generated Voronoi diagram with GeoJSON
 */
router.post('/generate/:countryCode', async (req, res) => {
  const { countryCode } = req.params;
  const code = countryCode.toUpperCase();
  
  // Validate country code
  if (!countriesConfig.isValidCountryCode(code)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid country code',
      message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
    });
  }
  
  // Add country code to request body
  req.body.countryCode = code;
  
  // Call the controller
  return voronoiController.generateVoronoi(req, res);
});

/**
 * @route   GET /api/voronoi/:id
 * @desc    Get a specific Voronoi diagram by ID
 * @access  Public
 * @param   {string} id - Diagram ID ('villages-voronoi', 'custom-voronoi', or UUID)
 * @query   {boolean} [includeGeometry=true] - Include GeoJSON geometry
 * @query   {boolean} [calculateStats=false] - Include statistics
 * @returns {Object} Voronoi diagram with metadata and optional geometry
 */
router.get('/:id', voronoiController.getVoronoiById);

/**
 * @route   GET /api/voronoi/:id/statistics
 * @desc    Get coverage statistics for a Voronoi diagram
 * @access  Public
 * @param   {string} id - Diagram ID
 * @query   {string} [groupBy] - Group by 'region' or 'department'
 * @returns {Object} Statistics including area, coverage, and optional grouping
 */
router.get('/:id/statistics', voronoiController.getStatistics);

/**
 * @route   GET /api/voronoi/:id/gaps
 * @desc    Identify coverage gaps (large Voronoi cells)
 * @access  Public
 * @param   {string} id - Diagram ID
 * @query   {number} [thresholdKm2=100] - Minimum area to consider as gap
 * @query   {boolean} [includeGeometry=true] - Include geometry in response
 * @query   {number} [limit=50] - Maximum number of gaps to return
 * @returns {Object} Coverage gaps with recommendations
 */
router.get('/:id/gaps', voronoiController.getCoverageGaps);

/**
 * @route   GET /api/voronoi/:id/filter
 * @desc    Filter Voronoi cells by administrative boundary
 * @access  Public
 * @param   {string} id - Diagram ID
 * @query   {string} [region] - Filter by region name
 * @query   {string} [department] - Filter by department name
 * @query   {string} [subdivision] - Filter by subdivision name
 * @returns {Object} Filtered Voronoi diagram with statistics
 */
router.get('/:id/filter', voronoiController.filterByBoundary);

/**
 * @route   DELETE /api/voronoi/:id
 * @desc    Delete a generated Voronoi diagram
 * @access  Public (consider making authenticated)
 * @param   {string} id - Diagram ID (only generated diagrams can be deleted)
 * @returns {Object} Success message
 */
router.delete('/:id', voronoiController.deleteVoronoi);

// ============================================
// Country-specific statistics endpoints
// ============================================

/**
 * @route   GET /api/voronoi/:id/statistics/:countryCode
 * @desc    Get coverage statistics for a Voronoi diagram in a specific country
 * @access  Public
 * @param   {string} id - Diagram ID
 * @param   {string} countryCode - ISO country code for area calculations
 * @query   {string} [groupBy] - Group by 'region' or 'department'
 * @returns {Object} Statistics including area, coverage, and optional grouping
 */
router.get('/:id/statistics/:countryCode', async (req, res) => {
  const { countryCode } = req.params;
  const code = countryCode.toUpperCase();
  
  if (!countriesConfig.isValidCountryCode(code)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid country code',
      message: `Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`
    });
  }
  
  // Add country code to query
  req.query.countryCode = code;
  
  return voronoiController.getStatistics(req, res);
});

// ============================================
// Legacy routes for backward compatibility
// ============================================

/**
 * @route   POST /api/voronoi/custom
 * @desc    Generate Voronoi from custom points (legacy endpoint)
 * @access  Public
 * @deprecated Use POST /api/voronoi/generate instead
 */
router.post('/custom', async (req, res) => {
  // Transform legacy request format to new format
  const { points, bounds, countryCode } = req.body;
  
  // Convert simple coordinate arrays to point objects
  const transformedPoints = points?.map((p, i) => ({
    coordinates: Array.isArray(p) ? p : p.coordinates,
    name: p.name || `Point ${i + 1}`,
    id: p.id || `legacy-${i}`
  }));

  req.body = {
    points: transformedPoints,
    bounds,
    countryCode: countryCode || 'CMR',
    name: 'Legacy Custom Voronoi',
    saveToCache: false
  };

  return voronoiController.generateVoronoi(req, res);
});

module.exports = router;