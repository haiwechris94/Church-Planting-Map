/**
 * Search Routes - Unified search across villages, people groups, and statuses
 */
const express = require('express');
const Village = require('../models/Village');
const PeopleGroup = require('../models/PeopleGroup');
const Church = require('../models/Church');
const { optionalAuth } = require('../middleware/auth');
const { logSearch } = require('../middleware/activityLogger');
const { searchSimilarVillages, calculateDistanceMeters, formatDistance } = require('../services/fuzzySearchService');

const router = express.Router();

/**
 * GET /search - Unified search endpoint
 * Query params:
 *   q: search query (required)
 *   type: village|people|church|status|all (default: all)
 *   limit: max results per type (default: 10)
 *   region: filter by region
 *   country: filter by country
 */
router.get('/', optionalAuth, logSearch, async (req, res) => {
  try {
    const { 
      q, 
      type = 'all', 
      limit = 10,
      region,
      country,
    } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchRegex = new RegExp(q, 'i');
    const limitNum = Math.min(parseInt(limit), 50);
    const results = {};

    // Base filters
    const baseFilters = {};
    if (region) baseFilters.region = region;
    if (country) baseFilters.country = country;

    // Search villages
    if (type === 'all' || type === 'village') {
      const villageQuery = {
        ...baseFilters,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { region: searchRegex },
          { country: searchRegex },
        ],
      };

      results.villages = await Village.find(villageQuery)
        .select('name location status population region country description')
        .limit(limitNum)
        .lean();
    }

    // Search people groups
    if (type === 'all' || type === 'people') {
      const pgQuery = {
        ...baseFilters,
        approved: true,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { language: searchRegex },
          { religion: searchRegex },
        ],
      };

      results.peopleGroups = await PeopleGroup.find(pgQuery)
        .select('name location status statusColor progressPercentage population language religion')
        .limit(limitNum)
        .lean();
    }

    // Search churches
    if (type === 'all' || type === 'church') {
      const churchQuery = {
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { leader: searchRegex },
        ],
      };

      results.churches = await Church.find(churchQuery)
        .select('name status memberCount leader plantedDate')
        .populate('village', 'name location')
        .limit(limitNum)
        .lean();
    }

    // Search by status
    if (type === 'status') {
      const statusQuery = q.toLowerCase();
      
      // Map common search terms to status values
      const statusMappings = {
        'pioneer': ['pioneer'],
        'blue': ['pioneer'],
        'mid': ['mid-journey'],
        'journey': ['mid-journey'],
        'orange': ['mid-journey'],
        'tipping': ['tipping-point'],
        'green': ['tipping-point'],
        'movement': ['movement'],
        'red': ['movement'],
        'unreached': ['unreached'],
        'progress': ['in-progress'],
        'planted': ['church-planted'],
        'multiplying': ['multiplying'],
      };

      const matchedStatuses = Object.entries(statusMappings)
        .filter(([key]) => key.includes(statusQuery))
        .flatMap(([, values]) => values);

      if (matchedStatuses.length > 0) {
        results.villages = await Village.find({
          ...baseFilters,
          status: { $in: matchedStatuses },
        })
          .select('name location status population region country')
          .limit(limitNum)
          .lean();

        results.peopleGroups = await PeopleGroup.find({
          ...baseFilters,
          approved: true,
          status: { $in: matchedStatuses },
        })
          .select('name location status statusColor progressPercentage population')
          .limit(limitNum)
          .lean();
      }
    }

    // Calculate totals
    const total = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);

    // Format results with type labels
    const formattedResults = [];
    
    if (results.villages) {
      results.villages.forEach(v => {
        formattedResults.push({
          type: 'village',
          id: v._id,
          name: v.name,
          status: v.status,
          location: v.location,
          subtitle: `${v.region || ''}${v.region && v.country ? ', ' : ''}${v.country || ''}`.trim() || 'Village',
          population: v.population,
        });
      });
    }

    if (results.peopleGroups) {
      results.peopleGroups.forEach(pg => {
        formattedResults.push({
          type: 'people-group',
          id: pg._id,
          name: pg.name,
          status: pg.status,
          statusColor: pg.statusColor,
          location: pg.location,
          subtitle: `${pg.language || 'Unknown language'}${pg.religion ? ` • ${pg.religion}` : ''}`,
          progress: pg.progressPercentage,
        });
      });
    }

    if (results.churches) {
      results.churches.forEach(c => {
        formattedResults.push({
          type: 'church',
          id: c._id,
          name: c.name,
          status: c.status,
          location: c.village?.location,
          subtitle: c.village?.name || 'Church',
          memberCount: c.memberCount,
        });
      });
    }

    res.json({
      query: q,
      type,
      total,
      results: formattedResults,
      breakdown: {
        villages: results.villages?.length || 0,
        peopleGroups: results.peopleGroups?.length || 0,
        churches: results.churches?.length || 0,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /search/suggestions - Get search suggestions (autocomplete)
 */
router.get('/suggestions', optionalAuth, async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ suggestions: [] });
    }

    const searchRegex = new RegExp(`^${q}`, 'i');
    const limitNum = Math.min(parseInt(limit), 10);

    // Get unique names from villages and people groups
    const [villageNames, pgNames] = await Promise.all([
      Village.find({ name: searchRegex })
        .select('name')
        .limit(limitNum)
        .lean(),
      PeopleGroup.find({ name: searchRegex, approved: true })
        .select('name')
        .limit(limitNum)
        .lean(),
    ]);

    // Combine and deduplicate
    const suggestions = [...new Set([
      ...villageNames.map(v => v.name),
      ...pgNames.map(pg => pg.name),
    ])].slice(0, limitNum);

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({
      error: 'Suggestions failed',
      message: error.message
    });
  }
});

/**
 * GET /search/nearby - Search near a location
 */
router.get('/nearby', optionalAuth, async (req, res) => {
  try {
    const { lng, lat, radius = 10000, type = 'all', limit = 20 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        error: 'Invalid location',
        message: 'Longitude and latitude are required'
      });
    }

    const coordinates = [parseFloat(lng), parseFloat(lat)];
    const maxDistance = parseInt(radius);
    const limitNum = Math.min(parseInt(limit), 100);

    const geoQuery = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates,
          },
          $maxDistance: maxDistance,
        },
      },
    };

    const results = {};

    if (type === 'all' || type === 'village') {
      results.villages = await Village.find(geoQuery)
        .select('name location status population region country')
        .limit(limitNum)
        .lean();
    }

    if (type === 'all' || type === 'people') {
      results.peopleGroups = await PeopleGroup.find({
        ...geoQuery,
        approved: true,
      })
        .select('name location status statusColor progressPercentage population')
        .limit(limitNum)
        .lean();
    }

    const total = (results.villages?.length || 0) + (results.peopleGroups?.length || 0);

    res.json({
      center: { lng: coordinates[0], lat: coordinates[1] },
      radius: maxDistance,
      total,
      results,
    });
  } catch (error) {
    console.error('Nearby search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /search/proximity - Advanced proximity search with fuzzy name matching
 * Query params:
 *   lng: center longitude (required)
 *   lat: center latitude (required)
 *   radius: search radius in meters (default: 10000)
 *   name: village name to search for (optional)
 *   limit: max results (default: 20)
 *   fuzzy: enable fuzzy matching when no exact results (default: true)
 */
router.get('/proximity', optionalAuth, async (req, res) => {
  try {
    const { 
      lng, 
      lat, 
      radius = 10000, 
      name, 
      limit = 20,
      fuzzy = 'true'
    } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'La longitude et la latitude sont requises'
      });
    }

    const coordinates = [parseFloat(lng), parseFloat(lat)];
    const maxDistance = parseInt(radius);
    const limitNum = Math.min(parseInt(limit), 100);
    const enableFuzzy = fuzzy === 'true';
    const centerPoint = { lat: parseFloat(lat), lng: parseFloat(lng) };

    // Build geo query
    const geoQuery = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates,
          },
          $maxDistance: maxDistance,
        },
      },
    };

    // If name is provided, add name filter for exact match
    if (name && name.trim()) {
      geoQuery.name = new RegExp(name.trim(), 'i');
    }

    // Search for exact matches
    let villages = await Village.find(geoQuery)
      .select('name location status population region country description')
      .limit(limitNum)
      .lean();

    // Add distance to each result
    villages = villages.map(village => {
      const [vLng, vLat] = village.location.coordinates;
      const distance = calculateDistanceMeters(centerPoint.lat, centerPoint.lng, vLat, vLng);
      return {
        ...village,
        distance,
        distanceFormatted: formatDistance(distance),
        coordinates: { lat: vLat, lng: vLng }
      };
    });

    // If no exact results and name was provided, try fuzzy search
    let suggestions = [];
    let hasSuggestions = false;

    if (villages.length === 0 && name && name.trim() && enableFuzzy) {
      // Search in expanded radius (2x) without name filter
      const expandedRadius = maxDistance * 2;
      const expandedGeoQuery = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates,
            },
            $maxDistance: expandedRadius,
          },
        },
      };

      const allVillagesInArea = await Village.find(expandedGeoQuery)
        .select('name location status population region country description')
        .limit(500) // Get more for fuzzy matching
        .lean();

      // Use fuzzy search service to find similar names
      suggestions = searchSimilarVillages(
        allVillagesInArea,
        name.trim(),
        centerPoint,
        expandedRadius,
        {
          minSimilarity: 25,
          maxResults: 10,
          distanceWeight: 0.3,
          similarityWeight: 0.7
        }
      );

      hasSuggestions = suggestions.length > 0;
    }

    res.json({
      center: { lng: coordinates[0], lat: coordinates[1] },
      radius: maxDistance,
      searchName: name || null,
      total: villages.length,
      results: villages,
      // Suggestions section
      hasSuggestions,
      suggestions: hasSuggestions ? {
        message: `Aucun village trouvé avec le nom exact '${name}'. Voici des villages avec des noms similaires :`,
        expandedRadius: maxDistance * 2,
        items: suggestions
      } : null
    });
  } catch (error) {
    console.error('Proximity search error:', error);
    res.status(500).json({
      error: 'Erreur de recherche',
      message: error.message
    });
  }
});

/**
 * POST /search/similar-names - Search for villages with similar names
 * Body params:
 *   name: village name to search for (required)
 *   lat: center latitude (optional)
 *   lng: center longitude (optional)
 *   radius: search radius in meters (optional, default: 50000)
 *   minSimilarity: minimum similarity percentage (optional, default: 30)
 *   limit: max results (optional, default: 10)
 */
router.post('/similar-names', optionalAuth, async (req, res) => {
  try {
    const {
      name,
      lat,
      lng,
      radius = 50000,
      minSimilarity = 30,
      limit = 10
    } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'Le nom doit contenir au moins 2 caractères'
      });
    }

    let query = {};
    let centerPoint = null;

    // If coordinates provided, search within radius
    if (lat && lng) {
      centerPoint = { lat: parseFloat(lat), lng: parseFloat(lng) };
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius),
        },
      };
    }

    // Get villages (limit to 500 for performance)
    const villages = await Village.find(query)
      .select('name location status population region country')
      .limit(500)
      .lean();

    // Use fuzzy search service
    const suggestions = searchSimilarVillages(
      villages,
      name.trim(),
      centerPoint,
      parseInt(radius),
      {
        minSimilarity: parseInt(minSimilarity),
        maxResults: parseInt(limit),
        distanceWeight: centerPoint ? 0.3 : 0,
        similarityWeight: centerPoint ? 0.7 : 1
      }
    );

    res.json({
      searchName: name,
      center: centerPoint,
      radius: centerPoint ? parseInt(radius) : null,
      total: suggestions.length,
      suggestions
    });
  } catch (error) {
    console.error('Similar names search error:', error);
    res.status(500).json({
      error: 'Erreur de recherche',
      message: error.message
    });
  }
});

module.exports = router;
