/**
 * Voronoi Controller
 * Handles HTTP requests for Voronoi diagram operations
 * Provides endpoints for diagram management, generation, and analysis
 */
const voronoiService = require('../services/voronoiService');

/**
 * GET /api/voronoi
 * Get all available Voronoi diagrams
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getVoronoiDiagrams(req, res) {
  try {
    const result = await voronoiService.getAllDiagrams();

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching Voronoi diagrams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Voronoi diagrams',
      message: error.message
    });
  }
}

/**
 * GET /api/voronoi/:id
 * Get a specific Voronoi diagram by ID
 * 
 * Query Parameters:
 * - includeGeometry: boolean (default: true) - Include GeoJSON geometry
 * - calculateStats: boolean (default: false) - Include statistics
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getVoronoiById(req, res) {
  try {
    const { id } = req.params;
    const { 
      includeGeometry = 'true', 
      calculateStats = 'false' 
    } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameter',
        message: 'Voronoi diagram ID is required'
      });
    }

    const result = await voronoiService.getDiagramById(id, {
      includeGeometry: includeGeometry === 'true',
      calculateStats: calculateStats === 'true'
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching Voronoi diagram:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch Voronoi diagram',
      message: error.message
    });
  }
}

/**
 * POST /api/voronoi/generate
 * Generate a new Voronoi diagram from custom points
 * 
 * Request Body:
 * - points: Array of point objects (required)
 *   - Each point can be: [lng, lat] or { coordinates: [lng, lat] } or { lng, lat }
 *   - Optional properties: name, id, type
 * - name: string (optional) - Name for the diagram
 * - description: string (optional) - Description
 * - countryCode: string (default: 'CMR') - ISO country code for clipping
 * - clipToCountry: boolean (default: true) - Clip cells to country boundary
 * - clipToCameroon: boolean (deprecated) - Use clipToCountry instead
 * - calculateAreas: boolean (default: true) - Calculate area for each cell
 * - bounds: [minLng, minLat, maxLng, maxLat] (optional) - Custom bounds
 * - saveToCache: boolean (default: true) - Save to cache for later retrieval
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function generateVoronoi(req, res) {
  try {
    const {
      points,
      name,
      description,
      countryCode = 'CMR',
      clipToCountry = true,
      clipToCameroon, // Deprecated
      calculateAreas = true,
      bounds,
      saveToCache = true
    } = req.body;

    // Validate points
    if (!points || !Array.isArray(points)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Points array is required'
      });
    }

    if (points.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient data',
        message: 'At least 3 points are required to generate a Voronoi diagram',
        currentCount: points.length
      });
    }

    // Validate bounds if provided
    if (bounds) {
      if (!Array.isArray(bounds) || bounds.length !== 4) {
        return res.status(400).json({
          success: false,
          error: 'Invalid bounds',
          message: 'Bounds must be an array of 4 numbers: [minLng, minLat, maxLng, maxLat]'
        });
      }

      const [minLng, minLat, maxLng, maxLat] = bounds;
      if (minLng >= maxLng || minLat >= maxLat) {
        return res.status(400).json({
          success: false,
          error: 'Invalid bounds',
          message: 'minLng must be less than maxLng, and minLat must be less than maxLat'
        });
      }
    }

    const result = await voronoiService.generateVoronoi(points, {
      name,
      description,
      countryCode,
      clipToCountry,
      clipToCameroon, // For backward compatibility
      calculateAreas,
      bounds,
      saveToCache
    });

    // Emit real-time event if available
    const io = req.app.get('io');
    if (io && saveToCache) {
      io.to('map').emit('voronoi-generated', {
        id: result.id,
        name: result.name,
        featureCount: result.featureCount
      });
    }

    res.status(201).json({
      success: true,
      message: 'Voronoi diagram generated successfully',
      ...result
    });
  } catch (error) {
    console.error('Error generating Voronoi diagram:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Voronoi diagram',
      message: error.message
    });
  }
}

/**
 * GET /api/voronoi/:id/statistics
 * Get coverage statistics for a Voronoi diagram
 * 
 * Query Parameters:
 * - groupBy: string ('region' | 'department') - Group statistics by admin level
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getStatistics(req, res) {
  try {
    const { id } = req.params;
    const { groupBy, countryCode } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameter',
        message: 'Voronoi diagram ID is required'
      });
    }

    // Validate groupBy
    if (groupBy && !['region', 'department'].includes(groupBy)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameter',
        message: 'groupBy must be "region" or "department"'
      });
    }

    const result = await voronoiService.getStatistics(id, { groupBy, countryCode });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching Voronoi statistics:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
}

/**
 * GET /api/voronoi/:id/gaps
 * Identify coverage gaps (large Voronoi cells)
 * 
 * Query Parameters:
 * - thresholdKm2: number (default: 100) - Minimum area to consider as gap
 * - includeGeometry: boolean (default: true) - Include geometry in response
 * - limit: number (default: 50) - Maximum number of gaps to return
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCoverageGaps(req, res) {
  try {
    const { id } = req.params;
    const { 
      thresholdKm2 = '100',
      includeGeometry = 'true',
      limit = '50'
    } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameter',
        message: 'Voronoi diagram ID is required'
      });
    }

    const threshold = parseFloat(thresholdKm2);
    if (isNaN(threshold) || threshold <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameter',
        message: 'thresholdKm2 must be a positive number'
      });
    }

    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameter',
        message: 'limit must be a positive integer'
      });
    }

    const result = await voronoiService.getCoverageGaps(id, {
      thresholdKm2: threshold,
      includeGeometry: includeGeometry === 'true',
      limit: Math.min(limitNum, 100)
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching coverage gaps:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch coverage gaps',
      message: error.message
    });
  }
}

/**
 * GET /api/voronoi/:id/filter
 * Filter Voronoi cells by administrative boundary
 * 
 * Query Parameters:
 * - region: string - Filter by region name
 * - department: string - Filter by department name
 * - subdivision: string - Filter by subdivision name
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function filterByBoundary(req, res) {
  try {
    const { id } = req.params;
    const { region, department, subdivision } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameter',
        message: 'Voronoi diagram ID is required'
      });
    }

    if (!region && !department && !subdivision) {
      return res.status(400).json({
        success: false,
        error: 'Missing filter',
        message: 'At least one boundary filter (region, department, or subdivision) is required'
      });
    }

    const result = await voronoiService.filterByBoundary(id, {
      region,
      department,
      subdivision
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error filtering Voronoi by boundary:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to filter Voronoi diagram',
      message: error.message
    });
  }
}

/**
 * DELETE /api/voronoi/:id
 * Delete a generated Voronoi diagram
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteVoronoi(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameter',
        message: 'Voronoi diagram ID is required'
      });
    }

    voronoiService.deleteDiagram(id);

    // Emit real-time event if available
    const io = req.app.get('io');
    if (io) {
      io.to('map').emit('voronoi-deleted', { id });
    }

    res.json({
      success: true,
      message: 'Voronoi diagram deleted successfully',
      deletedId: id
    });
  } catch (error) {
    console.error('Error deleting Voronoi diagram:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    if (error.message.includes('Cannot delete')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete Voronoi diagram',
      message: error.message
    });
  }
}

/**
 * GET /api/voronoi/cache
 * Get cache statistics (admin only)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCacheStats(req, res) {
  try {
    const stats = voronoiService.getCacheStats();
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
 * POST /api/voronoi/cache/clear
 * Clear the Voronoi cache (admin only)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function clearCache(req, res) {
  try {
    voronoiService.clearCache();
    res.json({
      success: true,
      message: 'Voronoi cache cleared successfully'
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
  getVoronoiDiagrams,
  getVoronoiById,
  generateVoronoi,
  getStatistics,
  getCoverageGaps,
  filterByBoundary,
  deleteVoronoi,
  getCacheStats,
  clearCache
};
