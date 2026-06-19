/**
 * Village Status Service
 * Calculates village status based on the proportion of people groups by status.
 * 
 * NEW THRESHOLD-BASED STATUS RULES (applied in priority order):
 * 1. Pas d'information: No people groups in the village (Gray)
 * 2. Unreached: ≥ 90% of people groups have Unreached status (Red)
 * 3. DMM: ≥ 30% of people groups have DMM status (Green)
 * 4. Tipping Point: ≥ 40% of people groups have Tipping Point status (Orange)
 * 5. Midway: ≥ 50% of people groups have Midway status (Blue)
 * 6. Pioneer: ≥ 70% of people groups have Pioneer status (Yellow)
 * 
 * PRIORITY ORDER:
 * The status is determined by checking thresholds in this order:
 * DMM → Tipping Point → Midway → Pioneer → Unreached → Pas d'information
 * 
 * This means if a village has both ≥30% DMM and ≥40% Tipping Point,
 * it will be assigned DMM status (higher priority).
 * 
 * EXAMPLES:
 * - Village with no people groups → Pas d'information (Gray)
 * - Village with 95% Unreached people groups → Unreached (Red)
 * - Village with 35% DMM, 30% Tipping Point, 20% Midway, 15% Pioneer → DMM (≥30% DMM met)
 * - Village with 20% DMM, 45% Tipping Point, 20% Midway, 15% Pioneer → Tipping Point (≥40% met)
 * - Village with 10% DMM, 30% Tipping Point, 55% Midway, 5% Pioneer → Midway (≥50% met)
 * - Village with 5% DMM, 10% Tipping Point, 10% Midway, 75% Pioneer → Pioneer (≥70% met)
 * 
 * SPATIAL FALLBACK:
 * If villageName is not populated for people groups, the service will use
 * spatial queries to find people groups whose coordinates fall within village polygons.
 */

const PeopleGroup = require('../models/PeopleGroup');
const Village = require('../models/Village');

/**
 * Status thresholds for village status calculation
 * Each threshold represents the minimum percentage of people groups
 * that must have that status for the village to be assigned that status.
 * 
 * Thresholds are checked in priority order: DMM → Tipping Point → Midway → Pioneer → Unreached
 */
const STATUS_THRESHOLDS = {
  DMM: 30,           // ≥ 30% DMM → village status = DMM
  TIPPING_POINT: 40, // ≥ 40% Tipping Point → village status = Tipping Point
  MIDWAY: 50,        // ≥ 50% Midway → village status = Midway
  PIONEER: 70,       // ≥ 70% Pioneer → village status = Pioneer
  UNREACHED: 90      // ≥ 90% Unreached → village status = Unreached
};

// Status colors for frontend
const STATUS_COLORS = {
  'pas-d-information': '#9ca3af', // Gray (no people groups)
  unreached: '#ef4444',           // Red (≥90% unreached people groups)
  pioneer: '#eab308',             // Yellow
  midway: '#3b82f6',              // Blue
  'tipping-point': '#f97316',     // Orange
  dmm: '#22c55e'                  // Green
};

// Status display names
const STATUS_DISPLAY_NAMES = {
  'pas-d-information': "Pas d'information",
  unreached: 'Unreached',
  pioneer: 'Pioneer',
  midway: 'Midway',
  'tipping-point': 'Tipping Point',
  dmm: 'DMM'
};

/**
 * Determine village status based on percentage of people groups by status.
 * Applies threshold rules in priority order.
 * 
 * @param {Object} percentages - Object containing percentage for each status
 * @param {number} percentages.dmm - Percentage of DMM people groups
 * @param {number} percentages.tippingPoint - Percentage of Tipping Point people groups
 * @param {number} percentages.midway - Percentage of Midway people groups
 * @param {number} percentages.pioneer - Percentage of Pioneer people groups
 * @param {number} percentages.unreached - Percentage of Unreached people groups
 * @param {number} totalPeopleGroups - Total number of people groups (0 = pas d'information)
 * @returns {Object} Object with status and dominantStatus
 * 
 * @example
 * // Returns { status: 'dmm', dominantStatus: 'dmm' }
 * determineVillageStatus({ dmm: 35, tippingPoint: 30, midway: 20, pioneer: 15, unreached: 0 }, 10)
 */
function determineVillageStatus(percentages, totalPeopleGroups = 0) {
  // Priority 0: No people groups → Pas d'information
  if (totalPeopleGroups === 0) {
    return { status: 'pas-d-information', dominantStatus: null };
  }
  
  // Priority 1: Check DMM threshold (≥30%)
  if (percentages.dmm >= STATUS_THRESHOLDS.DMM) {
    return { status: 'dmm', dominantStatus: 'dmm' };
  }
  
  // Priority 2: Check Tipping Point threshold (≥40%)
  if (percentages.tippingPoint >= STATUS_THRESHOLDS.TIPPING_POINT) {
    return { status: 'tipping-point', dominantStatus: 'tipping-point' };
  }
  
  // Priority 3: Check Midway threshold (≥50%)
  if (percentages.midway >= STATUS_THRESHOLDS.MIDWAY) {
    return { status: 'midway', dominantStatus: 'midway' };
  }
  
  // Priority 4: Check Pioneer threshold (≥70%)
  if (percentages.pioneer >= STATUS_THRESHOLDS.PIONEER) {
    return { status: 'pioneer', dominantStatus: 'pioneer' };
  }
  
  // Priority 5: Check Unreached threshold (≥90%)
  if (percentages.unreached >= STATUS_THRESHOLDS.UNREACHED) {
    return { status: 'unreached', dominantStatus: 'unreached' };
  }
  
  // No threshold met → Default to Pioneer (lowest active status)
  return { status: 'pioneer', dominantStatus: null };
}

/**
 * Check if a people group status is at least Pioneer (not unreached)
 * @param {string} status - People group engagement status
 * @returns {boolean}
 */
function isAtLeastPioneer(status) {
  const validStatuses = ['pioneer', 'midway', 'tipping-point', 'dmm'];
  return validStatuses.includes(status);
}

/**
 * Check if a people group is unreached
 * @param {string} status - People group engagement status
 * @returns {boolean}
 */
function isUnreached(status) {
  return status === 'unreached';
}

/**
 * Calculate status for a specific village using threshold-based rules.
 * 
 * This function:
 * 1. Queries all approved people groups in the village
 * 2. Counts people groups by each status (pioneer, midway, tipping-point, dmm)
 * 3. Calculates percentage for each status
 * 4. Applies threshold rules in priority order to determine village status
 * 
 * @param {string} villageName - Name of the village
 * @returns {Promise<Object>} Village status object containing:
 *   - villageName: Name of the village
 *   - status: Calculated village status based on thresholds
 *   - totalPeoples: Total number of people groups
 *   - statusBreakdown: Count of people groups by status
 *   - percentages: Percentage of people groups by status
 *   - dominantStatus: The status that determined the village status
 * 
 * @example
 * // Returns:
 * // {
 * //   villageName: "Village A",
 * //   status: "dmm",
 * //   totalPeoples: 10,
 * //   statusBreakdown: { pioneer: 1, midway: 2, tippingPoint: 3, dmm: 4 },
 * //   percentages: { pioneer: 10, midway: 20, tippingPoint: 30, dmm: 40 },
 * //   dominantStatus: "dmm"
 * // }
 */
async function calculateVillageStatus(villageName, options = {}) {
  const { includeJoshuaProject = true } = options;
  
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // SURVEY SOURCE INCLUSION POLICY:
    // Survey source peoples are ALWAYS included in status calculation.
    // They are never excluded regardless of the includeJoshuaProject flag.
    // 
    // Valid sources: 'DMM', 'manual', 'Survey', 'Joshua Project'
    // - DMM: Always included
    // - manual: Always included  
    // - Survey: ALWAYS INCLUDED (never excluded)
    // - Joshua Project: Can be optionally excluded via includeJoshuaProject flag
    // ═══════════════════════════════════════════════════════════════════════════
    const query = {
      villageName: villageName,
      approved: true
    };
    
    // If not including Joshua Project, filter them out using $ne (not equal)
    // IMPORTANT: This query { $ne: 'Joshua Project' } only excludes Joshua Project.
    // DMM, manual, and Survey sources are all INCLUDED because they are NOT equal to 'Joshua Project'.
    // Survey peoples are NEVER excluded - they always contribute to status calculation.
    if (!includeJoshuaProject) {
      query.source = { $ne: 'Joshua Project' };
    }
    
    const peopleGroups = await PeopleGroup.find(query)
      .select('name engagementStatus status source');

    const totalPeoples = peopleGroups.length;
    
    // Return "Pas d'information" status if no people groups
    if (totalPeoples === 0) {
      return {
        villageName,
        status: 'pas-d-information',
        statusColor: STATUS_COLORS['pas-d-information'],
        statusDisplay: STATUS_DISPLAY_NAMES['pas-d-information'],
        totalPeoples: 0,
        statusBreakdown: {
          unreached: 0,
          pioneer: 0,
          midway: 0,
          tippingPoint: 0,
          dmm: 0
        },
        percentages: {
          unreached: 0,
          pioneer: 0,
          midway: 0,
          tippingPoint: 0,
          dmm: 0
        },
        dominantStatus: null,
        // Keep legacy fields for backward compatibility
        dmmCount: 0,
        percentage: 0,
        allAtLeastPioneer: false,
        peopleGroupsByStatus: {
          unreached: 0,
          pioneer: 0,
          midway: 0,
          'tipping-point': 0,
          dmm: 0
        }
      };
    }

    // Count people groups by engagement status
    const statusBreakdown = {
      unreached: 0,
      pioneer: 0,
      midway: 0,
      tippingPoint: 0,
      dmm: 0
    };

    // Legacy format for backward compatibility
    const legacyStatusCounts = {
      unreached: 0,
      pioneer: 0,
      midway: 0,
      'tipping-point': 0,
      dmm: 0
    };

    let allAtLeastPioneer = true;

    peopleGroups.forEach(pg => {
      const status = pg.engagementStatus || pg.status || 'unreached';
      
      // Update new format counts
      if (status === 'unreached') {
        statusBreakdown.unreached++;
      } else if (status === 'pioneer') {
        statusBreakdown.pioneer++;
      } else if (status === 'midway') {
        statusBreakdown.midway++;
      } else if (status === 'tipping-point') {
        statusBreakdown.tippingPoint++;
      } else if (status === 'dmm') {
        statusBreakdown.dmm++;
      }
      
      // Update legacy format counts
      if (legacyStatusCounts.hasOwnProperty(status)) {
        legacyStatusCounts[status]++;
      }
      
      // Check if this people group is at least Pioneer
      if (!isAtLeastPioneer(status)) {
        allAtLeastPioneer = false;
      }
    });

    // Calculate percentages for each status
    const percentages = {
      unreached: Math.round((statusBreakdown.unreached / totalPeoples) * 100),
      pioneer: Math.round((statusBreakdown.pioneer / totalPeoples) * 100),
      midway: Math.round((statusBreakdown.midway / totalPeoples) * 100),
      tippingPoint: Math.round((statusBreakdown.tippingPoint / totalPeoples) * 100),
      dmm: Math.round((statusBreakdown.dmm / totalPeoples) * 100)
    };

    // Determine village status using threshold rules
    const { status: villageStatus, dominantStatus } = determineVillageStatus(percentages, totalPeoples);

    // Legacy fields for backward compatibility
    const dmmCount = statusBreakdown.dmm;
    const percentage = percentages.dmm;

    return {
      villageName,
      status: villageStatus,
      statusColor: STATUS_COLORS[villageStatus],
      statusDisplay: STATUS_DISPLAY_NAMES[villageStatus],
      totalPeoples,
      statusBreakdown,
      percentages,
      dominantStatus,
      // Legacy fields for backward compatibility
      dmmCount,
      percentage,
      allAtLeastPioneer,
      peopleGroupsByStatus: legacyStatusCounts
    };
  } catch (error) {
    console.error(`Error calculating status for village ${villageName}:`, error);
    throw error;
  }
}

/**
 * Find people groups within a village polygon using spatial query
 * @param {Object} village - Village document with boundary polygon
 * @param {Object} options - Options for filtering people groups
 * @param {boolean} options.includeJoshuaProject - Whether to include Joshua Project peoples
 * @returns {Promise<Array>} Array of people groups within the village
 */
async function findPeopleGroupsInVillagePolygon(village, options = {}) {
  const { includeJoshuaProject = true } = options;
  
  if (!village.boundary || !village.boundary.coordinates) {
    console.log(`[VillageStatusService] Village "${village.name}" has no boundary polygon`);
    return [];
  }
  
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // SURVEY SOURCE INCLUSION POLICY (Spatial Queries):
    // Survey source peoples are ALWAYS included in spatial queries.
    // They are never excluded regardless of the includeJoshuaProject flag.
    // 
    // Valid sources: 'DMM', 'manual', 'Survey', 'Joshua Project'
    // - DMM: Always included
    // - manual: Always included  
    // - Survey: ALWAYS INCLUDED (never excluded)
    // - Joshua Project: Can be optionally excluded via includeJoshuaProject flag
    // ═══════════════════════════════════════════════════════════════════════════
    const query = {
      approved: true,
      location: {
        $geoWithin: {
          $geometry: village.boundary
        }
      }
    };
    
    // If not including Joshua Project, filter them out using $ne (not equal)
    // IMPORTANT: This query { $ne: 'Joshua Project' } only excludes Joshua Project.
    // DMM, manual, and Survey sources are all INCLUDED because they are NOT equal to 'Joshua Project'.
    // Survey peoples are NEVER excluded from spatial queries.
    if (!includeJoshuaProject) {
      query.source = { $ne: 'Joshua Project' };
    }
    
    // Use MongoDB's $geoWithin to find people groups inside the village polygon
    const peopleGroups = await PeopleGroup.find(query)
      .select('name engagementStatus status location source');
    
    console.log(`[VillageStatusService] Found ${peopleGroups.length} people groups in village "${village.name}" via spatial query (includeJoshuaProject: ${includeJoshuaProject})`);
    return peopleGroups;
  } catch (error) {
    console.error(`[VillageStatusService] Spatial query error for village "${village.name}":`, error.message);
    return [];
  }
}

/**
 * Calculate status for a village using spatial query (fallback when villageName is not populated)
 * @param {Object} village - Village document with boundary polygon
 * @param {Object} options - Options for filtering people groups
 * @param {boolean} options.includeJoshuaProject - Whether to include Joshua Project peoples
 * @returns {Promise<Object>} Village status object
 */
async function calculateVillageStatusBySpatial(village, options = {}) {
  try {
    const peopleGroups = await findPeopleGroupsInVillagePolygon(village, options);
    const totalPeoples = peopleGroups.length;
    
    // Return unreached status if no people groups
    if (totalPeoples === 0) {
      return {
        villageName: village.name,
        villageId: village._id,
        status: 'unreached',
        statusColor: STATUS_COLORS.unreached,
        statusDisplay: STATUS_DISPLAY_NAMES.unreached,
        totalPeoples: 0,
        statusBreakdown: { unreached: 0, pioneer: 0, midway: 0, tippingPoint: 0, dmm: 0 },
        percentages: { unreached: 0, pioneer: 0, midway: 0, tippingPoint: 0, dmm: 0 },
        dominantStatus: null,
        dmmCount: 0,
        percentage: 0,
        allAtLeastPioneer: false,
        peopleGroupsByStatus: { pioneer: 0, midway: 0, 'tipping-point': 0, dmm: 0 },
        matchMethod: 'spatial',
        _debug: { reason: 'No people groups found in polygon' }
      };
    }

    // Count people groups by engagement status
    const statusBreakdown = { unreached: 0, pioneer: 0, midway: 0, tippingPoint: 0, dmm: 0 };
    const legacyStatusCounts = { unreached: 0, pioneer: 0, midway: 0, 'tipping-point': 0, dmm: 0 };
    let allAtLeastPioneer = true;

    peopleGroups.forEach(pg => {
      const status = pg.engagementStatus || pg.status || 'unreached';
      
      if (status === 'pioneer') statusBreakdown.pioneer++;
      else if (status === 'midway') statusBreakdown.midway++;
      else if (status === 'tipping-point') statusBreakdown.tippingPoint++;
      else if (status === 'dmm') statusBreakdown.dmm++;
      else if (status === 'unreached') statusBreakdown.unreached++;
      
      if (legacyStatusCounts.hasOwnProperty(status)) legacyStatusCounts[status]++;
      if (!isAtLeastPioneer(status)) allAtLeastPioneer = false;
    });

    const percentages = {
      unreached: Math.round((statusBreakdown.unreached / totalPeoples) * 100),
      pioneer: Math.round((statusBreakdown.pioneer / totalPeoples) * 100),
      midway: Math.round((statusBreakdown.midway / totalPeoples) * 100),
      tippingPoint: Math.round((statusBreakdown.tippingPoint / totalPeoples) * 100),
      dmm: Math.round((statusBreakdown.dmm / totalPeoples) * 100)
    };

    const { status: villageStatus, dominantStatus } = determineVillageStatus(percentages);

    return {
      villageName: village.name,
      villageId: village._id,
      status: villageStatus,
      statusColor: STATUS_COLORS[villageStatus],
      statusDisplay: STATUS_DISPLAY_NAMES[villageStatus],
      totalPeoples,
      statusBreakdown,
      percentages,
      dominantStatus,
      dmmCount: statusBreakdown.dmm,
      percentage: percentages.dmm,
      allAtLeastPioneer,
      peopleGroupsByStatus: legacyStatusCounts,
      matchMethod: 'spatial',
      _debug: { 
        peopleGroupNames: peopleGroups.map(pg => pg.name),
        reason: 'Matched via spatial query (polygon containment)'
      }
    };
  } catch (error) {
    console.error(`[VillageStatusService] Error calculating spatial status for village ${village.name}:`, error);
    throw error;
  }
}

/**
 * Calculate status for all villages using threshold-based rules.
 * 
 * This function uses a TWO-PHASE approach:
 * 1. First, try to find villages by villageName field (fast, requires migration)
 * 2. If no villages found, fall back to spatial queries (slower, but works without migration)
 * 
 * @returns {Promise<Object>} Object containing:
 *   - villages: Array of village status objects
 *   - statistics: Aggregated statistics
 *   - statusColors: Color mapping for statuses
 *   - statusDisplayNames: Display names for statuses
 *   - thresholds: Current threshold values
 *   - generatedAt: Timestamp of calculation
 */
async function calculateAllVillageStatuses(options = {}) {
  const { includeJoshuaProject = true } = options;
  
  try {
    console.log('[VillageStatusService] ═══════════════════════════════════════════════════════');
    console.log(`[VillageStatusService] Starting village status calculation (includeJoshuaProject: ${includeJoshuaProject})...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SURVEY SOURCE INCLUSION POLICY (Village Discovery):
    // Survey source peoples are ALWAYS included when finding unique village names.
    // They are never excluded regardless of the includeJoshuaProject flag.
    // 
    // Valid sources: 'DMM', 'manual', 'Survey', 'Joshua Project'
    // - DMM: Always included in village discovery
    // - manual: Always included in village discovery
    // - Survey: ALWAYS INCLUDED (never excluded from village discovery)
    // - Joshua Project: Can be optionally excluded via includeJoshuaProject flag
    // ═══════════════════════════════════════════════════════════════════════════
    const villageQuery = {
      villageName: { $exists: true, $ne: null, $ne: '' },
      approved: true
    };
    
    // If not including Joshua Project, filter them out using $ne (not equal)
    // IMPORTANT: This query { $ne: 'Joshua Project' } only excludes Joshua Project.
    // DMM, manual, and Survey sources are all INCLUDED because they are NOT equal to 'Joshua Project'.
    // Survey peoples are NEVER excluded - they always contribute to village discovery.
    if (!includeJoshuaProject) {
      villageQuery.source = { $ne: 'Joshua Project' };
    }
    
    // PHASE 1: Try to find villages by villageName field
    const uniqueVillageNames = await PeopleGroup.distinct('villageName', villageQuery);
    
    console.log(`[VillageStatusService] Phase 1: Found ${uniqueVillageNames.length} unique village names from people groups`);
    
    let villageStatuses = [];
    let usedSpatialFallback = false;
    
    if (uniqueVillageNames.length > 0) {
      // Use villageName-based calculation
      console.log('[VillageStatusService] Using villageName-based calculation');
      villageStatuses = await Promise.all(
        uniqueVillageNames.map(villageName => calculateVillageStatus(villageName, { includeJoshuaProject }))
      );
    } else {
      // PHASE 2: Fall back to spatial queries
      console.log('[VillageStatusService] ⚠️  No villageName data found - using SPATIAL FALLBACK');
      console.log('[VillageStatusService] 💡 Run "node scripts/migrateVillageNames.js" to populate villageName field for faster queries');
      usedSpatialFallback = true;
      
      // Check if there are any approved people groups at all
      const totalPeopleGroups = await PeopleGroup.countDocuments({ approved: true });
      console.log(`[VillageStatusService] Total approved people groups: ${totalPeopleGroups}`);
      
      if (totalPeopleGroups === 0) {
        console.log('[VillageStatusService] No approved people groups found - returning empty result');
      } else {
        // Get all villages with boundary polygons
        const villagesWithBoundaries = await Village.find({
          'boundary.coordinates': { $exists: true, $ne: null }
        }).select('name boundary location');
        
        console.log(`[VillageStatusService] Found ${villagesWithBoundaries.length} villages with boundary polygons`);
        
        if (villagesWithBoundaries.length === 0) {
          console.log('[VillageStatusService] ⚠️  No villages have boundary polygons - cannot use spatial fallback');
          console.log('[VillageStatusService] 💡 Import village polygons or run migration script');
          
          // Log sample people groups for debugging
          const samplePGs = await PeopleGroup.find({ approved: true }).limit(5).select('name villageName location');
          console.log('[VillageStatusService] Sample people groups:', JSON.stringify(samplePGs.map(pg => ({
            name: pg.name,
            villageName: pg.villageName || '(not set)',
            hasLocation: !!pg.location?.coordinates
          })), null, 2));
        } else {
          // Calculate status for each village using spatial queries
          console.log('[VillageStatusService] Calculating status for each village using spatial queries...');
          villageStatuses = await Promise.all(
            villagesWithBoundaries.map(village => calculateVillageStatusBySpatial(village, { includeJoshuaProject }))
          );
          
          // Filter out villages with no people groups (optional - keep them as unreached)
          const villagesWithPeopleGroups = villageStatuses.filter(vs => vs.totalPeoples > 0);
          console.log(`[VillageStatusService] ${villagesWithPeopleGroups.length} villages have people groups (via spatial)`);
        }
      }
    }

    // Calculate comprehensive summary statistics
    const statistics = {
      totalVillages: villageStatuses.length,
      villagesWithPeopleGroups: villageStatuses.filter(vs => vs.totalPeoples > 0).length,
      byStatus: {
        'pas-d-information': 0,
        unreached: 0,
        pioneer: 0,
        midway: 0,
        'tipping-point': 0,
        dmm: 0
      },
      peopleGroupsByStatus: {
        unreached: 0,
        pioneer: 0,
        midway: 0,
        tippingPoint: 0,
        dmm: 0
      },
      totalPeopleGroups: 0,
      totalDmmPeopleGroups: 0,
      usedSpatialFallback
    };

    villageStatuses.forEach(vs => {
      if (statistics.byStatus.hasOwnProperty(vs.status)) {
        statistics.byStatus[vs.status]++;
      }
      statistics.totalPeopleGroups += vs.totalPeoples;
      statistics.totalDmmPeopleGroups += vs.dmmCount || 0;
      
      if (vs.statusBreakdown) {
        statistics.peopleGroupsByStatus.unreached += vs.statusBreakdown.unreached || 0;
        statistics.peopleGroupsByStatus.pioneer += vs.statusBreakdown.pioneer || 0;
        statistics.peopleGroupsByStatus.midway += vs.statusBreakdown.midway || 0;
        statistics.peopleGroupsByStatus.tippingPoint += vs.statusBreakdown.tippingPoint || 0;
        statistics.peopleGroupsByStatus.dmm += vs.statusBreakdown.dmm || 0;
      }
    });

    const totalPG = statistics.totalPeopleGroups;
    statistics.overallPercentages = {
      unreached: totalPG > 0 ? Math.round((statistics.peopleGroupsByStatus.unreached / totalPG) * 100) : 0,
      pioneer: totalPG > 0 ? Math.round((statistics.peopleGroupsByStatus.pioneer / totalPG) * 100) : 0,
      midway: totalPG > 0 ? Math.round((statistics.peopleGroupsByStatus.midway / totalPG) * 100) : 0,
      tippingPoint: totalPG > 0 ? Math.round((statistics.peopleGroupsByStatus.tippingPoint / totalPG) * 100) : 0,
      dmm: totalPG > 0 ? Math.round((statistics.peopleGroupsByStatus.dmm / totalPG) * 100) : 0
    };
    statistics.overallDmmPercentage = statistics.overallPercentages.dmm;

    console.log('[VillageStatusService] ═══════════════════════════════════════════════════════');
    console.log(`[VillageStatusService] ✅ Calculated statuses for ${villageStatuses.length} villages`);
    console.log(`[VillageStatusService] Villages with people groups: ${statistics.villagesWithPeopleGroups}`);
    console.log(`[VillageStatusService] Total people groups: ${statistics.totalPeopleGroups}`);
    console.log(`[VillageStatusService] Used spatial fallback: ${usedSpatialFallback}`);
    console.log('[VillageStatusService] Status breakdown:', JSON.stringify(statistics.byStatus));
    console.log('[VillageStatusService] ═══════════════════════════════════════════════════════');

    return {
      villages: villageStatuses,
      statistics,
      statusColors: STATUS_COLORS,
      statusDisplayNames: STATUS_DISPLAY_NAMES,
      thresholds: STATUS_THRESHOLDS,
      generatedAt: new Date().toISOString(),
      _meta: {
        usedSpatialFallback,
        migrationRequired: usedSpatialFallback,
        migrationCommand: 'node scripts/migrateVillageNames.js'
      }
    };
  } catch (error) {
    console.error('[VillageStatusService] Error calculating all village statuses:', error);
    throw error;
  }
}

/**
 * Get villages by status
 * @param {string} status - Village status to filter by
 * @param {Object} options - Options for status calculation
 * @param {boolean} options.includeJoshuaProject - Whether to include Joshua Project data (default: false)
 * @returns {Promise<Array>} Array of village status objects
 */
async function getVillagesByStatus(status, options = {}) {
  const allStatuses = await calculateAllVillageStatuses(options);
  return allStatuses.villages.filter(v => v.status === status);
}

/**
 * Recalculate status for villages affected by a people group change
 * @param {string} villageName - Name of the village to recalculate
 * @returns {Promise<Object>} Updated village status
 */
async function recalculateVillageStatus(villageName) {
  if (!villageName) return null;
  return calculateVillageStatus(villageName);
}

module.exports = {
  calculateVillageStatus,
  calculateAllVillageStatuses,
  calculateVillageStatusBySpatial,
  findPeopleGroupsInVillagePolygon,
  getVillagesByStatus,
  recalculateVillageStatus,
  STATUS_COLORS,
  STATUS_DISPLAY_NAMES,
  STATUS_THRESHOLDS,
  determineVillageStatus,
  isAtLeastPioneer,
  isUnreached
};