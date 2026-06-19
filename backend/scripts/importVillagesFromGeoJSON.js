/**
 * Village Import Script
 * 
 * This script imports villages from a GeoJSON file into MongoDB.
 * It handles duplicates, shows progress, and provides a summary.
 * 
 * Usage: node scripts/importVillagesFromGeoJSON.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Village Schema (matching models/Village.js)
const villageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon', 'Point'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  osmId: {
    type: String,
    sparse: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Create geospatial indexes
villageSchema.index({ location: '2dsphere' });
villageSchema.index({ boundary: '2dsphere' });
villageSchema.index({ name: 1 });

const Village = mongoose.model('Village', villageSchema);

// Configuration
const BATCH_SIZE = 500;
const GEOJSON_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'villages.geojson');

// Statistics
const stats = {
  total: 0,
  imported: 0,
  skipped: 0,
  errors: 0,
  errorDetails: []
};

/**
 * Calculate centroid from geometry
 */
function calculateCentroid(geometry) {
  if (geometry.type === 'Point') {
    return geometry.coordinates;
  }
  
  let coords = [];
  
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0]; // Outer ring
  } else if (geometry.type === 'MultiPolygon') {
    // Use first polygon's outer ring
    coords = geometry.coordinates[0][0];
  }
  
  if (coords.length === 0) {
    return [0, 0];
  }
  
  // Calculate centroid
  let sumLng = 0, sumLat = 0;
  for (const coord of coords) {
    sumLng += coord[0];
    sumLat += coord[1];
  }
  
  return [sumLng / coords.length, sumLat / coords.length];
}

/**
 * Transform GeoJSON feature to Village document
 */
function transformFeature(feature) {
  const { properties, geometry } = feature;
  
  // Extract name (try different property names)
  const name = properties.name || 
               properties.NAME || 
               properties.village_name || 
               properties.title ||
               `Village_${properties.osm_id || properties.id || 'unknown'}`;
  
  // Extract OSM ID
  const osmId = properties.osm_id || 
                properties.osmId || 
                properties['@id'] || 
                properties.id?.toString();
  
  // Calculate centroid for location
  const centroid = calculateCentroid(geometry);
  
  // Build metadata from remaining properties
  const excludeKeys = ['name', 'NAME', 'village_name', 'title', 'osm_id', 'osmId', '@id', 'id'];
  const metadata = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!excludeKeys.includes(key) && value !== null && value !== undefined) {
      metadata[key] = value;
    }
  }
  
  return {
    name,
    location: {
      type: 'Point',
      coordinates: centroid
    },
    boundary: geometry,
    osmId: osmId || undefined,
    metadata
  };
}

/**
 * Check for existing villages
 */
async function getExistingVillages(villages) {
  const names = villages.map(v => v.name);
  const osmIds = villages.filter(v => v.osmId).map(v => v.osmId);
  
  const existing = await Village.find({
    $or: [
      { name: { $in: names } },
      { osmId: { $in: osmIds } }
    ]
  }).select('name osmId').lean();
  
  const existingNames = new Set(existing.map(v => v.name));
  const existingOsmIds = new Set(existing.filter(v => v.osmId).map(v => v.osmId));
  
  return { existingNames, existingOsmIds };
}

/**
 * Process a batch of features
 */
async function processBatch(features, batchNumber, totalBatches) {
  const villages = features.map(transformFeature);
  
  // Check for existing villages
  const { existingNames, existingOsmIds } = await getExistingVillages(villages);
  
  // Filter out duplicates
  const newVillages = villages.filter(village => {
    const isDuplicate = existingNames.has(village.name) || 
                       (village.osmId && existingOsmIds.has(village.osmId));
    if (isDuplicate) {
      stats.skipped++;
    }
    return !isDuplicate;
  });
  
  if (newVillages.length === 0) {
    return;
  }
  
  try {
    // Use insertMany with ordered: false to continue on errors
    const result = await Village.insertMany(newVillages, { 
      ordered: false,
      rawResult: true 
    });
    
    stats.imported += result.insertedCount || newVillages.length;
  } catch (error) {
    if (error.writeErrors) {
      // Some documents failed, some succeeded
      const successCount = newVillages.length - error.writeErrors.length;
      stats.imported += successCount;
      stats.errors += error.writeErrors.length;
      
      error.writeErrors.slice(0, 3).forEach(err => {
        stats.errorDetails.push(err.errmsg || err.message);
      });
    } else {
      // Complete failure
      stats.errors += newVillages.length;
      stats.errorDetails.push(error.message);
    }
  }
}

/**
 * Main import function
 */
async function importVillages() {
  console.log('='.repeat(60));
  console.log('Village Import Script');
  console.log('='.repeat(60));
  
  // Check if GeoJSON file exists
  if (!fs.existsSync(GEOJSON_PATH)) {
    console.error(`\n❌ Error: GeoJSON file not found at:\n   ${GEOJSON_PATH}`);
    process.exit(1);
  }
  
  // Connect to MongoDB
  console.log('\n📡 Connecting to MongoDB...');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
  
  // Read and parse GeoJSON
  console.log('\n📂 Reading GeoJSON file...');
  let geojson;
  try {
    const fileContent = fs.readFileSync(GEOJSON_PATH, 'utf8');
    geojson = JSON.parse(fileContent);
    console.log('✅ GeoJSON file parsed successfully');
  } catch (error) {
    console.error('❌ Failed to read/parse GeoJSON:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
  
  // Validate GeoJSON structure
  if (!geojson.features || !Array.isArray(geojson.features)) {
    console.error('❌ Invalid GeoJSON: missing features array');
    await mongoose.connection.close();
    process.exit(1);
  }
  
  const features = geojson.features;
  stats.total = features.length;
  console.log(`\n📊 Found ${stats.total} features to process`);
  
  // Process in batches
  console.log('\n🚀 Starting import...\n');
  const totalBatches = Math.ceil(features.length / BATCH_SIZE);
  const startTime = Date.now();
  
  for (let i = 0; i < features.length; i += BATCH_SIZE) {
    const batch = features.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    
    await processBatch(batch, batchNumber, totalBatches);
    
    // Log progress
    const processed = Math.min(i + BATCH_SIZE, features.length);
    const percentage = ((processed / features.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    process.stdout.write(
      `\r   Imported ${stats.imported}/${stats.total} villages... ` +
      `(${percentage}% complete, ${elapsed}s elapsed)`
    );
  }
  
  // Final summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n\n' + '='.repeat(60));
  console.log('Import Summary');
  console.log('='.repeat(60));
  console.log(`   Total features:    ${stats.total}`);
  console.log(`   ✅ Imported:       ${stats.imported}`);
  console.log(`   ⏭️  Skipped (dups): ${stats.skipped}`);
  console.log(`   ❌ Errors:         ${stats.errors}`);
  console.log(`   ⏱️  Time elapsed:   ${totalTime}s`);
  
  if (stats.errorDetails.length > 0) {
    console.log('\n   Error details (first 3):');
    stats.errorDetails.slice(0, 3).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
  }
  
  console.log('='.repeat(60));
  
  // Close connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  console.log('🎉 Import complete!\n');
}

// Run the import
importVillages().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  mongoose.connection.close().finally(() => process.exit(1));
});
