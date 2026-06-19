/**
 * MongoDB Index Creation Script
 * 
 * This script creates optimized indexes for the PeopleGroup collection.
 * Run this script after deploying to ensure all indexes are created.
 * 
 * Usage:
 *   node scripts/createIndexes.js
 *   npm run db:indexes
 * 
 * Features:
 * - Creates indexes in background (non-blocking)
 * - Checks existing indexes before creating
 * - Provides detailed logging
 * - Safe to run multiple times (idempotent)
 * 
 * @author Church Planting Map Team
 * @version 1.0.0
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Index definitions for PeopleGroup collection
const PEOPLE_GROUP_INDEXES = [
  // Geospatial index (required for $near, $geoWithin queries)
  { 
    key: { location: '2dsphere' }, 
    options: { name: 'location_2dsphere', background: true },
    description: 'Geospatial index for map queries'
  },
  
  // Single-field indexes for common filters
  { 
    key: { status: 1 }, 
    options: { name: 'status_1', background: true },
    description: 'DMM status filtering'
  },
  { 
    key: { countryCode: 1 }, 
    options: { name: 'countryCode_1', background: true },
    description: 'Country code filtering (ISO 3166-1 alpha-2)'
  },
  { 
    key: { country: 1 }, 
    options: { name: 'country_1', background: true },
    description: 'Country name filtering'
  },
  { 
    key: { approved: 1 }, 
    options: { name: 'approved_1', background: true },
    description: 'Approval status filtering'
  },
  { 
    key: { createdBy: 1 }, 
    options: { name: 'createdBy_1', background: true },
    description: 'Creator filtering'
  },
  { 
    key: { organizationTags: 1 }, 
    options: { name: 'organizationTags_1', background: true },
    description: 'Organization filtering'
  },
  { 
    key: { source: 1 }, 
    options: { name: 'source_1', background: true },
    description: 'Data source filtering (DMM, Joshua Project)'
  },
  { 
    key: { engagementStatus: 1 }, 
    options: { name: 'engagementStatus_1', background: true },
    description: 'Engagement status filtering'
  },
  
  // Compound indexes for common query patterns
  { 
    key: { countryCode: 1, status: 1 }, 
    options: { name: 'countryCode_status', background: true },
    description: 'Country + status compound query'
  },
  { 
    key: { country: 1, status: 1 }, 
    options: { name: 'country_status', background: true },
    description: 'Country name + status compound query'
  },
  { 
    key: { approved: 1, status: 1 }, 
    options: { name: 'approved_status', background: true },
    description: 'Approved + status (dashboard queries)'
  },
  { 
    key: { approved: 1, countryCode: 1 }, 
    options: { name: 'approved_countryCode', background: true },
    description: 'Approved + country (map filtering)'
  },
  { 
    key: { region: 1, country: 1 }, 
    options: { name: 'region_country', background: true },
    description: 'Regional filtering'
  },
  { 
    key: { admin2: 1 }, 
    options: { name: 'admin2_1', background: true },
    description: 'Department-level filtering'
  },
  { 
    key: { admin3: 1 }, 
    options: { name: 'admin3_1', background: true },
    description: 'Arrondissement-level filtering'
  },
  
  // Pagination indexes (sort + filter)
  { 
    key: { approved: 1, createdAt: -1 }, 
    options: { name: 'approved_createdAt_desc', background: true },
    description: 'Approved sorted by date (default list view)'
  },
  { 
    key: { countryCode: 1, createdAt: -1 }, 
    options: { name: 'countryCode_createdAt_desc', background: true },
    description: 'Country sorted by date'
  },
  
  // Text index for full-text search
  { 
    key: { name: 'text' }, 
    options: { 
      name: 'name_text_search', 
      background: true,
      default_language: 'english',
      weights: { name: 10 }
    },
    description: 'Full-text search on name field'
  },
  
  // Sparse indexes for optional fields
  { 
    key: { villageName: 1 }, 
    options: { name: 'villageName_sparse', background: true, sparse: true },
    description: 'Village name filtering (sparse)'
  },
  { 
    key: { village: 1 }, 
    options: { name: 'village_sparse', background: true, sparse: true },
    description: 'Village reference filtering (sparse)'
  }
];

/**
 * Create indexes for a collection
 * @param {Collection} collection - MongoDB collection
 * @param {Array} indexDefinitions - Array of index definitions
 */
async function createIndexes(collection, indexDefinitions) {
  console.log(`\n📊 Creating indexes for collection: ${collection.collectionName}`);
  console.log('═'.repeat(60));
  
  // Get existing indexes
  const existingIndexes = await collection.indexes();
  const existingIndexNames = new Set(existingIndexes.map(idx => idx.name));
  
  console.log(`📋 Existing indexes: ${existingIndexNames.size}`);
  existingIndexes.forEach(idx => {
    console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
  });
  
  console.log('\n🔨 Creating new indexes...\n');
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const indexDef of indexDefinitions) {
    const { key, options, description } = indexDef;
    
    // Check if index already exists
    if (existingIndexNames.has(options.name)) {
      console.log(`⏭️  SKIP: ${options.name} (already exists)`);
      skipped++;
      continue;
    }
    
    try {
      await collection.createIndex(key, options);
      console.log(`✅ CREATED: ${options.name}`);
      console.log(`   Description: ${description}`);
      console.log(`   Key: ${JSON.stringify(key)}`);
      created++;
    } catch (error) {
      console.log(`❌ FAILED: ${options.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Summary: ${created} created, ${skipped} skipped, ${failed} failed`);
  
  return { created, skipped, failed };
}

/**
 * Analyze index usage statistics
 * @param {Collection} collection - MongoDB collection
 */
async function analyzeIndexUsage(collection) {
  console.log(`\n📈 Index Usage Analysis for: ${collection.collectionName}`);
  console.log('═'.repeat(60));
  
  try {
    // Get index stats (requires MongoDB 3.2+)
    const stats = await collection.aggregate([
      { $indexStats: {} }
    ]).toArray();
    
    if (stats.length === 0) {
      console.log('No index statistics available yet.');
      return;
    }
    
    // Sort by access count (most used first)
    stats.sort((a, b) => (b.accesses?.ops || 0) - (a.accesses?.ops || 0));
    
    console.log('\nIndex usage (sorted by access count):');
    stats.forEach(stat => {
      const ops = stat.accesses?.ops || 0;
      const since = stat.accesses?.since ? new Date(stat.accesses.since).toISOString() : 'N/A';
      console.log(`   ${stat.name}: ${ops} operations (since ${since})`);
    });
    
    // Identify unused indexes (potential candidates for removal)
    const unusedIndexes = stats.filter(s => (s.accesses?.ops || 0) === 0 && s.name !== '_id_');
    if (unusedIndexes.length > 0) {
      console.log('\n⚠️  Potentially unused indexes (consider removing):');
      unusedIndexes.forEach(idx => {
        console.log(`   - ${idx.name}`);
      });
    }
  } catch (error) {
    console.log(`Could not analyze index usage: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 MongoDB Index Creation Script');
  console.log('═'.repeat(60));
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  
  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully');
    
    // Get the PeopleGroup collection
    const db = mongoose.connection.db;
    const collection = db.collection('peoplegroups');
    
    // Get collection stats
    const stats = await collection.stats();
    console.log(`\n📊 Collection stats:`);
    console.log(`   Documents: ${stats.count}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Avg document size: ${stats.avgObjSize} bytes`);
    
    // Create indexes
    const result = await createIndexes(collection, PEOPLE_GROUP_INDEXES);
    
    // Analyze index usage
    await analyzeIndexUsage(collection);
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Index creation completed successfully');
    console.log('═'.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
