/**
 * Migration Script: Populate villageName field for People Groups
 * 
 * This script reads all people groups from the database and for each one
 * with coordinates (latitude/longitude), finds which village polygon contains
 * those coordinates and updates the people group's villageName field.
 * 
 * Usage: node scripts/migrateVillageNames.js
 * 
 * Options:
 *   --dry-run    Preview changes without saving to database
 *   --force      Update even if villageName already exists
 *   --verbose    Show detailed logging for each people group
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Path to villages GeoJSON with polygon data (Voronoi)
  voronoiGeoJsonPath: path.join(__dirname, '../../frontend/public/data/villages_voronoi.geojson'),
  // Path to villages GeoJSON with point data (fallback for nearest village)
  pointsGeoJsonPath: path.join(__dirname, '../../frontend/public/data/villages.geojson'),
  // MongoDB connection
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map'
};

// Command line arguments
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE_UPDATE = process.argv.includes('--force');
const VERBOSE = process.argv.includes('--verbose');

// ═══════════════════════════════════════════════════════════════════════════
// PEOPLE GROUP SCHEMA (minimal for migration)
// ═══════════════════════════════════════════════════════════════════════════

const peopleGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  villageName: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  approved: { type: Boolean, default: false }
}, { timestamps: true, strict: false });

// ═══════════════════════════════════════════════════════════════════════════
// GEOMETRY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {Array} polygon - Array of [lng, lat] coordinates
 * @returns {boolean}
 */
function pointInPolygon(lng, lat, polygon) {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Check if a point is inside a GeoJSON geometry (Polygon or MultiPolygon)
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {boolean}
 */
function pointInGeometry(lng, lat, geometry) {
  if (geometry.type === 'Polygon') {
    // Check outer ring (first array)
    return pointInPolygon(lng, lat, geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    // Check each polygon
    for (const polygon of geometry.coordinates) {
      if (pointInPolygon(lng, lat, polygon[0])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ═══════════════════════════════════════════════════════════════════════════
// VILLAGE LOOKUP
// ═══════════════════════════════════════════════════════════════════════════

let voronoiData = null;
let pointsData = null;

/**
 * Load GeoJSON data from files
 */
function loadGeoJSONData() {
  console.log('\n📂 Loading GeoJSON data...');
  
  // Load Voronoi polygons
  if (fs.existsSync(CONFIG.voronoiGeoJsonPath)) {
    try {
      voronoiData = JSON.parse(fs.readFileSync(CONFIG.voronoiGeoJsonPath, 'utf8'));
      const namedFeatures = voronoiData.features.filter(f => f.properties?.name);
      console.log(`   ✅ Loaded ${voronoiData.features.length} Voronoi polygons (${namedFeatures.length} with names)`);
    } catch (error) {
      console.log(`   ⚠️  Error loading Voronoi GeoJSON: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  Voronoi GeoJSON not found at: ${CONFIG.voronoiGeoJsonPath}`);
  }
  
  // Load village points (for fallback nearest village lookup)
  if (fs.existsSync(CONFIG.pointsGeoJsonPath)) {
    try {
      pointsData = JSON.parse(fs.readFileSync(CONFIG.pointsGeoJsonPath, 'utf8'));
      const namedFeatures = pointsData.features.filter(f => f.properties?.name);
      console.log(`   ✅ Loaded ${pointsData.features.length} village points (${namedFeatures.length} with names)`);
    } catch (error) {
      console.log(`   ⚠️  Error loading points GeoJSON: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  Points GeoJSON not found at: ${CONFIG.pointsGeoJsonPath}`);
  }
}

/**
 * Find the village that contains a given point using Voronoi polygons
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {string|null} Village name or null if not found
 */
function findVillageByPolygon(lng, lat) {
  if (!voronoiData?.features) return null;
  
  for (const feature of voronoiData.features) {
    const name = feature.properties?.name;
    if (!name) continue;
    
    if (feature.geometry && pointInGeometry(lng, lat, feature.geometry)) {
      return name;
    }
  }
  
  return null;
}

/**
 * Find the nearest village to a given point
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {number} maxDistance - Maximum distance in km (default: 50)
 * @returns {{name: string, distance: number}|null}
 */
function findNearestVillage(lng, lat, maxDistance = 50) {
  if (!pointsData?.features) return null;
  
  let nearest = null;
  let minDistance = Infinity;
  
  for (const feature of pointsData.features) {
    const name = feature.properties?.name;
    if (!name) continue;
    
    if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
      const [vLng, vLat] = feature.geometry.coordinates;
      const distance = haversineDistance(lat, lng, vLat, vLng);
      
      if (distance < minDistance && distance <= maxDistance) {
        minDistance = distance;
        nearest = { name, distance };
      }
    }
  }
  
  return nearest;
}

/**
 * Find village name for a given coordinate
 * First tries polygon containment, then falls back to nearest village
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {{villageName: string, method: string, distance?: number}|null}
 */
function findVillageForCoordinates(lng, lat) {
  // First try polygon containment
  const polygonMatch = findVillageByPolygon(lng, lat);
  if (polygonMatch) {
    return { villageName: polygonMatch, method: 'polygon' };
  }
  
  // Fall back to nearest village
  const nearestMatch = findNearestVillage(lng, lat);
  if (nearestMatch) {
    return { 
      villageName: nearestMatch.name, 
      method: 'nearest',
      distance: nearestMatch.distance 
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

async function runMigration() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔄 MIGRATION: Populate villageName for People Groups');
  console.log('═'.repeat(70));
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be saved to database');
  }
  if (FORCE_UPDATE) {
    console.log('⚠️  FORCE MODE - Will update even if villageName already exists');
  }
  
  // Load GeoJSON data
  loadGeoJSONData();
  
  if (!voronoiData && !pointsData) {
    console.error('\n❌ No GeoJSON data available. Cannot proceed with migration.');
    return;
  }
  
  // Connect to MongoDB
  console.log(`\n🔌 Connecting to MongoDB...`);
  console.log(`   URI: ${CONFIG.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  
  try {
    await mongoose.connect(CONFIG.mongoUri);
    console.log('   ✅ Connected to MongoDB\n');
    
    const PeopleGroup = mongoose.model('PeopleGroup', peopleGroupSchema);
    
    // Build query based on options
    const query = {};
    if (!FORCE_UPDATE) {
      // Only get people groups without villageName
      query.$or = [
        { villageName: { $exists: false } },
        { villageName: null },
        { villageName: '' }
      ];
    }
    
    // Get all people groups with coordinates
    const peopleGroups = await PeopleGroup.find({
      ...query,
      'location.coordinates': { $exists: true }
    });
    
    console.log(`📊 Found ${peopleGroups.length} people groups to process`);
    
    if (peopleGroups.length === 0) {
      console.log('\n✅ No people groups need updating.');
      return;
    }
    
    // Statistics
    const stats = {
      total: peopleGroups.length,
      updated: 0,
      skipped: 0,
      noMatch: 0,
      noCoordinates: 0,
      byMethod: {
        polygon: 0,
        nearest: 0
      }
    };
    
    console.log('\n' + '─'.repeat(70));
    console.log('Processing people groups...');
    console.log('─'.repeat(70) + '\n');
    
    for (let i = 0; i < peopleGroups.length; i++) {
      const pg = peopleGroups[i];
      const progress = `[${i + 1}/${peopleGroups.length}]`;
      
      // Check if coordinates exist
      if (!pg.location?.coordinates || pg.location.coordinates.length !== 2) {
        if (VERBOSE) {
          console.log(`${progress} ⏭️  ${pg.name}: No valid coordinates`);
        }
        stats.noCoordinates++;
        continue;
      }
      
      const [lng, lat] = pg.location.coordinates;
      
      // Skip if already has villageName (unless force mode)
      if (pg.villageName && !FORCE_UPDATE) {
        if (VERBOSE) {
          console.log(`${progress} ⏭️  ${pg.name}: Already has villageName "${pg.villageName}"`);
        }
        stats.skipped++;
        continue;
      }
      
      // Find village for coordinates
      const result = findVillageForCoordinates(lng, lat);
      
      if (!result) {
        console.log(`${progress} ❌ ${pg.name}: No village found for coordinates [${lng.toFixed(4)}, ${lat.toFixed(4)}]`);
        stats.noMatch++;
        continue;
      }
      
      const { villageName, method, distance } = result;
      
      // Log the match
      const distanceInfo = distance ? ` (${distance.toFixed(2)} km away)` : '';
      const methodInfo = method === 'polygon' ? '📍 polygon' : '📏 nearest';
      
      if (pg.villageName && FORCE_UPDATE) {
        console.log(`${progress} 🔄 ${pg.name}: "${pg.villageName}" → "${villageName}" [${methodInfo}]${distanceInfo}`);
      } else {
        console.log(`${progress} ✅ ${pg.name}: → "${villageName}" [${methodInfo}]${distanceInfo}`);
      }
      
      // Update the people group
      if (!DRY_RUN) {
        pg.villageName = villageName;
        await pg.save();
      }
      
      stats.updated++;
      stats.byMethod[method]++;
    }
    
    // Print summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(70));
    console.log(`   Total processed:     ${stats.total}`);
    console.log(`   Updated:             ${stats.updated}`);
    console.log(`   Skipped (existing):  ${stats.skipped}`);
    console.log(`   No match found:      ${stats.noMatch}`);
    console.log(`   No coordinates:      ${stats.noCoordinates}`);
    console.log('');
    console.log('   By method:');
    console.log(`     - Polygon match:   ${stats.byMethod.polygon}`);
    console.log(`     - Nearest match:   ${stats.byMethod.nearest}`);
    console.log('═'.repeat(70));
    
    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN - No changes were saved. Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MongoDB is running!');
    }
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN MIGRATION
// ═══════════════════════════════════════════════════════════════════════════

runMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
