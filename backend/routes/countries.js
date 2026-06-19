/**
 * Countries API Routes
 * 
 * Provides endpoints for country data:
 * - GET /api/countries - List all available countries
 * - GET /api/countries/:code - Get specific country details
 * - GET /api/countries/:code/stats - Get country statistics
 * 
 * @author Church Planting Map Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');

// Country configuration (mirrors frontend config)
const COUNTRY_CONFIG = {
  CM: {
    code: 'CM',
    code3: 'CMR',
    name: 'Cameroun',
    nameEn: 'Cameroon',
    capital: 'Yaoundé',
    region: 'Central Africa',
    center: [7.3697, 12.3547],
    zoom: 6,
    bounds: [
      [1.6559, 8.4944],
      [13.0833, 16.1921]
    ],
    languages: ['fr', 'en'],
    currency: 'XAF',
  },
  TD: {
    code: 'TD',
    code3: 'TCD',
    name: 'Tchad',
    nameEn: 'Chad',
    capital: "N'Djamena",
    region: 'Central Africa',
    center: [15.4542, 18.7322],
    zoom: 5,
    bounds: [
      [7.4419, 13.4734],
      [23.4503, 24.0000]
    ],
    languages: ['fr', 'ar'],
    currency: 'XAF',
  },
  CF: {
    code: 'CF',
    code3: 'CAF',
    name: 'République centrafricaine',
    nameEn: 'Central African Republic',
    capital: 'Bangui',
    region: 'Central Africa',
    center: [6.6111, 20.9394],
    zoom: 6,
    bounds: [
      [2.2207, 14.4200],
      [11.0078, 27.4583]
    ],
    languages: ['fr', 'sg'],
    currency: 'XAF',
  },
  CG: {
    code: 'CG',
    code3: 'COG',
    name: 'Congo',
    nameEn: 'Republic of the Congo',
    capital: 'Brazzaville',
    region: 'Central Africa',
    center: [-0.2280, 15.8277],
    zoom: 6,
    bounds: [
      [-5.0269, 11.2050],
      [3.7031, 18.6500]
    ],
    languages: ['fr'],
    currency: 'XAF',
  },
  CD: {
    code: 'CD',
    code3: 'COD',
    name: 'RD Congo',
    nameEn: 'Democratic Republic of the Congo',
    capital: 'Kinshasa',
    region: 'Central Africa',
    center: [-4.0383, 21.7587],
    zoom: 5,
    bounds: [
      [-13.4559, 12.2044],
      [5.3920, 31.3056]
    ],
    languages: ['fr'],
    currency: 'CDF',
  },
  GA: {
    code: 'GA',
    code3: 'GAB',
    name: 'Gabon',
    nameEn: 'Gabon',
    capital: 'Libreville',
    region: 'Central Africa',
    center: [-0.8037, 11.6094],
    zoom: 7,
    bounds: [
      [-3.9783, 8.6958],
      [2.3226, 14.5025]
    ],
    languages: ['fr'],
    currency: 'XAF',
  },
  GQ: {
    code: 'GQ',
    code3: 'GNQ',
    name: 'Guinée équatoriale',
    nameEn: 'Equatorial Guinea',
    capital: 'Malabo',
    region: 'Central Africa',
    center: [1.6508, 10.2679],
    zoom: 8,
    bounds: [
      [0.9200, 5.6147],
      [2.3469, 11.3376]
    ],
    languages: ['es', 'fr', 'pt'],
    currency: 'XAF',
  },
  ST: {
    code: 'ST',
    code3: 'STP',
    name: 'Sao Tomé-et-Príncipe',
    nameEn: 'São Tomé and Príncipe',
    capital: 'São Tomé',
    region: 'Central Africa',
    center: [0.1864, 6.6131],
    zoom: 10,
    bounds: [
      [-0.0142, 6.4700],
      [1.7014, 7.4633]
    ],
    languages: ['pt'],
    currency: 'STN',
  },
};

// Helper function to convert country code to database name
const countryCodeToDbName = (code) => {
  const config = COUNTRY_CONFIG[code?.toUpperCase()];
  return config?.name || null;
};

/**
 * GET /api/countries
 * List all available countries
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { region } = req.query;
    
    let countries = Object.values(COUNTRY_CONFIG);
    
    // Filter by region if specified
    if (region) {
      countries = countries.filter(c => 
        c.region.toLowerCase() === region.toLowerCase()
      );
    }
    
    // Sort by name
    countries.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      success: true,
      count: countries.length,
      countries: countries.map(c => ({
        code: c.code,
        code3: c.code3,
        name: c.name,
        nameEn: c.nameEn,
        capital: c.capital,
        region: c.region,
        center: c.center,
        zoom: c.zoom,
        bounds: c.bounds,
      })),
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/countries/:code
 * Get specific country details
 */
router.get('/:code', optionalAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();
    
    // Try direct match
    let country = COUNTRY_CONFIG[upperCode];
    
    // Try alpha-3 match
    if (!country) {
      country = Object.values(COUNTRY_CONFIG).find(c => c.code3 === upperCode);
    }
    
    if (!country) {
      return res.status(404).json({
        success: false,
        error: 'Country not found',
        message: `No country found with code: ${code}`,
      });
    }
    
    res.json({
      success: true,
      country,
    });
  } catch (error) {
    console.error('Error fetching country:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/countries/:code/bounds
 * Get country bounding box for map fitting
 */
router.get('/:code/bounds', optionalAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();
    
    const country = COUNTRY_CONFIG[upperCode];
    
    if (!country) {
      return res.status(404).json({
        success: false,
        error: 'Country not found',
      });
    }
    
    res.json({
      success: true,
      code: country.code,
      bounds: country.bounds,
      center: country.center,
      zoom: country.zoom,
    });
  } catch (error) {
    console.error('Error fetching country bounds:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
});

// Export helper function for use in other routes
module.exports = router;
module.exports.countryCodeToDbName = countryCodeToDbName;
module.exports.COUNTRY_CONFIG = COUNTRY_CONFIG;
