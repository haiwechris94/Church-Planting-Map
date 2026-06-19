/**
 * Church Population Ratio Routes
 * API endpoints for church-to-population ratio data by administrative level
 * 
 * Base path: /api/church-population-ratio
 * 
 * Endpoints:
 * - GET / - Get church population ratio data for all administrative units
 * - GET /admin1 - Get ratio data for Admin 1 (Regions)
 * - GET /admin2 - Get ratio data for Admin 2 (Departments)
 */
const express = require('express');
const router = express.Router();
const PeopleGroup = require('../models/PeopleGroup');
const { optionalAuth } = require('../middleware/auth');

/**
 * Calculate church population ratio color based on ratio value
 * @param {number} ratio - Churches per person (e.g., 1/100000 = 0.00001)
 * @returns {string} Hex color code
 */
const getColorByRatio = (ratio) => {
  if (ratio >= 1/1000) return '#00FF00';   // Bright Green: 1:1000 or better
  if (ratio >= 1/5000) return '#008080';   // Teal: 1:5000 to 1:1000
  if (ratio >= 1/25000) return '#90EE90';  // Light Green: 1:25000 to 1:5000
  if (ratio >= 1/50000) return '#FFFF00';  // Yellow: 1:50000 to 1:25000
  if (ratio >= 1/100000) return '#FFA500'; // Orange: 1:100000 to 1:50000
  return '#CCCCCC';                         // Gray: worse than 1:100000 or no data
};

/**
 * Get ratio category label
 * @param {number} ratio - Churches per person
 * @returns {string} Category label
 */
const getRatioCategory = (ratio) => {
  if (ratio >= 1/1000) return '1:1000+';
  if (ratio >= 1/5000) return '1:5000';
  if (ratio >= 1/25000) return '1:25000';
  if (ratio >= 1/50000) return '1:50000';
  if (ratio >= 1/100000) return '1:100000';
  return 'No data';
};

/**
 * @route GET /api/church-population-ratio
 * @description Get API information and available endpoints
 * @access Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Church Population Ratio API',
    version: '1.0.0',
    description: 'API for church-to-population ratio data by administrative level',
    endpoints: {
      admin1: {
        method: 'GET',
        path: '/api/church-population-ratio/admin1',
        description: 'Get church population ratio data for Admin 1 (Regions)'
      },
      admin2: {
        method: 'GET',
        path: '/api/church-population-ratio/admin2',
        description: 'Get church population ratio data for Admin 2 (Departments)'
      }
    },
    colorLegend: {
      brightGreen: { color: '#00FF00', ratio: '1:1000 or better', description: 'Excellent coverage' },
      teal: { color: '#008080', ratio: '1:5000 to 1:1000', description: 'Good coverage' },
      lightGreen: { color: '#90EE90', ratio: '1:25000 to 1:5000', description: 'Moderate coverage' },
      yellow: { color: '#FFFF00', ratio: '1:50000 to 1:25000', description: 'Low coverage' },
      orange: { color: '#FFA500', ratio: '1:100000 to 1:50000', description: 'Very low coverage' },
      gray: { color: '#CCCCCC', ratio: 'worse than 1:100000', description: 'No data or minimal coverage' }
    }
  });
});

/**
 * @route GET /api/church-population-ratio/admin1
 * @description Get church population ratio data for Admin 1 (Regions)
 * @access Public
 */
router.get('/admin1', optionalAuth, async (req, res) => {
  try {
    // Aggregate people groups by region
    const regionData = await PeopleGroup.aggregate([
      {
        $match: {
          region: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$region',
          totalChurches: { $sum: { $ifNull: ['$numberOfChurches', 0] } },
          totalPopulation: { $sum: { $ifNull: ['$population', 0] } },
          peopleGroupCount: { $sum: 1 }
        }
      },
      {
        $project: {
          adminId: '$_id',
          adminName: '$_id',
          adminLevel: 'admin1',
          churchCount: '$totalChurches',
          populationCount: '$totalPopulation',
          peopleGroupCount: 1,
          ratio: {
            $cond: {
              if: { $gt: ['$totalPopulation', 0] },
              then: { $divide: ['$totalChurches', '$totalPopulation'] },
              else: 0
            }
          }
        }
      },
      {
        $sort: { adminName: 1 }
      }
    ]);

    // Add color and category to each region
    const enrichedData = regionData.map(region => ({
      ...region,
      color: getColorByRatio(region.ratio),
      category: getRatioCategory(region.ratio),
      ratioDisplay: region.populationCount > 0 
        ? `1:${Math.round(region.populationCount / Math.max(region.churchCount, 1)).toLocaleString()}`
        : 'N/A'
    }));

    // Calculate summary statistics
    const totalChurches = enrichedData.reduce((sum, r) => sum + r.churchCount, 0);
    const totalPopulation = enrichedData.reduce((sum, r) => sum + r.populationCount, 0);
    const overallRatio = totalPopulation > 0 ? totalChurches / totalPopulation : 0;

    res.json({
      success: true,
      adminLevel: 'admin1',
      data: enrichedData,
      summary: {
        totalRegions: enrichedData.length,
        totalChurches,
        totalPopulation,
        overallRatio,
        overallColor: getColorByRatio(overallRatio),
        overallCategory: getRatioCategory(overallRatio),
        overallRatioDisplay: totalPopulation > 0 
          ? `1:${Math.round(totalPopulation / Math.max(totalChurches, 1)).toLocaleString()}`
          : 'N/A'
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching admin1 church population ratio:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * @route GET /api/church-population-ratio/admin2
 * @description Get church population ratio data for Admin 2 (Departments)
 * @access Public
 * @query {string} region - Optional filter by region name
 */
router.get('/admin2', optionalAuth, async (req, res) => {
  try {
    const { region } = req.query;
    
    // Build match stage
    const matchStage = {
      villageName: { $exists: true, $ne: null, $ne: '' }
    };
    
    if (region) {
      matchStage.region = region;
    }

    // We need to extract department from villageName or use a lookup
    // For now, we'll aggregate by villageName and group by the first part
    // In a real scenario, you'd have a department field or use GeoJSON spatial queries
    
    // Aggregate people groups - using region as a proxy for department grouping
    // In production, you'd want to do a spatial join with admin boundaries
    const departmentData = await PeopleGroup.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: {
            region: '$region',
            village: '$villageName'
          },
          totalChurches: { $sum: { $ifNull: ['$numberOfChurches', 0] } },
          totalPopulation: { $sum: { $ifNull: ['$population', 0] } },
          peopleGroupCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.region',
          villages: {
            $push: {
              villageName: '$_id.village',
              churches: '$totalChurches',
              population: '$totalPopulation',
              peopleGroups: '$peopleGroupCount'
            }
          },
          totalChurches: { $sum: '$totalChurches' },
          totalPopulation: { $sum: '$totalPopulation' },
          villageCount: { $sum: 1 },
          peopleGroupCount: { $sum: '$peopleGroupCount' }
        }
      },
      {
        $project: {
          adminId: '$_id',
          adminName: '$_id',
          adminLevel: 'admin2',
          churchCount: '$totalChurches',
          populationCount: '$totalPopulation',
          villageCount: 1,
          peopleGroupCount: 1,
          ratio: {
            $cond: {
              if: { $gt: ['$totalPopulation', 0] },
              then: { $divide: ['$totalChurches', '$totalPopulation'] },
              else: 0
            }
          }
        }
      },
      {
        $sort: { adminName: 1 }
      }
    ]);

    // Add color and category to each department
    const enrichedData = departmentData.map(dept => ({
      ...dept,
      color: getColorByRatio(dept.ratio),
      category: getRatioCategory(dept.ratio),
      ratioDisplay: dept.populationCount > 0 
        ? `1:${Math.round(dept.populationCount / Math.max(dept.churchCount, 1)).toLocaleString()}`
        : 'N/A'
    }));

    // Calculate summary statistics
    const totalChurches = enrichedData.reduce((sum, d) => sum + d.churchCount, 0);
    const totalPopulation = enrichedData.reduce((sum, d) => sum + d.populationCount, 0);
    const overallRatio = totalPopulation > 0 ? totalChurches / totalPopulation : 0;

    res.json({
      success: true,
      adminLevel: 'admin2',
      filter: region ? { region } : null,
      data: enrichedData,
      summary: {
        totalDepartments: enrichedData.length,
        totalChurches,
        totalPopulation,
        overallRatio,
        overallColor: getColorByRatio(overallRatio),
        overallCategory: getRatioCategory(overallRatio),
        overallRatioDisplay: totalPopulation > 0 
          ? `1:${Math.round(totalPopulation / Math.max(totalChurches, 1)).toLocaleString()}`
          : 'N/A'
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching admin2 church population ratio:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * @route GET /api/church-population-ratio/by-admin-name
 * @description Get church population ratio for a specific administrative unit by name
 * @access Public
 * @query {string} name - Administrative unit name (required)
 * @query {string} level - Admin level: 'admin1' or 'admin2' (default: 'admin1')
 */
router.get('/by-admin-name', optionalAuth, async (req, res) => {
  try {
    const { name, level = 'admin1' } = req.query;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: name'
      });
    }

    // Build match stage based on level
    const matchStage = {};
    if (level === 'admin1') {
      matchStage.region = { $regex: new RegExp(`^${name}$`, 'i') };
    } else {
      // For admin2, we search in villageName or a department field if available
      matchStage.villageName = { $regex: new RegExp(name, 'i') };
    }

    const result = await PeopleGroup.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalChurches: { $sum: { $ifNull: ['$numberOfChurches', 0] } },
          totalPopulation: { $sum: { $ifNull: ['$population', 0] } },
          peopleGroupCount: { $sum: 1 }
        }
      }
    ]);

    if (result.length === 0) {
      return res.json({
        success: true,
        adminName: name,
        adminLevel: level,
        churchCount: 0,
        populationCount: 0,
        ratio: 0,
        color: '#CCCCCC',
        category: 'No data',
        ratioDisplay: 'N/A'
      });
    }

    const data = result[0];
    const ratio = data.totalPopulation > 0 ? data.totalChurches / data.totalPopulation : 0;

    res.json({
      success: true,
      adminName: name,
      adminLevel: level,
      churchCount: data.totalChurches,
      populationCount: data.totalPopulation,
      peopleGroupCount: data.peopleGroupCount,
      ratio,
      color: getColorByRatio(ratio),
      category: getRatioCategory(ratio),
      ratioDisplay: data.totalPopulation > 0 
        ? `1:${Math.round(data.totalPopulation / Math.max(data.totalChurches, 1)).toLocaleString()}`
        : 'N/A'
    });
  } catch (error) {
    console.error('Error fetching church population ratio by name:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router;
