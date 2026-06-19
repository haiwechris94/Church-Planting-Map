/**
 * Fuzzy Search Service - Provides fuzzy matching for village names
 * Uses Levenshtein distance algorithm for similarity scoring
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance between strings
 */
function levenshteinDistance(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const m = s1.length;
  const n = s2.length;
  
  // Create distance matrix
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate similarity percentage between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 100;
  
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity * 10) / 10; // Round to 1 decimal place
}

/**
 * Check if string contains another string (partial match)
 * @param {string} haystack - String to search in
 * @param {string} needle - String to search for
 * @returns {boolean}
 */
function containsPartial(haystack, needle) {
  if (!haystack || !needle) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in meters
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} - Formatted distance string
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Find villages with similar names
 * @param {Array} villages - Array of village objects
 * @param {string} searchName - Name to search for
 * @param {Object} centerPoint - Center point {lat, lng}
 * @param {Object} options - Search options
 * @returns {Array} - Array of similar villages with scores
 */
function findSimilarNames(villages, searchName, centerPoint = null, options = {}) {
  const {
    minSimilarity = 30,  // Minimum similarity percentage to include
    maxResults = 10,     // Maximum number of results
    boostPartialMatch = true  // Give bonus to partial matches
  } = options;
  
  if (!searchName || !villages || villages.length === 0) {
    return [];
  }
  
  const results = villages.map(village => {
    let similarity = calculateSimilarity(searchName, village.name);
    
    // Boost score for partial matches
    if (boostPartialMatch && containsPartial(village.name, searchName)) {
      similarity = Math.min(100, similarity + 20);
    }
    
    // Calculate distance from center point if provided
    let distance = null;
    let distanceFormatted = null;
    if (centerPoint && village.location?.coordinates) {
      const [lng, lat] = village.location.coordinates;
      distance = calculateDistanceMeters(
        centerPoint.lat, 
        centerPoint.lng, 
        lat, 
        lng
      );
      distanceFormatted = formatDistance(distance);
    }
    
    return {
      _id: village._id,
      name: village.name,
      similarity: similarity,
      distance: distance,
      distanceFormatted: distanceFormatted,
      location: village.location,
      region: village.region,
      country: village.country,
      status: village.status,
      population: village.population
    };
  });
  
  // Filter by minimum similarity and sort by similarity (descending)
  return results
    .filter(r => r.similarity >= minSimilarity)
    .sort((a, b) => {
      // Primary sort by similarity
      if (b.similarity !== a.similarity) {
        return b.similarity - a.similarity;
      }
      // Secondary sort by distance (if available)
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return 0;
    })
    .slice(0, maxResults);
}

/**
 * Search for similar village names with combined scoring
 * Combines fuzzy matching with geographic proximity
 * @param {Array} villages - Array of village objects
 * @param {string} searchName - Name to search for
 * @param {Object} centerPoint - Center point {lat, lng}
 * @param {number} maxDistance - Maximum distance in meters
 * @param {Object} options - Additional options
 * @returns {Array} - Sorted array of suggestions
 */
function searchSimilarVillages(villages, searchName, centerPoint, maxDistance, options = {}) {
  const {
    minSimilarity = 25,
    maxResults = 10,
    distanceWeight = 0.3,  // How much distance affects final score (0-1)
    similarityWeight = 0.7  // How much similarity affects final score (0-1)
  } = options;
  
  if (!villages || villages.length === 0) {
    return [];
  }
  
  const results = villages
    .filter(village => {
      // Must have valid location
      if (!village.location?.coordinates) return false;
      
      // Check if within expanded radius
      if (centerPoint && maxDistance) {
        const [lng, lat] = village.location.coordinates;
        const distance = calculateDistanceMeters(
          centerPoint.lat,
          centerPoint.lng,
          lat,
          lng
        );
        return distance <= maxDistance;
      }
      return true;
    })
    .map(village => {
      const similarity = calculateSimilarity(searchName, village.name);
      const hasPartialMatch = containsPartial(village.name, searchName);
      
      // Calculate distance
      const [lng, lat] = village.location.coordinates;
      const distance = centerPoint 
        ? calculateDistanceMeters(centerPoint.lat, centerPoint.lng, lat, lng)
        : 0;
      
      // Calculate normalized distance score (0-100, where 100 is closest)
      const distanceScore = maxDistance 
        ? Math.max(0, 100 - (distance / maxDistance) * 100)
        : 100;
      
      // Boost similarity for partial matches
      const adjustedSimilarity = hasPartialMatch 
        ? Math.min(100, similarity + 15)
        : similarity;
      
      // Calculate combined score
      const combinedScore = 
        (adjustedSimilarity * similarityWeight) + 
        (distanceScore * distanceWeight);
      
      return {
        _id: village._id,
        name: village.name,
        similarity: Math.round(adjustedSimilarity * 10) / 10,
        distance: distance,
        distanceFormatted: formatDistance(distance),
        combinedScore: Math.round(combinedScore * 10) / 10,
        location: village.location,
        coordinates: {
          lat: lat,
          lng: lng
        },
        region: village.region,
        country: village.country,
        status: village.status,
        population: village.population,
        hasPartialMatch: hasPartialMatch
      };
    })
    .filter(r => r.similarity >= minSimilarity || r.hasPartialMatch)
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, maxResults);
  
  return results;
}

module.exports = {
  levenshteinDistance,
  calculateSimilarity,
  containsPartial,
  calculateDistanceMeters,
  formatDistance,
  findSimilarNames,
  searchSimilarVillages
};
