/**
 * Voronoi Service
 * Handles Voronoi diagram generation, caching, and analysis for church planting coverage
 * Uses Turf.js for geospatial operations
 * 
 * Multi-country support: All 54 African countries
 */
const fs = require('fs').promises;
const path = require('path');
const turf = require('@turf/turf');
const { v4: uuidv4 } = require('uuid');
const countriesConfig = require('../config/countries');

// Cache for loaded GeoJSON data and generated Voronoi diagrams
const cache = {
  villagesVoronoi: new Map(), // Map<countryCode, voronoiData>
  customVoronoi: new Map(),   // Map<countryCode, voronoiData>
  countryBoundaries: new Map(), // Map<countryCode, boundaryData>
  generatedDiagrams: new Map(), // Map<id, VoronoiDiagram>
  lastLoaded: {}
};

// Cache TTL in milliseconds (30 minutes)
const CACHE_TTL = 30 * 60 * 1000;

// Base path for GeoJSON files
const DATA_PATH = path.join(__dirname, '../../frontend/public/data');

// Default threshold for coverage gaps (in square kilometers)
const DEFAULT_GAP_THRESHOLD_KM2 = 100;

// Default country code for backward compatibility
const DEFAULT_COUNTRY_CODE = countriesConfig.DEFAULT_COUNTRY_CODE;

/**
 * Check if cache is valid
 * @param {string} key - Cache key
 * @returns {boolean} - Whether cache is valid
 */
function isCacheValid(key) {
  if (!cache[key] || !cache.lastLoaded[key]) return false;
  return (Date.now() - cache.lastLoaded[key]) < CACHE_TTL;
}

/**
 * Load and cache the villages Voronoi GeoJSON file
 * @returns {Promise<Object>} - GeoJSON FeatureCollection
 */
async function loadVillagesVoronoi() {
  if (isCacheValid('villagesVoronoi')) {
    return cache.villagesVoronoi;
  }

  try {
    const filePath = path.join(DATA_PATH, 'villages_voronoi.geojson');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    cache.villagesVoronoi = JSON.parse(fileContent);
    cache.lastLoaded.villagesVoronoi = Date.now();
    console.log(`✅ Loaded villages Voronoi data: ${cache.villagesVoronoi.features?.length || 0} features`);
    return cache.villagesVoronoi;
  } catch (error) {
    console.error('❌ Error loading villages Voronoi data:', error.message);
    throw new Error(`Failed to load villages Voronoi data: ${error.message}`);
  }
}

/**
 * Load and cache the custom Voronoi GeoJSON file
 * @returns {Promise<Object>} - GeoJSON FeatureCollection
 */
async function loadCustomVoronoi() {
  if (isCacheValid('customVoronoi')) {
    return cache.customVoronoi;
  }

  try {
    const filePath = path.join(DATA_PATH, 'voronoi.geojson');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    cache.customVoronoi = JSON.parse(fileContent);
    cache.lastLoaded.customVoronoi = Date.now();
    console.log(`✅ Loaded custom Voronoi data: ${cache.customVoronoi.features?.length || 0} features`);
    return cache.customVoronoi;
  } catch (error) {
    console.error('❌ Error loading custom Voronoi data:', error.message);
    throw new Error(`Failed to load custom Voronoi data: ${error.message}`);
  }
}

/**
 * Load country boundary for clipping
 * @param {string} countryCode - ISO 3166-1 alpha-3 country code (default: CMR)
 * @returns {Promise<Object>} - GeoJSON Feature
 */
async function loadCountryBoundary(countryCode = DEFAULT_COUNTRY_CODE) {
  const code = countryCode.toUpperCase();
  const cacheKey = `countryBoundary_${code}`;
  
  // Check cache
  if (cache.countryBoundaries.has(code) && isCacheValid(cacheKey)) {
    return cache.countryBoundaries.get(code);
  }

  // Validate country code
  if (!countriesConfig.isValidCountryCode(code)) {
    throw new Error(`Invalid country code: ${code}. Use ISO 3166-1 alpha-3 codes.`);
  }

  const country = countriesConfig.getCountryByCode(code);
  
  try {
    // Try to load from merged admin file first (for Cameroon compatibility)
    let filePath;
    let admin123;
    
    if (code === 'CMR') {
      // Backward compatibility: use existing Cameroon file
      filePath = path.join(DATA_PATH, 'Admin123CMR fusionnées.geojson');
    } else {
      // Try country-specific admin file
      filePath = path.join(DATA_PATH, `Admin123${code} fusionnées.geojson`);
    }
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      admin123 = JSON.parse(fileContent);
    } catch (e) {
      // Fall back to GADM level 0 file
      const gadmPath = path.join(DATA_PATH, countriesConfig.getGADMFilePath(code, 0));
      try {
        const gadmContent = await fs.readFile(gadmPath, 'utf-8');
        const gadmData = JSON.parse(gadmContent);
        
        // GADM level 0 is the country boundary
        if (gadmData.features && gadmData.features.length > 0) {
          const boundary = gadmData.features[0];
          cache.countryBoundaries.set(code, boundary);
          cache.lastLoaded[cacheKey] = Date.now();
          console.log(`✅ Loaded ${country.name} boundary from GADM`);
          return boundary;
        }
      } catch (gadmError) {
        // Create boundary from country config bounds
        console.warn(`⚠️ No boundary file found for ${country.name}, using config bounds`);
        const bounds = country.bounds;
        const boundary = turf.bboxPolygon(bounds);
        boundary.properties = {
          COUNTRY: country.name,
          ISO: code,
          generated: true
        };
        cache.countryBoundaries.set(code, boundary);
        cache.lastLoaded[cacheKey] = Date.now();
        return boundary;
      }
    }
    
    // Get all level 1 features (regions) and union them
    const regions = admin123.features.filter(f => 
      f.properties.GID_1 && !f.properties.GID_2 && !f.properties.GID_3
    );

    if (regions.length === 0) {
      throw new Error(`No region boundaries found for ${country.name}`);
    }

    // Union all regions to get country boundary
    let countryBoundary = regions[0];
    for (let i = 1; i < regions.length; i++) {
      try {
        countryBoundary = turf.union(
          turf.featureCollection([countryBoundary, regions[i]])
        );
      } catch (e) {
        console.warn(`Warning: Could not union region ${i} for ${country.name}:`, e.message);
      }
    }

    cache.countryBoundaries.set(code, countryBoundary);
    cache.lastLoaded[cacheKey] = Date.now();
    console.log(`✅ Generated ${country.name} boundary for clipping`);
    return countryBoundary;
  } catch (error) {
    console.error(`❌ Error loading ${country.name} boundary:`, error.message);
    throw error;
  }
}

/**
 * Load Cameroon boundary for clipping (backward compatibility)
 * @deprecated Use loadCountryBoundary('CMR') instead
 * @returns {Promise<Object>} - GeoJSON Feature
 */
async function loadCameroonBoundary() {
  return loadCountryBoundary('CMR');
}

/**
 * Get all available Voronoi diagrams
 * @returns {Promise<Object>} - List of available diagrams
 */
async function getAllDiagrams() {
  const diagrams = [];

  // Add pre-loaded diagrams
  try {
    const villagesVoronoi = await loadVillagesVoronoi();
    diagrams.push({
      id: 'villages-voronoi',
      name: 'Villages Voronoi (OSM)',
      type: 'preloaded',
      source: 'villages_voronoi.geojson',
      featureCount: villagesVoronoi.features?.length || 0,
      description: 'Voronoi diagram generated from OSM village data'
    });
  } catch (e) {
    console.warn('Could not load villages Voronoi:', e.message);
  }

  try {
    const customVoronoi = await loadCustomVoronoi();
    diagrams.push({
      id: 'custom-voronoi',
      name: 'Custom Voronoi',
      type: 'preloaded',
      source: 'voronoi.geojson',
      featureCount: customVoronoi.features?.length || 0,
      description: 'Custom Voronoi diagram with area calculations'
    });
  } catch (e) {
    console.warn('Could not load custom Voronoi:', e.message);
  }

  // Add generated diagrams from cache
  for (const [id, diagram] of cache.generatedDiagrams) {
    diagrams.push({
      id,
      name: diagram.name,
      type: 'generated',
      source: 'memory',
      featureCount: diagram.geojson.features?.length || 0,
      description: diagram.description,
      createdAt: diagram.createdAt,
      pointCount: diagram.pointCount
    });
  }

  return {
    count: diagrams.length,
    diagrams
  };
}

/**
 * Get a specific Voronoi diagram by ID
 * @param {string} id - Diagram ID
 * @param {Object} options - Options for retrieval
 * @returns {Promise<Object>} - Voronoi diagram with details
 */
async function getDiagramById(id, options = {}) {
  const { includeGeometry = true, calculateStats = false } = options;

  let geojson;
  let metadata = {};

  switch (id) {
    case 'villages-voronoi':
      geojson = await loadVillagesVoronoi();
      metadata = {
        id,
        name: 'Villages Voronoi (OSM)',
        type: 'preloaded',
        source: 'villages_voronoi.geojson'
      };
      break;
    case 'custom-voronoi':
      geojson = await loadCustomVoronoi();
      metadata = {
        id,
        name: 'Custom Voronoi',
        type: 'preloaded',
        source: 'voronoi.geojson'
      };
      break;
    default:
      // Check generated diagrams
      if (cache.generatedDiagrams.has(id)) {
        const diagram = cache.generatedDiagrams.get(id);
        geojson = diagram.geojson;
        metadata = {
          id,
          name: diagram.name,
          type: 'generated',
          source: 'memory',
          createdAt: diagram.createdAt,
          pointCount: diagram.pointCount
        };
      } else {
        throw new Error(`Voronoi diagram not found: ${id}`);
      }
  }

  const result = {
    ...metadata,
    featureCount: geojson.features?.length || 0
  };

  if (calculateStats) {
    result.statistics = calculateVoronoiStatistics(geojson);
  }

  if (includeGeometry) {
    result.geojson = geojson;
  }

  return result;
}

/**
 * Generate Voronoi diagram from custom points
 * @param {Array} points - Array of point objects with coordinates
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} - Generated Voronoi diagram
 */
async function generateVoronoi(points, options = {}) {
  const {
    name = 'Generated Voronoi',
    description = 'Voronoi diagram generated from custom points',
    clipToCountry = true,
    clipToCameroon = null, // Deprecated, use clipToCountry
    countryCode = DEFAULT_COUNTRY_CODE,
    calculateAreas = true,
    bounds = null,
    saveToCache = true
  } = options;

  // Handle backward compatibility
  const shouldClip = clipToCameroon !== null ? clipToCameroon : clipToCountry;
  const targetCountryCode = countryCode.toUpperCase();

  // Validate country code
  if (shouldClip && !countriesConfig.isValidCountryCode(targetCountryCode)) {
    throw new Error(`Invalid country code: ${targetCountryCode}. Use ISO 3166-1 alpha-3 codes.`);
  }

  const country = countriesConfig.getCountryByCode(targetCountryCode);

  if (!points || !Array.isArray(points) || points.length < 3) {
    throw new Error('At least 3 points are required to generate a Voronoi diagram');
  }

  // Validate and extract coordinates
  const validPoints = [];
  const pointData = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    let coords;

    if (Array.isArray(point)) {
      coords = point;
    } else if (point.coordinates) {
      coords = point.coordinates;
    } else if (point.lng !== undefined && point.lat !== undefined) {
      coords = [point.lng, point.lat];
    } else if (point.longitude !== undefined && point.latitude !== undefined) {
      coords = [point.longitude, point.latitude];
    } else {
      throw new Error(`Invalid point format at index ${i}`);
    }

    if (!Array.isArray(coords) || coords.length < 2 ||
        typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
      throw new Error(`Invalid coordinates at index ${i}`);
    }

    validPoints.push(coords);
    pointData.push({
      index: i,
      name: point.name || `Point ${i + 1}`,
      id: point.id || point._id || `point-${i}`,
      type: point.type || 'church',
      ...point
    });
  }

  // Create point feature collection
  const pointFeatures = turf.featureCollection(
    validPoints.map((coords, i) => turf.point(coords, pointData[i]))
  );

  // Calculate bounds if not provided - use country bounds if clipping
  let voronoiBounds = bounds;
  if (!voronoiBounds) {
    if (shouldClip && country) {
      // Use country bounds with padding
      const countryBounds = country.bounds;
      const padding = 0.1; // degrees
      voronoiBounds = [
        countryBounds[0] - padding,
        countryBounds[1] - padding,
        countryBounds[2] + padding,
        countryBounds[3] + padding
      ];
    } else {
      const bbox = turf.bbox(pointFeatures);
      const padding = 0.5; // degrees
      voronoiBounds = [
        bbox[0] - padding,
        bbox[1] - padding,
        bbox[2] + padding,
        bbox[3] + padding
      ];
    }
  }

  // Generate Voronoi using Turf.js
  const voronoiPolygons = turf.voronoi(pointFeatures, { bbox: voronoiBounds });

  if (!voronoiPolygons || !voronoiPolygons.features) {
    throw new Error('Failed to generate Voronoi diagram');
  }

  // Load country boundary if clipping
  let countryBoundary = null;
  if (shouldClip) {
    try {
      countryBoundary = await loadCountryBoundary(targetCountryCode);
    } catch (e) {
      console.warn(`Could not load ${country?.name || targetCountryCode} boundary:`, e.message);
    }
  }

  // Process each Voronoi cell
  const features = [];
  for (let i = 0; i < voronoiPolygons.features.length; i++) {
    let cell = voronoiPolygons.features[i];
    
    if (!cell || !cell.geometry) continue;

    // Clip to country boundaries if requested
    if (shouldClip && countryBoundary) {
      try {
        const clipped = turf.intersect(
          turf.featureCollection([cell, countryBoundary])
        );
        if (clipped) {
          cell = clipped;
        }
      } catch (e) {
        console.warn(`Could not clip cell ${i} to ${country?.name || targetCountryCode}:`, e.message);
      }
    }

    // Calculate area if requested
    let areaKm2 = null;
    if (calculateAreas) {
      try {
        areaKm2 = turf.area(cell) / 1000000; // Convert m² to km²
      } catch (e) {
        console.warn(`Could not calculate area for cell ${i}:`, e.message);
      }
    }

    // Calculate centroid
    let centroid = null;
    try {
      centroid = turf.centroid(cell).geometry.coordinates;
    } catch (e) {
      centroid = validPoints[i];
    }

    features.push({
      type: 'Feature',
      properties: {
        ...pointData[i],
        voronoiIndex: i,
        areaKm2,
        centroid,
        seedPoint: validPoints[i],
        countryCode: targetCountryCode
      },
      geometry: cell.geometry
    });
  }

  const geojson = {
    type: 'FeatureCollection',
    features,
    metadata: {
      generatedAt: new Date().toISOString(),
      pointCount: points.length,
      cellCount: features.length,
      bounds: voronoiBounds,
      countryCode: targetCountryCode,
      countryName: country?.name || null,
      clippedToCountry: shouldClip,
      countryAreaKm2: country?.area || null
    }
  };

  // Save to cache if requested
  let diagramId = null;
  if (saveToCache) {
    diagramId = uuidv4();
    cache.generatedDiagrams.set(diagramId, {
      id: diagramId,
      name,
      description,
      geojson,
      pointCount: points.length,
      countryCode: targetCountryCode,
      createdAt: new Date().toISOString()
    });
  }

  return {
    id: diagramId,
    name,
    description,
    featureCount: features.length,
    pointCount: points.length,
    bounds: voronoiBounds,
    countryCode: targetCountryCode,
    countryName: country?.name || null,
    geojson
  };
}

/**
 * Calculate statistics for a Voronoi diagram
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Object} - Statistics object
 */
function calculateVoronoiStatistics(geojson) {
  if (!geojson || !geojson.features || geojson.features.length === 0) {
    return {
      totalCells: 0,
      totalAreaKm2: 0,
      averageCellAreaKm2: 0,
      minCellAreaKm2: 0,
      maxCellAreaKm2: 0,
      medianCellAreaKm2: 0
    };
  }

  const areas = [];
  let totalArea = 0;

  for (const feature of geojson.features) {
    let area = feature.properties?.areaKm2;
    
    if (area === null || area === undefined) {
      try {
        area = turf.area(feature) / 1000000;
      } catch (e) {
        continue;
      }
    }

    areas.push(area);
    totalArea += area;
  }

  areas.sort((a, b) => a - b);

  const medianIndex = Math.floor(areas.length / 2);
  const medianArea = areas.length % 2 === 0
    ? (areas[medianIndex - 1] + areas[medianIndex]) / 2
    : areas[medianIndex];

  return {
    totalCells: geojson.features.length,
    totalAreaKm2: Math.round(totalArea * 100) / 100,
    averageCellAreaKm2: Math.round((totalArea / areas.length) * 100) / 100,
    minCellAreaKm2: Math.round(areas[0] * 100) / 100,
    maxCellAreaKm2: Math.round(areas[areas.length - 1] * 100) / 100,
    medianCellAreaKm2: Math.round(medianArea * 100) / 100
  };
}

/**
 * Get coverage statistics by region/department
 * @param {string} diagramId - Voronoi diagram ID
 * @param {Object} options - Options for statistics
 * @returns {Promise<Object>} - Coverage statistics
 */
async function getStatistics(diagramId, options = {}) {
  const { groupBy = null, countryCode = null } = options;

  const diagram = await getDiagramById(diagramId, { includeGeometry: true });
  const geojson = diagram.geojson;

  const stats = calculateVoronoiStatistics(geojson);

  // Determine country for coverage calculation
  const targetCountryCode = countryCode || 
    geojson.metadata?.countryCode || 
    diagram.countryCode || 
    DEFAULT_COUNTRY_CODE;
  
  const country = countriesConfig.getCountryByCode(targetCountryCode);
  const countryAreaKm2 = country?.area || 475442; // Default to Cameroon for backward compatibility
  
  stats.countryCode = targetCountryCode;
  stats.countryName = country?.name || 'Unknown';
  stats.countryAreaKm2 = countryAreaKm2;
  stats.coveragePercentage = Math.round((stats.totalAreaKm2 / countryAreaKm2) * 10000) / 100;

  // Group by region/department if requested
  if (groupBy) {
    const adminService = require('./administrativeService');
    const grouped = {};

    for (const feature of geojson.features) {
      const centroid = feature.properties?.centroid || 
        turf.centroid(feature).geometry.coordinates;
      
      try {
        const hierarchy = await adminService.getHierarchyForPoint(centroid[0], centroid[1]);
        const groupKey = groupBy === 'region' 
          ? hierarchy.region?.name 
          : hierarchy.department?.name;
        
        if (groupKey) {
          if (!grouped[groupKey]) {
            grouped[groupKey] = {
              name: groupKey,
              cellCount: 0,
              totalAreaKm2: 0,
              cells: []
            };
          }
          
          const area = feature.properties?.areaKm2 || turf.area(feature) / 1000000;
          grouped[groupKey].cellCount++;
          grouped[groupKey].totalAreaKm2 += area;
          grouped[groupKey].cells.push({
            index: feature.properties?.voronoiIndex,
            name: feature.properties?.name,
            areaKm2: area
          });
        }
      } catch (e) {
        // Point outside Cameroon or error
      }
    }

    stats.groupedBy = groupBy;
    stats.groups = Object.values(grouped).map(g => ({
      ...g,
      totalAreaKm2: Math.round(g.totalAreaKm2 * 100) / 100,
      averageAreaKm2: Math.round((g.totalAreaKm2 / g.cellCount) * 100) / 100
    }));
  }

  return {
    diagramId,
    diagramName: diagram.name,
    ...stats
  };
}

/**
 * Identify coverage gaps (large Voronoi cells)
 * @param {string} diagramId - Voronoi diagram ID
 * @param {Object} options - Options for gap detection
 * @returns {Promise<Object>} - Coverage gaps
 */
async function getCoverageGaps(diagramId, options = {}) {
  const { 
    thresholdKm2 = DEFAULT_GAP_THRESHOLD_KM2,
    includeGeometry = true,
    limit = 50
  } = options;

  const diagram = await getDiagramById(diagramId, { includeGeometry: true });
  const geojson = diagram.geojson;

  const gaps = [];

  for (const feature of geojson.features) {
    let area = feature.properties?.areaKm2;
    
    if (area === null || area === undefined) {
      try {
        area = turf.area(feature) / 1000000;
      } catch (e) {
        continue;
      }
    }

    if (area >= thresholdKm2) {
      const centroid = feature.properties?.centroid || 
        turf.centroid(feature).geometry.coordinates;

      const gap = {
        index: feature.properties?.voronoiIndex,
        name: feature.properties?.name,
        areaKm2: Math.round(area * 100) / 100,
        centroid,
        seedPoint: feature.properties?.seedPoint,
        gapSeverity: area >= thresholdKm2 * 2 ? 'high' : 'medium'
      };

      // Get administrative location
      try {
        const adminService = require('./administrativeService');
        const hierarchy = await adminService.getHierarchyForPoint(centroid[0], centroid[1]);
        gap.region = hierarchy.region?.name;
        gap.department = hierarchy.department?.name;
        gap.subdivision = hierarchy.subdivision?.name;
      } catch (e) {
        // Ignore
      }

      if (includeGeometry) {
        gap.geometry = feature.geometry;
      }

      gaps.push(gap);
    }
  }

  // Sort by area (largest first) and limit
  gaps.sort((a, b) => b.areaKm2 - a.areaKm2);
  const limitedGaps = gaps.slice(0, limit);

  return {
    diagramId,
    diagramName: diagram.name,
    thresholdKm2,
    totalGaps: gaps.length,
    returnedGaps: limitedGaps.length,
    totalGapAreaKm2: Math.round(gaps.reduce((sum, g) => sum + g.areaKm2, 0) * 100) / 100,
    gaps: limitedGaps,
    recommendations: generateGapRecommendations(limitedGaps)
  };
}

/**
 * Generate recommendations based on coverage gaps
 * @param {Array} gaps - Array of gap objects
 * @returns {Array} - Recommendations
 */
function generateGapRecommendations(gaps) {
  const recommendations = [];

  if (gaps.length === 0) {
    recommendations.push({
      type: 'info',
      message: 'No significant coverage gaps detected. Church planting coverage appears adequate.'
    });
    return recommendations;
  }

  // Group by region
  const byRegion = {};
  for (const gap of gaps) {
    const region = gap.region || 'Unknown';
    if (!byRegion[region]) {
      byRegion[region] = [];
    }
    byRegion[region].push(gap);
  }

  // Generate recommendations
  for (const [region, regionGaps] of Object.entries(byRegion)) {
    const highSeverity = regionGaps.filter(g => g.gapSeverity === 'high');
    
    if (highSeverity.length > 0) {
      recommendations.push({
        type: 'priority',
        region,
        message: `${highSeverity.length} high-priority areas in ${region} need church planting attention`,
        suggestedLocations: highSeverity.slice(0, 3).map(g => ({
          coordinates: g.centroid,
          areaKm2: g.areaKm2,
          department: g.department
        }))
      });
    }
  }

  // Overall recommendation
  const totalGapArea = gaps.reduce((sum, g) => sum + g.areaKm2, 0);
  recommendations.push({
    type: 'summary',
    message: `Total uncovered area: ${Math.round(totalGapArea)} km². Consider planting ${Math.ceil(gaps.length / 2)} new churches to improve coverage.`
  });

  return recommendations;
}

/**
 * Filter Voronoi cells by administrative boundary
 * @param {string} diagramId - Voronoi diagram ID
 * @param {Object} boundary - Boundary filter options
 * @returns {Promise<Object>} - Filtered Voronoi diagram
 */
async function filterByBoundary(diagramId, boundary) {
  const { region, department, subdivision } = boundary;

  if (!region && !department && !subdivision) {
    throw new Error('At least one boundary filter (region, department, or subdivision) is required');
  }

  const diagram = await getDiagramById(diagramId, { includeGeometry: true });
  const geojson = diagram.geojson;

  // Get the boundary polygon
  const adminService = require('./administrativeService');
  let boundaryPolygon;
  let boundaryName;

  if (subdivision) {
    const subdivisions = await adminService.getSubdivisions(department);
    const found = subdivisions.geojson.features.find(f => 
      f.properties.NAME_3?.toLowerCase() === subdivision.toLowerCase()
    );
    if (!found) throw new Error(`Subdivision not found: ${subdivision}`);
    boundaryPolygon = found;
    boundaryName = subdivision;
  } else if (department) {
    const departments = await adminService.getDepartments(region);
    const found = departments.geojson.features.find(f => 
      f.properties.NAME_2?.toLowerCase() === department.toLowerCase()
    );
    if (!found) throw new Error(`Department not found: ${department}`);
    boundaryPolygon = found;
    boundaryName = department;
  } else if (region) {
    const regions = await adminService.getRegions();
    const found = regions.geojson.features.find(f => 
      f.properties.NAME_1?.toLowerCase() === region.toLowerCase()
    );
    if (!found) throw new Error(`Region not found: ${region}`);
    boundaryPolygon = found;
    boundaryName = region;
  }

  // Filter cells that intersect with the boundary
  const filteredFeatures = [];

  for (const feature of geojson.features) {
    try {
      // Check if cell intersects with boundary
      if (turf.booleanIntersects(feature, boundaryPolygon)) {
        // Clip to boundary
        const clipped = turf.intersect(
          turf.featureCollection([feature, boundaryPolygon])
        );
        
        if (clipped) {
          // Recalculate area for clipped cell
          const newArea = turf.area(clipped) / 1000000;
          
          filteredFeatures.push({
            ...clipped,
            properties: {
              ...feature.properties,
              originalAreaKm2: feature.properties?.areaKm2,
              areaKm2: Math.round(newArea * 100) / 100,
              clippedTo: boundaryName
            }
          });
        }
      }
    } catch (e) {
      // Skip invalid geometries
    }
  }

  const filteredGeojson = {
    type: 'FeatureCollection',
    features: filteredFeatures,
    metadata: {
      ...geojson.metadata,
      filteredBy: boundary,
      boundaryName,
      originalCellCount: geojson.features.length,
      filteredCellCount: filteredFeatures.length
    }
  };

  return {
    diagramId,
    diagramName: diagram.name,
    filter: boundary,
    boundaryName,
    originalCellCount: geojson.features.length,
    filteredCellCount: filteredFeatures.length,
    statistics: calculateVoronoiStatistics(filteredGeojson),
    geojson: filteredGeojson
  };
}

/**
 * Delete a generated Voronoi diagram from cache
 * @param {string} id - Diagram ID
 * @returns {boolean} - Whether deletion was successful
 */
function deleteDiagram(id) {
  if (id === 'villages-voronoi' || id === 'custom-voronoi') {
    throw new Error('Cannot delete preloaded Voronoi diagrams');
  }

  if (!cache.generatedDiagrams.has(id)) {
    throw new Error(`Voronoi diagram not found: ${id}`);
  }

  cache.generatedDiagrams.delete(id);
  return true;
}

/**
 * Clear all cached data
 * @param {string} countryCode - Optional: clear only specific country cache
 */
function clearCache(countryCode = null) {
  if (countryCode) {
    const code = countryCode.toUpperCase();
    cache.villagesVoronoi.delete(code);
    cache.customVoronoi.delete(code);
    cache.countryBoundaries.delete(code);
    delete cache.lastLoaded[`villagesVoronoi_${code}`];
    delete cache.lastLoaded[`customVoronoi_${code}`];
    delete cache.lastLoaded[`countryBoundary_${code}`];
    console.log(`✅ Voronoi cache cleared for ${code}`);
  } else {
    cache.villagesVoronoi.clear();
    cache.customVoronoi.clear();
    cache.countryBoundaries.clear();
    cache.generatedDiagrams.clear();
    cache.lastLoaded = {};
    console.log('✅ All Voronoi cache cleared');
  }
}

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
function getCacheStats() {
  const villagesVoronoiStats = {};
  for (const [code, data] of cache.villagesVoronoi) {
    villagesVoronoiStats[code] = {
      loaded: true,
      featureCount: data?.features?.length || 0,
      lastLoaded: cache.lastLoaded[`villagesVoronoi_${code}`] 
        ? new Date(cache.lastLoaded[`villagesVoronoi_${code}`]).toISOString() 
        : null
    };
  }

  const customVoronoiStats = {};
  for (const [code, data] of cache.customVoronoi) {
    customVoronoiStats[code] = {
      loaded: true,
      featureCount: data?.features?.length || 0,
      lastLoaded: cache.lastLoaded[`customVoronoi_${code}`] 
        ? new Date(cache.lastLoaded[`customVoronoi_${code}`]).toISOString() 
        : null
    };
  }

  const countryBoundaryStats = {};
  for (const [code, data] of cache.countryBoundaries) {
    countryBoundaryStats[code] = {
      loaded: true,
      lastLoaded: cache.lastLoaded[`countryBoundary_${code}`] 
        ? new Date(cache.lastLoaded[`countryBoundary_${code}`]).toISOString() 
        : null
    };
  }

  return {
    villagesVoronoi: villagesVoronoiStats,
    customVoronoi: customVoronoiStats,
    countryBoundaries: countryBoundaryStats,
    generatedDiagrams: {
      count: cache.generatedDiagrams.size,
      ids: Array.from(cache.generatedDiagrams.keys())
    },
    cacheTTL: CACHE_TTL,
    supportedCountries: countriesConfig.TOTAL_COUNTRIES
  };
}

/**
 * Get list of supported countries
 * @returns {Array} - List of supported countries
 */
function getSupportedCountries() {
  return countriesConfig.getCountryList();
}

/**
 * Get country configuration
 * @param {string} countryCode - ISO country code
 * @returns {Object|null} - Country configuration
 */
function getCountryConfig(countryCode) {
  return countriesConfig.getCountryByCode(countryCode);
}

module.exports = {
  // Data loading
  loadVillagesVoronoi,
  loadCustomVoronoi,
  loadCountryBoundary,
  loadCameroonBoundary, // Deprecated, for backward compatibility
  
  // CRUD operations
  getAllDiagrams,
  getDiagramById,
  generateVoronoi,
  deleteDiagram,
  
  // Analysis
  calculateVoronoiStatistics,
  getStatistics,
  getCoverageGaps,
  filterByBoundary,
  
  // Cache management
  clearCache,
  getCacheStats,
  
  // Country support
  getSupportedCountries,
  getCountryConfig,
  
  // Constants
  DEFAULT_GAP_THRESHOLD_KM2,
  DEFAULT_COUNTRY_CODE
};
