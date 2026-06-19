/**
 * Voronoi Types
 * TypeScript-style type definitions for Voronoi diagram operations
 * These serve as documentation and can be used with JSDoc for type checking
 */

/**
 * @typedef {Object} VoronoiPoint
 * @property {number[]} coordinates - [longitude, latitude] coordinates
 * @property {string} [name] - Point name (e.g., church or village name)
 * @property {string} [id] - Unique identifier
 * @property {string} [type] - Point type ('church', 'village', 'custom')
 * @property {number} [population] - Population count
 * @property {string} [status] - Status ('reached', 'unreached', 'engaged')
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} VoronoiCell
 * @property {string} type - Always 'Feature'
 * @property {Object} geometry - GeoJSON Polygon geometry
 * @property {VoronoiCellProperties} properties - Cell properties
 */

/**
 * @typedef {Object} VoronoiCellProperties
 * @property {number} voronoiIndex - Index of the cell in the diagram
 * @property {string} [name] - Name of the seed point
 * @property {string} [id] - ID of the seed point
 * @property {string} [type] - Type of the seed point
 * @property {number} [areaKm2] - Area of the cell in square kilometers
 * @property {number[]} centroid - [longitude, latitude] of cell centroid
 * @property {number[]} seedPoint - [longitude, latitude] of the seed point
 * @property {string} [region] - Administrative region name
 * @property {string} [department] - Administrative department name
 * @property {string} [subdivision] - Administrative subdivision name
 */

/**
 * @typedef {Object} VoronoiDiagram
 * @property {string} id - Unique diagram identifier
 * @property {string} name - Diagram name
 * @property {string} [description] - Diagram description
 * @property {'preloaded' | 'generated'} type - Diagram type
 * @property {string} source - Data source ('villages_voronoi.geojson', 'voronoi.geojson', 'memory')
 * @property {number} featureCount - Number of Voronoi cells
 * @property {number} [pointCount] - Number of seed points
 * @property {string} [createdAt] - ISO timestamp of creation
 * @property {VoronoiGeoJSON} [geojson] - GeoJSON FeatureCollection
 */

/**
 * @typedef {Object} VoronoiGeoJSON
 * @property {'FeatureCollection'} type - Always 'FeatureCollection'
 * @property {VoronoiCell[]} features - Array of Voronoi cells
 * @property {VoronoiMetadata} [metadata] - Diagram metadata
 */

/**
 * @typedef {Object} VoronoiMetadata
 * @property {string} generatedAt - ISO timestamp
 * @property {number} pointCount - Number of seed points
 * @property {number} cellCount - Number of cells
 * @property {number[]} bounds - [minLng, minLat, maxLng, maxLat]
 * @property {boolean} clippedToCameroon - Whether cells are clipped to Cameroon
 */

/**
 * @typedef {Object} VoronoiStatistics
 * @property {number} totalCells - Total number of Voronoi cells
 * @property {number} totalAreaKm2 - Total area in square kilometers
 * @property {number} averageCellAreaKm2 - Average cell area
 * @property {number} minCellAreaKm2 - Minimum cell area
 * @property {number} maxCellAreaKm2 - Maximum cell area
 * @property {number} medianCellAreaKm2 - Median cell area
 * @property {number} [coveragePercentage] - Coverage as percentage of Cameroon
 * @property {string} [groupedBy] - Grouping field ('region' or 'department')
 * @property {VoronoiGroupStats[]} [groups] - Statistics grouped by admin level
 */

/**
 * @typedef {Object} VoronoiGroupStats
 * @property {string} name - Group name (region or department)
 * @property {number} cellCount - Number of cells in group
 * @property {number} totalAreaKm2 - Total area in group
 * @property {number} averageAreaKm2 - Average cell area in group
 * @property {VoronoiCellSummary[]} cells - Summary of cells in group
 */

/**
 * @typedef {Object} VoronoiCellSummary
 * @property {number} index - Cell index
 * @property {string} [name] - Cell name
 * @property {number} areaKm2 - Cell area
 */

/**
 * @typedef {Object} CoverageGap
 * @property {number} index - Voronoi cell index
 * @property {string} [name] - Seed point name
 * @property {number} areaKm2 - Gap area in square kilometers
 * @property {number[]} centroid - [longitude, latitude] of gap centroid
 * @property {number[]} [seedPoint] - [longitude, latitude] of seed point
 * @property {'high' | 'medium'} gapSeverity - Severity level
 * @property {string} [region] - Administrative region
 * @property {string} [department] - Administrative department
 * @property {string} [subdivision] - Administrative subdivision
 * @property {Object} [geometry] - GeoJSON geometry (if includeGeometry=true)
 */

/**
 * @typedef {Object} CoverageGapsResult
 * @property {string} diagramId - Source diagram ID
 * @property {string} diagramName - Source diagram name
 * @property {number} thresholdKm2 - Gap threshold used
 * @property {number} totalGaps - Total number of gaps found
 * @property {number} returnedGaps - Number of gaps returned (limited)
 * @property {number} totalGapAreaKm2 - Total area of all gaps
 * @property {CoverageGap[]} gaps - Array of coverage gaps
 * @property {GapRecommendation[]} recommendations - Recommendations for addressing gaps
 */

/**
 * @typedef {Object} GapRecommendation
 * @property {'info' | 'priority' | 'summary'} type - Recommendation type
 * @property {string} [region] - Relevant region
 * @property {string} message - Recommendation message
 * @property {SuggestedLocation[]} [suggestedLocations] - Suggested church planting locations
 */

/**
 * @typedef {Object} SuggestedLocation
 * @property {number[]} coordinates - [longitude, latitude]
 * @property {number} areaKm2 - Area of the gap
 * @property {string} [department] - Department name
 */

/**
 * @typedef {Object} BoundaryFilter
 * @property {string} [region] - Region name to filter by
 * @property {string} [department] - Department name to filter by
 * @property {string} [subdivision] - Subdivision name to filter by
 */

/**
 * @typedef {Object} FilteredVoronoiResult
 * @property {string} diagramId - Source diagram ID
 * @property {string} diagramName - Source diagram name
 * @property {BoundaryFilter} filter - Applied filter
 * @property {string} boundaryName - Name of the boundary used
 * @property {number} originalCellCount - Original number of cells
 * @property {number} filteredCellCount - Number of cells after filtering
 * @property {VoronoiStatistics} statistics - Statistics for filtered cells
 * @property {VoronoiGeoJSON} geojson - Filtered GeoJSON
 */

/**
 * @typedef {Object} GenerateVoronoiOptions
 * @property {string} [name] - Name for the generated diagram
 * @property {string} [description] - Description
 * @property {boolean} [clipToCameroon=true] - Clip cells to Cameroon boundary
 * @property {boolean} [calculateAreas=true] - Calculate area for each cell
 * @property {number[]} [bounds] - Custom bounds [minLng, minLat, maxLng, maxLat]
 * @property {boolean} [saveToCache=true] - Save to cache for later retrieval
 */

/**
 * @typedef {Object} VoronoiCacheStats
 * @property {CacheEntry} villagesVoronoi - Villages Voronoi cache status
 * @property {CacheEntry} customVoronoi - Custom Voronoi cache status
 * @property {CacheEntry} cameroonBoundary - Cameroon boundary cache status
 * @property {GeneratedDiagramsCache} generatedDiagrams - Generated diagrams cache
 * @property {number} cacheTTL - Cache time-to-live in milliseconds
 */

/**
 * @typedef {Object} CacheEntry
 * @property {boolean} loaded - Whether data is loaded
 * @property {number} [featureCount] - Number of features
 * @property {string} [lastLoaded] - ISO timestamp of last load
 */

/**
 * @typedef {Object} GeneratedDiagramsCache
 * @property {number} count - Number of generated diagrams in cache
 * @property {string[]} ids - Array of diagram IDs
 */

/**
 * @typedef {Object} VoronoiAPIResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} [error] - Error type (if failed)
 * @property {string} [message] - Error or success message
 */

/**
 * @typedef {VoronoiAPIResponse & VoronoiDiagram} GetVoronoiResponse
 */

/**
 * @typedef {VoronoiAPIResponse & { count: number, diagrams: VoronoiDiagram[] }} ListVoronoiResponse
 */

/**
 * @typedef {VoronoiAPIResponse & VoronoiStatistics} StatisticsResponse
 */

/**
 * @typedef {VoronoiAPIResponse & CoverageGapsResult} GapsResponse
 */

/**
 * @typedef {VoronoiAPIResponse & FilteredVoronoiResult} FilterResponse
 */

// Export type definitions for documentation
module.exports = {
  // This file is for documentation purposes
  // Types are defined using JSDoc and can be used for IDE autocompletion
  __types: {
    VoronoiPoint: 'Point with coordinates for Voronoi generation',
    VoronoiCell: 'Single Voronoi cell (GeoJSON Feature)',
    VoronoiDiagram: 'Complete Voronoi diagram with metadata',
    VoronoiStatistics: 'Statistical analysis of Voronoi diagram',
    CoverageGap: 'Area identified as coverage gap',
    BoundaryFilter: 'Filter options for administrative boundaries',
    GenerateVoronoiOptions: 'Options for generating new Voronoi diagrams'
  }
};
