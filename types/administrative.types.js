/**
 * Administrative Types
 * TypeScript-style JSDoc type definitions for administrative data
 * 
 * These types document the structure of data used in the administrative API.
 * While this is a JavaScript project, these definitions provide documentation
 * and can be used with JSDoc for type checking in IDEs.
 */

/**
 * @typedef {Object} AdminLevel
 * @property {string} name - French name of the administrative level
 * @property {string} nameEn - English name of the administrative level
 * @property {string} field - Property field name in GeoJSON
 * @property {string} gidField - GID field name in GeoJSON
 */

/**
 * @typedef {Object} Region
 * @property {string} id - Unique identifier (GID_1)
 * @property {string} name - Region name (NAME_1)
 * @property {string} [varName] - Variant names (VARNAME_1)
 * @property {string} type - Type in French (TYPE_1)
 * @property {string} typeEn - Type in English (ENGTYPE_1)
 * @property {string} hasc - HASC code (HASC_1)
 * @property {string} iso - ISO code (ISO_1)
 * @property {string} country - Country name
 */

/**
 * @typedef {Object} Department
 * @property {string} id - Unique identifier (GID_2)
 * @property {string} name - Department name (NAME_2)
 * @property {string} [varName] - Variant names (VARNAME_2)
 * @property {string} type - Type in French (TYPE_2)
 * @property {string} typeEn - Type in English (ENGTYPE_2)
 * @property {string} hasc - HASC code (HASC_2)
 * @property {string} region - Parent region name
 * @property {string} regionId - Parent region ID
 */

/**
 * @typedef {Object} Subdivision
 * @property {string} id - Unique identifier (GID_3)
 * @property {string} name - Subdivision name (NAME_3)
 * @property {string} [varName] - Variant names (VARNAME_3)
 * @property {string} type - Type in French (TYPE_3)
 * @property {string} typeEn - Type in English (ENGTYPE_3)
 * @property {string} hasc - HASC code (HASC_3)
 * @property {string} department - Parent department name
 * @property {string} departmentId - Parent department ID
 * @property {string} region - Parent region name
 * @property {string} regionId - Parent region ID
 */

/**
 * @typedef {Object} Village
 * @property {string} id - Unique identifier (osm_id)
 * @property {string} name - Village name
 * @property {string} [place] - Place type
 * @property {number[]} coordinates - [longitude, latitude]
 * @property {string} geometryType - 'Point' or 'Polygon'
 */

/**
 * @typedef {Object} GeoJSONFeature
 * @property {string} type - Always 'Feature'
 * @property {Object} properties - Feature properties
 * @property {Object} geometry - GeoJSON geometry
 * @property {string} geometry.type - Geometry type (Point, Polygon, MultiPolygon)
 * @property {Array} geometry.coordinates - Coordinate array
 */

/**
 * @typedef {Object} GeoJSONFeatureCollection
 * @property {string} type - Always 'FeatureCollection'
 * @property {string} [name] - Collection name
 * @property {Object} [crs] - Coordinate reference system
 * @property {GeoJSONFeature[]} features - Array of features
 */

/**
 * @typedef {Object} RegionsResponse
 * @property {boolean} success - Request success status
 * @property {number} level - Administrative level (1)
 * @property {string} levelName - French level name
 * @property {string} levelNameEn - English level name
 * @property {number} count - Number of regions
 * @property {Region[]} regions - Array of regions
 * @property {GeoJSONFeatureCollection} [geojson] - GeoJSON data (if requested)
 */

/**
 * @typedef {Object} DepartmentsResponse
 * @property {boolean} success - Request success status
 * @property {number} level - Administrative level (2)
 * @property {string} levelName - French level name
 * @property {string} levelNameEn - English level name
 * @property {Object} [filter] - Applied filter
 * @property {string} [filter.region] - Region filter
 * @property {number} count - Number of departments
 * @property {Department[]} departments - Array of departments
 * @property {GeoJSONFeatureCollection} [geojson] - GeoJSON data (if requested)
 */

/**
 * @typedef {Object} SubdivisionsResponse
 * @property {boolean} success - Request success status
 * @property {number} level - Administrative level (3)
 * @property {string} levelName - French level name
 * @property {string} levelNameEn - English level name
 * @property {Object} [filter] - Applied filter
 * @property {string} [filter.department] - Department filter
 * @property {number} count - Number of subdivisions
 * @property {Subdivision[]} subdivisions - Array of subdivisions
 * @property {GeoJSONFeatureCollection} [geojson] - GeoJSON data (if requested)
 */

/**
 * @typedef {Object} VillagesResponse
 * @property {boolean} success - Request success status
 * @property {number} level - Administrative level (4)
 * @property {string} levelName - French level name
 * @property {string} levelNameEn - English level name
 * @property {Object} [filter] - Applied filter
 * @property {string} [filter.subdivision] - Subdivision filter
 * @property {string} dataType - 'points' or 'polygons'
 * @property {number} count - Number of villages
 * @property {Village[]} villages - Array of villages
 * @property {GeoJSONFeatureCollection} [geojson] - GeoJSON data (if requested)
 */

/**
 * @typedef {Object} BoundariesResponse
 * @property {boolean} success - Request success status
 * @property {string} country - Country name
 * @property {string} countryCode - ISO country code
 * @property {Object} levels - Level information
 * @property {Object} levels.1 - Level 1 info
 * @property {Object} levels.2 - Level 2 info
 * @property {Object} levels.3 - Level 3 info
 * @property {GeoJSONFeatureCollection} [geojson] - GeoJSON data (if requested)
 */

/**
 * @typedef {Object} HierarchyResponse
 * @property {boolean} success - Request success status
 * @property {Object} coordinates - Query coordinates
 * @property {number} coordinates.lng - Longitude
 * @property {number} coordinates.lat - Latitude
 * @property {Object} [region] - Region containing the point
 * @property {string} region.id - Region ID
 * @property {string} region.name - Region name
 * @property {Object} [department] - Department containing the point
 * @property {string} department.id - Department ID
 * @property {string} department.name - Department name
 * @property {Object} [subdivision] - Subdivision containing the point
 * @property {string} subdivision.id - Subdivision ID
 * @property {string} subdivision.name - Subdivision name
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} id - Unit ID
 * @property {string} name - Unit name
 * @property {number} level - Administrative level
 * @property {string} levelName - Level name
 * @property {string} [region] - Parent region (for levels 2-4)
 * @property {string} [department] - Parent department (for levels 3-4)
 * @property {string} [subdivision] - Parent subdivision (for level 4)
 */

/**
 * @typedef {Object} SearchResponse
 * @property {boolean} success - Request success status
 * @property {string} query - Search query
 * @property {number} [level] - Level filter (if applied)
 * @property {number} count - Number of results returned
 * @property {number} totalMatches - Total matching results
 * @property {SearchResult[]} results - Search results
 */

/**
 * @typedef {Object} CacheStats
 * @property {Object} admin123 - Admin123 cache info
 * @property {boolean} admin123.loaded - Whether data is loaded
 * @property {number} admin123.featureCount - Number of features
 * @property {string} [admin123.lastLoaded] - Last load timestamp
 * @property {Object} villages - Villages cache info
 * @property {Object} villagesDecoupes - Villages découpés cache info
 * @property {Object} cameroonBoundary - Cameroon boundary cache info
 * @property {number} cacheTTL - Cache TTL in milliseconds
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Always false
 * @property {string} error - Error type
 * @property {string} message - Error message
 */

/**
 * Administrative level constants
 * @type {Object.<number, AdminLevel>}
 */
const ADMIN_LEVELS = {
  1: { name: 'Régions', nameEn: 'Regions', field: 'NAME_1', gidField: 'GID_1' },
  2: { name: 'Départements', nameEn: 'Departments', field: 'NAME_2', gidField: 'GID_2' },
  3: { name: 'Arrondissements', nameEn: 'Subdivisions', field: 'NAME_3', gidField: 'GID_3' },
  4: { name: 'Villages', nameEn: 'Villages', field: 'name', gidField: 'osm_id' }
};

/**
 * Cameroon geographic bounds
 * @type {Object}
 */
const CAMEROON_BOUNDS = {
  minLng: 8.4,
  maxLng: 16.2,
  minLat: 1.6,
  maxLat: 13.1
};

module.exports = {
  ADMIN_LEVELS,
  CAMEROON_BOUNDS
};
