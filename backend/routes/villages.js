const express = require('express');
const Village = require('../models/Village');
const { auth, optionalAuth } = require('../middleware/auth');
const villageStatusService = require('../services/villageStatusService');

/**
 * Turf.js - Advanced geospatial analysis library
 * Used for generating Voronoi diagrams (Thiessen polygons) to visualize
 * village influence zones on the map.
 * 
 * Voronoi diagrams partition space into regions where each region contains
 * all points closest to a specific seed point (village). This is useful for:
 * - Visualizing village coverage areas
 * - Identifying gaps in church planting coverage
 * - Planning outreach strategies
 */
const turf = require('@turf/turf');

const router = express.Router();

// Helper function to validate and sanitize boundary data
// Returns valid boundary object or undefined if invalid/incomplete
function sanitizeBoundary(boundary) {
  if (!boundary) return undefined;
  
  // Check if boundary has valid coordinates
  if (!boundary.coordinates || 
      !Array.isArray(boundary.coordinates) || 
      boundary.coordinates.length === 0) {
    return undefined;
  }
  
  const ring = boundary.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return undefined;
  }
  
  // Validate that first and last points are the same (closed polygon)
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    return undefined;
  }
  
  // Return valid boundary with type
  return {
    type: 'Polygon',
    coordinates: boundary.coordinates
  };
}

/**
 * GET /villages - Get all villages with pagination and geographic filtering
 * 
 * PAGINATION:
 * - page-based pagination (more intuitive than skip)
 * - Returns totalCount, totalPages, currentPage, hasMore
 * - Maximum limit: 500 records per page
 * 
 * GEOGRAPHIC FILTERS:
 * - country: Filter by country code (ISO 3166-1 alpha-2 or alpha-3)
 * - region: Filter by region/admin1 name
 * - admin2/departement: Filter by department/admin2 name
 * - admin3/arrondissement: Filter by arrondissement/admin3 name
 * 
 * @query {string} status - Filter by village status
 * @query {string} country - Country code (e.g., CM, TD, CG)
 * @query {string} region - Region/admin1 name
 * @query {string} admin2 - Department/admin2 name (alias: departement)
 * @query {string} admin3 - Arrondissement/admin3 name (alias: arrondissement)
 * @query {number} page - Page number (1-based, default: 1)
 * @query {number} limit - Records per page (default: 100, max: 500)
 * @query {number} skip - Legacy: Number of records to skip
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      status, 
      country, 
      region,
      admin2,
      admin3,
      departement,      // Alias for admin2
      arrondissement,   // Alias for admin3
      page: pageParam,
      limit: limitParam = 100, 
      skip: skipParam 
    } = req.query;
    
    // ============================================
    // PAGINATION VALIDATION
    // ============================================
    const DEFAULT_LIMIT = 100;
    const MAX_LIMIT = 500;
    const MIN_PAGE = 1;
    
    let page = parseInt(pageParam, 10);
    let limit = parseInt(limitParam, 10);
    let skip;
    
    // Ensure limit is valid
    if (isNaN(limit) || limit < 1) {
      limit = DEFAULT_LIMIT;
    } else if (limit > MAX_LIMIT) {
      limit = MAX_LIMIT;
    }
    
    // Support both page-based and legacy skip-based pagination
    if (!isNaN(page) && page >= MIN_PAGE) {
      skip = (page - 1) * limit;
    } else if (skipParam !== undefined) {
      skip = parseInt(skipParam, 10);
      if (isNaN(skip) || skip < 0) {
        skip = 0;
      }
      page = Math.floor(skip / limit) + 1;
    } else {
      page = MIN_PAGE;
      skip = 0;
    }
    
    // ============================================
    // BUILD QUERY WITH FILTERS
    // ============================================
    const query = {};
    
    // Status filter
    if (status && typeof status === 'string' && status.trim()) {
      query.status = status.trim();
    }
    
    // Country filtering with ISO code mapping
    if (country && typeof country === 'string' && country.trim()) {
      const countryCodeMap = {
        'COG': 'CG',  // Congo (Republic of the Congo)
        'COD': 'CD',  // Democratic Republic of the Congo
        'CAF': 'CF',  // Central African Republic
        'CMR': 'CM',  // Cameroon
        'TCD': 'TD',  // Chad
        'GAB': 'GA'   // Gabon
      };
      
      const mappedCode = countryCodeMap[country.toUpperCase()] || country;
      
      // Query both country name and osmData.countryCode
      query.$or = [
        { country: new RegExp(country.trim(), 'i') },
        { 'osmData.countryCode': mappedCode.toUpperCase() }
      ];
    }
    
    // Region/admin1 filter
    if (region && typeof region === 'string' && region.trim()) {
      query.region = { $regex: region.trim(), $options: 'i' };
    }
    
    // Department/admin2 filter (support both admin2 and departement)
    const admin2Value = admin2 || departement;
    if (admin2Value && typeof admin2Value === 'string' && admin2Value.trim()) {
      query.departement = { $regex: admin2Value.trim(), $options: 'i' };
    }
    
    // Arrondissement/admin3 filter (support both admin3 and arrondissement)
    const admin3Value = admin3 || arrondissement;
    if (admin3Value && typeof admin3Value === 'string' && admin3Value.trim()) {
      query.arrondissement = { $regex: admin3Value.trim(), $options: 'i' };
    }
    
    console.log('[API] GET /villages - Query:', JSON.stringify(query, null, 2));
    console.log('[API] Pagination: page=%d, limit=%d, skip=%d', page, limit, skip);
    
    // ============================================
    // EXECUTE QUERY WITH PAGINATION
    // ============================================
    const [totalCount, villages] = await Promise.all([
      Village.countDocuments(query),
      Village.find(query)
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 })
        .lean()
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;
    const hasPrevious = page > 1;

    res.json({
      // Data array
      villages: villages,
      
      // Pagination metadata (new format)
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
        hasMore,
        hasPrevious
      },
      
      // Legacy fields for backward compatibility
      total: totalCount,
      limit: limit,
      skip: skip
    });
  } catch (error) {
    console.error('Error fetching villages:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
});

// ============================================
// VILLAGE STATUS ENDPOINTS (must be before /:id route)
// ============================================

/**
 * GET /villages/statuses
 * Get calculated status for all villages based on people group DMM percentages
 * 
 * Status Rules (Threshold-based):
 * - DMM: ≥ 30% of people groups have DMM status
 * - Tipping Point: ≥ 40% of people groups have Tipping Point status
 * - Midway: ≥ 50% of people groups have Midway status
 * - Pioneer: ≥ 70% of people groups have Pioneer status
 * - Unreached: No people groups or no threshold met
 * 
 * Returns:
 * {
 *   villages: [{ villageName, status, statusColor, totalPeoples, dmmCount, percentage, ... }],
 *   statistics: { totalVillages, byStatus, totalPeopleGroups, ... },
 *   statusColors: { pioneer: '#3b82f6', ... },
 *   statusDisplayNames: { pioneer: 'Pioneer', ... }
 * }
 */
router.get('/statuses', optionalAuth, async (req, res) => {
  try {
    console.log('📊 GET /api/villages/statuses called');
    
    const { status, includeJoshuaProject } = req.query;
    // Default to excluding Joshua Project (only DMM peoples) for status calculation
    const includeJP = includeJoshuaProject === 'true';
    
    if (status) {
      // Filter by specific status
      console.log(`📊 Filtering by status: ${status}, includeJoshuaProject: ${includeJP}`);
      const villages = await villageStatusService.getVillagesByStatus(status, { includeJoshuaProject: includeJP });
      console.log(`✅ Found ${villages.length} villages with status: ${status}`);
      return res.json({
        villages,
        total: villages.length,
        status,
        statusColors: villageStatusService.STATUS_COLORS,
        statusDisplayNames: villageStatusService.STATUS_DISPLAY_NAMES
      });
    }
    
    // Get all village statuses (excluding Joshua Project by default)
    const result = await villageStatusService.calculateAllVillageStatuses({ includeJoshuaProject: includeJP });
    console.log(`✅ Calculated statuses for ${result.villages.length} villages (includeJoshuaProject: ${includeJP})`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching village statuses:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /villages/statuses/:villageName
 * Get calculated status for a specific village
 * 
 * @param villageName - URL encoded village name
 * 
 * Returns:
 * {
 *   villageName, status, statusColor, statusDisplay,
 *   totalPeoples, dmmCount, percentage, allAtLeastPioneer,
 *   peopleGroupsByStatus: { pioneer, midway, 'tipping-point', dmm }
 * }
 */
router.get('/statuses/:villageName', optionalAuth, async (req, res) => {
  try {
    const villageName = decodeURIComponent(req.params.villageName);
    console.log(`📊 GET /api/villages/statuses/${villageName} called`);
    
    if (!villageName) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Village name is required'
      });
    }
    
    const villageStatus = await villageStatusService.calculateVillageStatus(villageName);
    console.log(`✅ Calculated status for village: ${villageName} -> ${villageStatus.status}`);
    res.json(villageStatus);
  } catch (error) {
    console.error(`❌ Error fetching village status for ${req.params.villageName}:`, error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /villages/status-summary
 * Get summary statistics of village statuses
 */
router.get('/status-summary', optionalAuth, async (req, res) => {
  try {
    console.log('📊 GET /api/villages/status-summary called');
    const result = await villageStatusService.calculateAllVillageStatuses();
    console.log(`✅ Generated status summary for ${result.villages.length} villages`);
    res.json({
      statistics: result.statistics,
      statusColors: result.statusColors,
      statusDisplayNames: result.statusDisplayNames,
      thresholds: result.thresholds,
      generatedAt: result.generatedAt
    });
  } catch (error) {
    console.error('❌ Error fetching village status summary:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// GET /villages/:id - Obtenir un village par ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const village = await Village.findById(req.params.id);

    if (!village) {
      return res.status(404).json({
        error: 'Non trouvé',
        message: 'Village non trouvé'
      });
    }

    // Return all village fields including demographic data
    res.json({
      _id: village._id,
      name: village.name,
      description: village.description,
      location: village.location,
      boundary: village.boundary,
      population: village.population,
      region: village.region,
      departement: village.departement,
      arrondissement: village.arrondissement,
      country: village.country,
      niveau: village.niveau,
      status: village.status,
      coverageStatus: village.coverageStatus,
      coveragePercentage: village.coveragePercentage,
      createdAt: village.createdAt,
      updatedAt: village.updatedAt
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'ID invalide',
        message: 'L\'ID du village est invalide'
      });
    }
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
});

// POST /villages - Créer un nouveau village
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, location, population, village: villageName, region, departement, arrondissement, country, niveau, status, boundary } = req.body;

    // Build village data object, only including defined values
    // This allows mongoose defaults to work properly
    const villageData = { name, location };
    if (description !== undefined) villageData.description = description;
    if (population !== undefined) villageData.population = population;
    if (villageName !== undefined) villageData.village = villageName;
    if (region !== undefined) villageData.region = region;
    if (departement !== undefined) villageData.departement = departement;
    if (arrondissement !== undefined) villageData.arrondissement = arrondissement;
    if (country !== undefined) villageData.country = country;
    if (niveau !== undefined) villageData.niveau = niveau;
    if (status !== undefined) villageData.status = status;
    
    // Only include boundary if it has valid coordinates
    // This prevents the MongoDB 2dsphere index error
    const sanitizedBoundary = sanitizeBoundary(boundary);
    if (sanitizedBoundary) {
      villageData.boundary = sanitizedBoundary;
    }

    const newVillage = new Village(villageData);

    await newVillage.save();

    res.status(201).json({
      message: 'Village créé avec succès',
      _id: newVillage._id,
      name: newVillage.name,
      description: newVillage.description,
      location: newVillage.location,
      boundary: newVillage.boundary,
      population: newVillage.population,
      village: newVillage.village,
      region: newVillage.region,
      departement: newVillage.departement,
      arrondissement: newVillage.arrondissement,
      country: newVillage.country,
      niveau: newVillage.niveau,
      status: newVillage.status,
      createdAt: newVillage.createdAt
    });
  } catch (error) {
    console.error('Error creating village:', error);
    res.status(400).json({
      error: 'Création échouée',
      message: error.message
    });
  }
});

// PUT /villages/:id - Mettre à jour un village
router.put('/:id', auth, async (req, res) => {
  try {
    const updates = ['name', 'description', 'location', 'population', 'village', 'region', 'departement', 'arrondissement', 'country', 'niveau', 'status'];
    const allowedUpdates = {};
    
    updates.forEach(update => {
      if (req.body[update] !== undefined) {
        allowedUpdates[update] = req.body[update];
      }
    });
    
    // Handle boundary separately - only include if valid
    if (req.body.boundary !== undefined) {
      const sanitizedBoundary = sanitizeBoundary(req.body.boundary);
      if (sanitizedBoundary) {
        allowedUpdates.boundary = sanitizedBoundary;
      } else {
        // If boundary is explicitly set but invalid, unset it
        allowedUpdates.$unset = { boundary: 1 };
      }
    }

    const village = await Village.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      { new: true, runValidators: true }
    );

    if (!village) {
      return res.status(404).json({
        error: 'Non trouvé',
        message: 'Village non trouvé'
      });
    }

    // Automatically recalculate status based on people groups
    const calculatedStatus = await villageStatusService.calculateVillageStatus(village.name);
    if (calculatedStatus && calculatedStatus !== village.status) {
      village.status = calculatedStatus;
      await village.save();
    }

    res.json({
      message: 'Village mis à jour avec succès',
      _id: village._id,
      name: village.name,
      description: village.description,
      location: village.location,
      boundary: village.boundary,
      population: village.population,
      village: village.village,
      region: village.region,
      departement: village.departement,
      arrondissement: village.arrondissement,
      country: village.country,
      niveau: village.niveau,
      status: village.status,
      updatedAt: village.updatedAt
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'ID invalide',
        message: 'L\'ID du village est invalide'
      });
    }
    res.status(400).json({
      error: 'Mise à jour échouée',
      message: error.message
    });
  }
});

// DELETE /villages/:id - Supprimer un village
router.delete('/:id', auth, async (req, res) => {
  try {
    const village = await Village.findByIdAndDelete(req.params.id);

    if (!village) {
      return res.status(404).json({
        error: 'Non trouvé',
        message: 'Village non trouvé'
      });
    }

    res.json({
      message: 'Village supprimé avec succès',
      id: village._id
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'ID invalide',
        message: 'L\'ID du village est invalide'
      });
    }
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
});

// GET /villages/nearby/:lng/:lat - Trouver les villages à proximité
router.get('/nearby/:lng/:lat', optionalAuth, async (req, res) => {
  try {
    const { lng, lat } = req.params;
    const { maxDistance = 10000 } = req.query; // Distance en mètres (défaut: 10km)

    const villages = await Village.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    });

    res.json({
      villages: villages,
      total: villages.length,
      center: { lng: parseFloat(lng), lat: parseFloat(lat) },
      maxDistance: parseInt(maxDistance)
    });
  } catch (error) {
    console.error('Error fetching nearby villages:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    });
  }
});

// ============================================
// VORONOI DIAGRAM ENDPOINTS
// ============================================

/**
 * Helper function to validate coordinates
 * Coordinates must be in [longitude, latitude] format
 * Longitude: -180 to 180, Latitude: -90 to 90
 */
function validateCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) {
    return false;
  }
  const [lng, lat] = coords;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 && lng <= 180 &&
    lat >= -90 && lat <= 90
  );
}

/**
 * Helper function to generate Voronoi diagram from village points
 * 
 * @param {Array} villages - Array of village objects with location.coordinates
 * @param {Object} options - Optional configuration
 * @param {number} options.padding - Padding around bounding box in degrees (default: 0.5)
 * @returns {Object} GeoJSON FeatureCollection of Voronoi polygons
 */
function generateVoronoiDiagram(villages, options = {}) {
  const { padding = 0.5 } = options;

  // Filter villages with valid coordinates
  const validVillages = villages.filter(v => 
    v.location?.coordinates && validateCoordinates(v.location.coordinates)
  );

  if (validVillages.length < 3) {
    throw new Error('Minimum 3 villages with valid coordinates required for Voronoi diagram');
  }

  // Create GeoJSON points from villages
  const points = turf.featureCollection(
    validVillages.map(village => 
      turf.point(village.location.coordinates, {
        villageId: village._id?.toString() || village.id,
        name: village.name,
        status: village.status || 'unreached',
        population: village.population,
        region: village.region,
        country: village.country
      })
    )
  );

  // Calculate bounding box with padding
  const bbox = turf.bbox(points);
  const paddedBbox = [
    bbox[0] - padding, // minX (west)
    bbox[1] - padding, // minY (south)
    bbox[2] + padding, // maxX (east)
    bbox[3] + padding  // maxY (north)
  ];

  // Generate Voronoi polygons
  // turf.voronoi returns a FeatureCollection of polygons
  const voronoiPolygons = turf.voronoi(points, { bbox: paddedBbox });

  // Handle null polygons (can happen at edges)
  // and add village properties to each polygon
  const features = voronoiPolygons.features
    .map((polygon, index) => {
      if (!polygon) return null;
      
      // Get the corresponding village properties from the original point
      const villageProps = points.features[index]?.properties || {};
      
      return {
        ...polygon,
        properties: {
          ...villageProps,
          featureType: 'voronoi',
          index: index
        }
      };
    })
    .filter(f => f !== null);

  return {
    type: 'FeatureCollection',
    features: features,
    metadata: {
      totalVillages: validVillages.length,
      bbox: paddedBbox,
      generatedAt: new Date().toISOString(),
      description: 'Voronoi diagram showing village influence zones. Each polygon represents the area closest to its associated village.'
    }
  };
}

/**
 * GET /villages/voronoi
 * Generate Voronoi diagram from all villages in the database
 * 
 * Query Parameters:
 * - status: Filter villages by status (optional)
 * - padding: Bounding box padding in degrees (default: 0.5)
 * - limit: Maximum number of villages to include (default: 500)
 * 
 * Returns: GeoJSON FeatureCollection of Voronoi polygons
 * 
 * Example Response:
 * {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "geometry": { "type": "Polygon", "coordinates": [...] },
 *       "properties": {
 *         "villageId": "...",
 *         "name": "Village Name",
 *         "status": "unreached",
 *         "population": 5000
 *       }
 *     }
 *   ],
 *   "metadata": {
 *     "totalVillages": 10,
 *     "bbox": [-10, -5, 30, 15],
 *     "generatedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */
router.get('/voronoi', optionalAuth, async (req, res) => {
  try {
    const { status, padding = 0.5, limit = 500 } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    // Only include villages with valid location
    query['location.coordinates'] = { $exists: true };

    // Fetch villages from database
    const villages = await Village.find(query)
      .limit(parseInt(limit))
      .select('name location status population region country');

    if (villages.length < 3) {
      return res.status(400).json({
        error: 'Insufficient data',
        message: 'Minimum 3 villages with valid coordinates required for Voronoi diagram',
        currentCount: villages.length
      });
    }

    // Generate Voronoi diagram
    const voronoiGeoJSON = generateVoronoiDiagram(villages, {
      padding: parseFloat(padding)
    });

    res.json(voronoiGeoJSON);
  } catch (error) {
    console.error('Error generating Voronoi diagram:', error);
    res.status(500).json({
      error: 'Voronoi generation failed',
      message: error.message
    });
  }
});

/**
 * POST /villages/voronoi
 * Generate Voronoi diagram from provided village points
 * Useful for generating Voronoi from custom/filtered data without database query
 * 
 * Request Body:
 * {
 *   "villages": [
 *     { "name": "Village A", "coordinates": [lng, lat], "id": "optional-id", "status": "unreached" },
 *     { "name": "Village B", "coordinates": [lng, lat] },
 *     ...
 *   ],
 *   "padding": 0.5  // Optional, default 0.5 degrees
 * }
 * 
 * Coordinate Format: [longitude, latitude] (GeoJSON standard)
 * - Longitude: -180 to 180 (West to East)
 * - Latitude: -90 to 90 (South to North)
 * 
 * Returns: GeoJSON FeatureCollection of Voronoi polygons
 */
router.post('/voronoi', optionalAuth, async (req, res) => {
  try {
    const { villages, padding = 0.5 } = req.body;

    // Validate input
    if (!villages || !Array.isArray(villages)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request body must contain a "villages" array'
      });
    }

    if (villages.length < 3) {
      return res.status(400).json({
        error: 'Insufficient data',
        message: 'Minimum 3 villages required for Voronoi diagram',
        currentCount: villages.length
      });
    }

    // Transform input to match expected format
    // Accept both { coordinates: [lng, lat] } and { location: { coordinates: [lng, lat] } }
    const normalizedVillages = villages.map((v, index) => {
      const coords = v.coordinates || v.location?.coordinates;
      
      if (!coords || !validateCoordinates(coords)) {
        throw new Error(`Invalid coordinates for village at index ${index}: ${JSON.stringify(coords)}`);
      }

      return {
        _id: v.id || v._id || `custom-${index}`,
        name: v.name || `Village ${index + 1}`,
        location: {
          type: 'Point',
          coordinates: coords
        },
        status: v.status || 'unreached',
        population: v.population,
        region: v.region,
        country: v.country
      };
    });

    // Generate Voronoi diagram
    const voronoiGeoJSON = generateVoronoiDiagram(normalizedVillages, {
      padding: parseFloat(padding)
    });

    res.json(voronoiGeoJSON);
  } catch (error) {
    console.error('Error generating Voronoi from custom points:', error);
    res.status(400).json({
      error: 'Voronoi generation failed',
      message: error.message
    });
  }
});

// ============================================
// DEMOGRAPHICS ENDPOINTS
// ============================================

/**
 * GET /villages/:id/demographics
 * Get demographic information for a specific village
 * Maps village to its parent department and returns population data
 * 
 * Returns:
 * {
 *   villageName: "Village Name",
 *   villageId: "...",
 *   mapped: true/false,
 *   department: "Department Name",
 *   region: "Region Name",
 *   demographics: {
 *     name: "Department Name",
 *     totalPopulation: 123456,
 *     malePopulation: 60000,
 *     femalePopulation: 63456,
 *     ...
 *   },
 *   source: "existing_field|coordinates|region_fallback"
 * }
 */
router.get('/:id/demographics', optionalAuth, async (req, res) => {
  try {
    // Lazy load demographic service to avoid startup issues
    const demographicService = require('../services/demographicService');
    
    const village = await Village.findById(req.params.id);
    
    if (!village) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Village not found'
      });
    }

    const demographics = await demographicService.getVillageDemographics(village);
    
    res.json({
      ...demographics,
      village: {
        _id: village._id,
        name: village.name,
        population: village.population,
        region: village.region,
        departement: village.departement,
        location: village.location
      }
    });
  } catch (error) {
    console.error('Error fetching village demographics:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /villages/demographics/stats
 * Get demographic service statistics
 */
router.get('/demographics/stats', optionalAuth, async (req, res) => {
  try {
    const demographicService = require('../services/demographicService');
    const stats = await demographicService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching demographic stats:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /villages/details/by-name/:name
 * Get detailed village information by name (for polygon clicks)
 * Includes population, people groups, and status breakdown
 */
router.get('/details/by-name/:name', optionalAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const decodedName = decodeURIComponent(name);
    const PeopleGroup = require('../models/PeopleGroup');

    // Status colors mapping
    const STATUS_COLORS = {
      'unreached': '#EF4444',
      'pioneer': '#F59E0B',
      'midway': '#3B82F6',
      'tipping-point': '#F97316',
      'dmm': '#10B981',
      'pas-d-information': '#6B7280'
    };

    const STATUS_DISPLAY_NAMES = {
      'unreached': 'Unreached',
      'pioneer': 'Pioneer',
      'midway': 'Midway',
      'tipping-point': 'Tipping Point',
      'dmm': 'DMM',
      'pas-d-information': "Pas d'information"
    };

    // Get village by name
    const village = await Village.findOne({ name: decodedName });

    // Get people groups in this village (by name match)
    const peopleGroups = await PeopleGroup.find({
      villageName: decodedName,
      approved: true
    }).select('name engagementStatus population numberOfChurches churchGeneration');

    // Calculate status breakdown
    const statusBreakdown = {
      unreached: 0,
      pioneer: 0,
      midway: 0,
      'tipping-point': 0,
      dmm: 0
    };

    let totalPeopleGroupPopulation = 0;
    let totalChurches = 0;

    peopleGroups.forEach(pg => {
      const status = pg.engagementStatus || 'unreached';
      if (statusBreakdown.hasOwnProperty(status)) {
        statusBreakdown[status]++;
      }
      totalPeopleGroupPopulation += pg.population || 0;
      totalChurches += pg.numberOfChurches || 0;
    });

    const totalPeopleGroups = peopleGroups.length;

    // Calculate percentages
    const percentages = {};
    Object.keys(statusBreakdown).forEach(status => {
      percentages[status] = totalPeopleGroups > 0 
        ? Math.round((statusBreakdown[status] / totalPeopleGroups) * 100) 
        : 0;
    });

    // Determine village status based on thresholds
    let villageStatus = 'pas-d-information';
    if (totalPeopleGroups > 0) {
      if (percentages.dmm >= 30) villageStatus = 'dmm';
      else if (percentages['tipping-point'] >= 40) villageStatus = 'tipping-point';
      else if (percentages.midway >= 50) villageStatus = 'midway';
      else if (percentages.pioneer >= 70) villageStatus = 'pioneer';
      else if (percentages.unreached >= 90) villageStatus = 'unreached';
      else villageStatus = 'pioneer';
    }

    res.json({
      success: true,
      data: {
        _id: village?._id || null,
        name: decodedName,
        population: village?.population || 0,
        region: village?.region || null,
        departement: village?.departement || null,
        arrondissement: village?.arrondissement || null,
        country: village?.country || null,
        location: village?.location || null,
        status: villageStatus,
        statusColor: STATUS_COLORS[villageStatus],
        statusDisplay: STATUS_DISPLAY_NAMES[villageStatus],
        totalPeopleGroups,
        totalChurches,
        totalPeopleGroupPopulation,
        statusBreakdown,
        percentages,
        peopleGroups: peopleGroups.map(pg => ({
          _id: pg._id,
          name: pg.name,
          status: pg.engagementStatus,
          population: pg.population,
          churches: pg.numberOfChurches,
          generation: pg.churchGeneration
        })),
        statusColors: STATUS_COLORS,
        statusDisplayNames: STATUS_DISPLAY_NAMES
      }
    });
  } catch (error) {
    console.error('Error fetching village details by name:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch village details',
      message: error.message
    });
  }
});

module.exports = router;