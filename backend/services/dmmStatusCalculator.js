/**
 * DMM Status Calculator Service
 * 
 * Calculates the status and level of a people group based on the number of churches (eglises)
 * and generations according to the DMM (Disciple Making Movement) table.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * DMM TABLE (TABLEAU DMM) - Status and Level Calculation Rules
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * 
 * ETAPES (Status)          │ NIVEAU I        │ NIVEAU II       │ NIVEAU III      │ NIVEAU IV
 * ─────────────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────
 * MOUVEMENT                │ 100+ églises &  │ 100+ églises &  │ 100+ églises &  │ (N/A)
 *                          │ 4 générations   │ 5-6 générations │ 7+ générations  │
 * ─────────────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────
 * POINT DE BASCULEMENT     │ 67-99 églises & │ 67-99 églises & │ 67-99 églises & │ 67-99 églises &
 *                          │ 1-2 générations │ 3-4 générations │ 5-6 générations │ 7+ générations
 * ─────────────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────
 * MI-PARCOURS              │ 34-66 églises & │ 34-66 églises & │ 34-66 églises & │ 34-66 églises &
 *                          │ 1-2 générations │ 3-4 générations │ 5-6 générations │ 7+ générations
 * ─────────────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────
 * PIONNIER                 │ 1-33 églises &  │ 1-33 églises &  │ 1-33 églises &  │ 1-33 églises &
 *                          │ 1-2 générations │ 3-4 générations │ 5-6 générations │ 7+ générations
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * 
 * RULES:
 * - Status is determined primarily by the number of churches (eglises)
 * - Level is determined by the number of generations
 * - MOUVEMENT status requires at least 100 churches AND at least 4 generations
 * - If churches < 1 or generations < 1, status is "PIONNIER" level "I"
 * 
 * STATUS MAPPING (French → English internal values):
 * - PIONNIER → pioneer
 * - MI-PARCOURS → midway
 * - POINT DE BASCULEMENT → tipping-point
 * - MOUVEMENT → dmm
 * 
 * LEVEL MAPPING:
 * - NIVEAU I → I (1-2 generations)
 * - NIVEAU II → II (3-4 generations)
 * - NIVEAU III → III (5-6 generations)
 * - NIVEAU IV → IV (7+ generations)
 */

// Status thresholds based on number of churches
const CHURCH_THRESHOLDS = {
  MOUVEMENT: 100,           // 100+ churches
  POINT_DE_BASCULEMENT: 67, // 67-99 churches
  MI_PARCOURS: 34,          // 34-66 churches
  PIONNIER: 1               // 1-33 churches
};

// Generation thresholds for levels
const GENERATION_THRESHOLDS = {
  LEVEL_IV: 7,  // 7+ generations
  LEVEL_III: 5, // 5-6 generations
  LEVEL_II: 3,  // 3-4 generations
  LEVEL_I: 1    // 1-2 generations
};

// Status display names (French)
const STATUS_DISPLAY_NAMES_FR = {
  unreached: 'NON ATTEINT',
  pioneer: 'PIONNIER',
  midway: 'MI-PARCOURS',
  'tipping-point': 'POINT DE BASCULEMENT',
  dmm: 'MOUVEMENT'
};

// Status display names (English)
const STATUS_DISPLAY_NAMES_EN = {
  unreached: 'Unreached',
  pioneer: 'Pioneer',
  midway: 'Midway',
  'tipping-point': 'Tipping Point',
  dmm: 'Movement'
};

// Level display names
const LEVEL_DISPLAY_NAMES = {
  'I': 'Niveau I',
  'II': 'Niveau II',
  'III': 'Niveau III',
  'IV': 'Niveau IV'
};

/**
 * Determine the level based on the number of generations
 * @param {number} generations - Number of church generations
 * @returns {string} Level: 'I', 'II', 'III', or 'IV'
 */
function calculateLevel(generations) {
  if (generations >= GENERATION_THRESHOLDS.LEVEL_IV) {
    return 'IV';
  } else if (generations >= GENERATION_THRESHOLDS.LEVEL_III) {
    return 'III';
  } else if (generations >= GENERATION_THRESHOLDS.LEVEL_II) {
    return 'II';
  } else {
    return 'I';
  }
}

/**
 * Determine the status based on the number of churches
 * Note: MOUVEMENT status also requires minimum 4 generations
 * @param {number} eglises - Number of churches
 * @param {number} generations - Number of generations (needed for MOUVEMENT check)
 * @returns {string} Status: 'unreached', 'pioneer', 'midway', 'tipping-point', or 'dmm'
 */
function calculateStatus(eglises, generations) {
  // UNREACHED: 0 churches AND 0 generations
  if (eglises === 0 && generations === 0) {
    return 'unreached';
  }
  // MOUVEMENT requires both 100+ churches AND 4+ generations
  if (eglises >= CHURCH_THRESHOLDS.MOUVEMENT && generations >= 4) {
    return 'dmm';
  }
  // POINT DE BASCULEMENT: 67-99 churches (or 100+ with less than 4 generations)
  else if (eglises >= CHURCH_THRESHOLDS.POINT_DE_BASCULEMENT) {
    return 'tipping-point';
  }
  // MI-PARCOURS: 34-66 churches
  else if (eglises >= CHURCH_THRESHOLDS.MI_PARCOURS) {
    return 'midway';
  }
  // PIONNIER: 1-33 churches (or has some activity)
  else {
    return 'pioneer';
  }
}

/**
 * Calculate the status and level for a people group based on churches and generations
 * 
 * @param {number} eglises - Number of churches (églises)
 * @param {number} generations - Number of church generations
 * @returns {Object} Object containing:
 *   - status: Internal status value ('pioneer', 'midway', 'tipping-point', 'dmm')
 *   - level: Level value ('I', 'II', 'III', 'IV')
 *   - statusFr: French display name for status
 *   - statusEn: English display name for status
 *   - levelDisplay: Display name for level
 *   - description: Human-readable description of the calculation
 * 
 * @example
 * // Returns { status: 'midway', level: 'II', statusFr: 'MI-PARCOURS', ... }
 * calculatePeopleGroupStatus(50, 3)
 * 
 * @example
 * // Returns { status: 'dmm', level: 'III', statusFr: 'MOUVEMENT', ... }
 * calculatePeopleGroupStatus(150, 6)
 */
function calculatePeopleGroupStatus(eglises, generations) {
  // Ensure valid numbers
  const churches = Math.max(0, parseInt(eglises) || 0);
  const gens = Math.max(0, parseInt(generations) || 0);
  
  // Calculate status and level
  const status = calculateStatus(churches, gens);
  const level = calculateLevel(gens);
  
  // Build description
  let description = '';
  if (churches === 0) {
    description = 'Aucune église enregistrée';
  } else if (gens === 0) {
    description = `${churches} église(s), aucune génération enregistrée`;
  } else {
    description = `${churches} église(s) sur ${gens} génération(s)`;
  }
  
  return {
    status,
    level,
    statusFr: STATUS_DISPLAY_NAMES_FR[status],
    statusEn: STATUS_DISPLAY_NAMES_EN[status],
    levelDisplay: LEVEL_DISPLAY_NAMES[level],
    description,
    // Raw values for reference
    churches,
    generations: gens,
    // Thresholds for context
    thresholds: {
      churches: CHURCH_THRESHOLDS,
      generations: GENERATION_THRESHOLDS
    }
  };
}

/**
 * Validate that the calculated status and level match the DMM table
 * Useful for testing and verification
 * 
 * @param {number} eglises - Number of churches
 * @param {number} generations - Number of generations
 * @param {string} expectedStatus - Expected status
 * @param {string} expectedLevel - Expected level
 * @returns {boolean} True if calculation matches expected values
 */
function validateCalculation(eglises, generations, expectedStatus, expectedLevel) {
  const result = calculatePeopleGroupStatus(eglises, generations);
  return result.status === expectedStatus && result.level === expectedLevel;
}

/**
 * Get all possible status values
 * @returns {Array} Array of status objects with value and display names
 */
function getAllStatuses() {
  return [
    { value: 'unreached', fr: 'NON ATTEINT', en: 'Unreached', color: '#ef4444' },
    { value: 'pioneer', fr: 'PIONNIER', en: 'Pioneer', color: '#eab308' },
    { value: 'midway', fr: 'MI-PARCOURS', en: 'Midway', color: '#3b82f6' },
    { value: 'tipping-point', fr: 'POINT DE BASCULEMENT', en: 'Tipping Point', color: '#f97316' },
    { value: 'dmm', fr: 'MOUVEMENT', en: 'Movement', color: '#22c55e' }
  ];
}

/**
 * Get all possible level values
 * @returns {Array} Array of level objects with value and display name
 */
function getAllLevels() {
  return [
    { value: 'I', display: 'Niveau I', generationRange: '1-2' },
    { value: 'II', display: 'Niveau II', generationRange: '3-4' },
    { value: 'III', display: 'Niveau III', generationRange: '5-6' },
    { value: 'IV', display: 'Niveau IV', generationRange: '7+' }
  ];
}

/**
 * Get the church range for a given status
 * @param {string} status - Status value
 * @returns {Object} Object with min and max church count
 */
function getChurchRangeForStatus(status) {
  switch (status) {
    case 'dmm':
      return { min: 100, max: Infinity, display: '100+' };
    case 'tipping-point':
      return { min: 67, max: 99, display: '67-99' };
    case 'midway':
      return { min: 34, max: 66, display: '34-66' };
    case 'pioneer':
    default:
      return { min: 0, max: 33, display: '1-33' };
  }
}

/**
 * Get the generation range for a given level
 * @param {string} level - Level value
 * @returns {Object} Object with min and max generation count
 */
function getGenerationRangeForLevel(level) {
  switch (level) {
    case 'IV':
      return { min: 7, max: Infinity, display: '7+' };
    case 'III':
      return { min: 5, max: 6, display: '5-6' };
    case 'II':
      return { min: 3, max: 4, display: '3-4' };
    case 'I':
    default:
      return { min: 1, max: 2, display: '1-2' };
  }
}

module.exports = {
  calculatePeopleGroupStatus,
  calculateStatus,
  calculateLevel,
  validateCalculation,
  getAllStatuses,
  getAllLevels,
  getChurchRangeForStatus,
  getGenerationRangeForLevel,
  CHURCH_THRESHOLDS,
  GENERATION_THRESHOLDS,
  STATUS_DISPLAY_NAMES_FR,
  STATUS_DISPLAY_NAMES_EN,
  LEVEL_DISPLAY_NAMES
};
