/**
 * Administrative Polygons API Routes
 * 
 * Provides endpoints for administrative boundary polygons:
 * - GET /api/admin-polygons - Get polygons filtered by country
 * - GET /api/admin-polygons/:id - Get specific polygon
 * 
 * @author Church Planting Map Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { countryCodeToDbName, COUNTRY_CONFIG } = require('./countries');

// Try to import AdminPolygon model if it exists
let AdminPolygon;
try {
  AdminPolygon = require('../models/AdminPolygon');
} catch (e) {
  console.log('AdminPolygon model not found, using fallback');
  AdminPolygon = null;
}

/**
 * GET /api/admin-polygons
 * Get administrative polygons filtered by country
 * 
 * Query params:
 * - country: ISO country code (e.g., 'CM', 'TD')
 * - level: Administrative level (1 = region, 2 = department, 3 = commune)
 * - bbox: Bounding box filter (format: west,south,east,north)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { country, level = 1, bbox, limit = 100 } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by country
    if (country) {
      const countryName = countryCodeToDbName(country);
      if (countryName) {
        query.country = countryName;
      } else {
        // Try direct country code match
        query.$or = [
          { countryCode: country.toUpperCase() },
          { country: country }
        ];
      }
    }
    
    // Filter by administrative level
    if (level) {
      query.adminLevel = parseInt(level);
    }
    
    // Filter by bounding box
    if (bbox) {
      const [west, south, east, north] = bbox.split(',').map(Number);
      if (!isNaN(west) && !isNaN(south) && !isNaN(east) && !isNaN(north)) {
        query.geometry = {
          $geoWithin: {
            $box: [[west, south], [east, north]]
          }
        };
      }
    }
    
    let polygons = [];
    
    // Try to fetch from database
    if (AdminPolygon) {
      polygons = await AdminPolygon.find(query)
        .limit(parseInt(limit))
        .select('-__v')
        .lean();
    }
    
    // If no database results, return country bounds as fallback
    if (polygons.length === 0 && country) {
      const countryConfig = COUNTRY_CONFIG[country.toUpperCase()];
      if (countryConfig) {
        // Create a simple polygon from country bounds
        const bounds = countryConfig.bounds;
        polygons = [{
          _id: `country-${countryConfig.code}`,
          name: countryConfig.name,
          nameEn: countryConfig.nameEn,
          country: countryConfig.name,
          countryCode: countryConfig.code,
          adminLevel: 0,
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [bounds[0][1], bounds[0][0]], // SW
              [bounds[1][1], bounds[0][0]], // SE
              [bounds[1][1], bounds[1][0]], // NE
              [bounds[0][1], bounds[1][0]], // NW
              [bounds[0][1], bounds[0][0]], // SW (close)
            ]]
          },
          center: countryConfig.center,
          bounds: bounds,
        }];
      }
    }
    
    res.json({
      success: true,
      count: polygons.length,
      country: country || 'all',
      level: parseInt(level),
      polygons,
    });
  } catch (error) {
    console.error('Error fetching admin polygons:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/admin-polygons/:id
 * Get specific administrative polygon by ID
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!AdminPolygon) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Administrative polygon not found',
      });
    }
    
    const polygon = await AdminPolygon.findById(id).lean();
    
    if (!polygon) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Administrative polygon not found',
      });
    }
    
    res.json({
      success: true,
      polygon,
    });
  } catch (error) {
    console.error('Error fetching admin polygon:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/admin-polygons/country/:code/geojson
 * Get all polygons for a country as GeoJSON FeatureCollection
 */
router.get('/country/:code/geojson', optionalAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const { level = 1 } = req.query;
    
    const countryName = countryCodeToDbName(code);
    
    let features = [];
    
    if (AdminPolygon && countryName) {
      const polygons = await AdminPolygon.find({
        country: countryName,
        adminLevel: parseInt(level),
      }).lean();
      
      features = polygons.map(p => ({
        type: 'Feature',
        properties: {
          id: p._id,
          name: p.name,
          nameEn: p.nameEn,
          adminLevel: p.adminLevel,
          country: p.country,
        },
        geometry: p.geometry,
      }));
    }
    
    // Fallback to country bounds
    if (features.length === 0) {
      const countryConfig = COUNTRY_CONFIG[code.toUpperCase()];
      if (countryConfig) {
        const bounds = countryConfig.bounds;
        features = [{
          type: 'Feature',
          properties: {
            id: `country-${countryConfig.code}`,
            name: countryConfig.name,
            nameEn: countryConfig.nameEn,
            adminLevel: 0,
            country: countryConfig.name,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [bounds[0][1], bounds[0][0]],
              [bounds[1][1], bounds[0][0]],
              [bounds[1][1], bounds[1][0]],
              [bounds[0][1], bounds[1][0]],
              [bounds[0][1], bounds[0][0]],
            ]]
          },
        }];
      }
    }
    
    res.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (error) {
    console.error('Error fetching GeoJSON:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
});

module.exports = router;
