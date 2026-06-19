/**
 * Integrate Population Data Script
 * Downloads population data and updates all villages in the database
 * 
 * Usage: node scripts/integratePopulationData.js [--download] [--update] [--dry-run]
 * 
 * Options:
 *   --download  Download fresh data from HumData.org
 *   --update    Update villages in database
 *   --dry-run   Show what would be updated without making changes
 *   --verbose   Show detailed logging
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import services
const { downloadAllPopulationData } = require('./downloadPopulationData');
const demographicService = require('../services/demographicService');
const Village = require('../models/Village');

// Parse command line arguments
const args = process.argv.slice(2);
const OPTIONS = {
  download: args.includes('--download'),
  update: args.includes('--update'),
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help') || args.includes('-h')
};

// If no options specified, do both download and update
if (!OPTIONS.download && !OPTIONS.update && !OPTIONS.dryRun && !OPTIONS.help) {
  OPTIONS.download = true;
  OPTIONS.update = true;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Population Data Integration Script
===================================

Downloads population data from HumData.org and updates village records
in the database with demographic information.

Usage: node scripts/integratePopulationData.js [options]

Options:
  --download    Download fresh data from HumData.org
  --update      Update villages in database with population data
  --dry-run     Show what would be updated without making changes
  --verbose     Show detailed logging
  --help, -h    Show this help message

Examples:
  node scripts/integratePopulationData.js                    # Download and update
  node scripts/integratePopulationData.js --download         # Only download
  node scripts/integratePopulationData.js --update           # Only update (use existing data)
  node scripts/integratePopulationData.js --dry-run          # Preview changes
  node scripts/integratePopulationData.js --update --verbose # Update with detailed logs
`);
}

/**
 * Connect to MongoDB
 */
async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
  
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');
}

/**
 * Count villages per department for population estimation
 */
async function countVillagesPerDepartment() {
  const counts = await Village.aggregate([
    {
      $group: {
        _id: { 
          department: { $toLower: '$departement' },
          region: { $toLower: '$region' }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const map = new Map();
  for (const item of counts) {
    if (item._id.department) {
      const key = demographicService.normalizeAdminName(item._id.department);
      map.set(key, item.count);
    }
  }

  return map;
}

/**
 * Update villages with population data
 */
async function updateVillages(dryRun = false, verbose = false) {
  console.log('\n📊 Starting village population update...');
  
  // Load population data
  await demographicService.loadPopulationData();
  
  // Get all villages
  const villages = await Village.find({});
  console.log(`   Found ${villages.length} villages in database`);

  // Count villages per department for estimation
  const villagesPerDept = await countVillagesPerDepartment();
  console.log(`   Found ${villagesPerDept.size} unique departments`);

  const stats = {
    total: villages.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    noMapping: 0,
    alreadyHasPopulation: 0,
    bySource: {
      existing_field: 0,
      coordinates: 0,
      region_fallback: 0
    },
    byDepartment: new Map(),
    errors: []
  };

  // Process each village
  for (let i = 0; i < villages.length; i++) {
    const village = villages[i];
    
    if (verbose || (i + 1) % 100 === 0) {
      console.log(`   Processing ${i + 1}/${villages.length}: ${village.name}`);
    }

    try {
      // Get demographics for this village
      const demographics = await demographicService.getVillageDemographics(village);

      if (!demographics.mapped) {
        stats.noMapping++;
        if (verbose) {
          console.log(`     ⚠️ Could not map: ${demographics.error || 'Unknown reason'}`);
        }
        continue;
      }

      // Track by source
      if (demographics.source) {
        stats.bySource[demographics.source] = (stats.bySource[demographics.source] || 0) + 1;
      }

      // Track by department
      if (demographics.department) {
        const deptKey = demographics.department;
        stats.byDepartment.set(deptKey, (stats.byDepartment.get(deptKey) || 0) + 1);
      }

      // Calculate estimated population
      // First try department-level data, then fall back to region-level
      let populationSource = demographics.demographics?.totalPopulation || 0;
      let sourceLevel = 'department';
      
      // If no department population, try to get region population
      if (populationSource === 0 && demographics.region) {
        const regionData = demographicService.getRegionPopulation(demographics.region);
        if (regionData?.totalPopulation) {
          populationSource = regionData.totalPopulation;
          sourceLevel = 'region';
        }
      }
      
      // Count villages in the area for estimation
      const deptKey = demographicService.normalizeAdminName(demographics.department || '');
      const villageCount = villagesPerDept.get(deptKey) || 1;
      
      // For region-level data, use a larger divisor since regions have more villages
      // Estimate ~100 villages per region on average for Cameroon
      const divisor = sourceLevel === 'region' ? Math.max(villageCount * 10, 100) : villageCount;
      
      // Estimate village population
      // Apply a variance factor to make it more realistic (0.5 to 1.5)
      const baseEstimate = Math.round(populationSource / divisor);
      const varianceFactor = 0.5 + Math.random();
      const estimatedPopulation = Math.round(baseEstimate * varianceFactor);

      // Skip if village already has a non-zero population
      if (village.population > 0) {
        stats.alreadyHasPopulation++;
        if (verbose) {
          console.log(`     ℹ️ Already has population: ${village.population}`);
        }
        continue;
      }

      // Prepare update
      const updateData = {
        population: estimatedPopulation,
        // Update department and region if not set
        ...((!village.departement && demographics.department) && { departement: demographics.department }),
        ...((!village.region && demographics.region) && { region: demographics.region })
      };

      if (verbose) {
        console.log(`     📍 Department: ${demographics.department}, Region: ${demographics.region}`);
        console.log(`     👥 Estimated population: ${estimatedPopulation.toLocaleString()}`);
        console.log(`        (Source: ${sourceLevel}, Pop: ${populationSource.toLocaleString()}, Divisor: ${divisor})`);
      }

      if (dryRun) {
        console.log(`     [DRY RUN] Would update ${village.name}: population=${estimatedPopulation}`);
        stats.updated++;
      } else {
        await Village.findByIdAndUpdate(village._id, updateData);
        stats.updated++;
      }

    } catch (error) {
      stats.failed++;
      stats.errors.push({
        village: village.name,
        error: error.message
      });
      if (verbose) {
        console.error(`     ❌ Error: ${error.message}`);
      }
    }
  }

  return stats;
}

/**
 * Print summary statistics
 */
function printSummary(stats, dryRun) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 INTEGRATION SUMMARY');
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('⚠️  DRY RUN - No changes were made to the database\n');
  }

  console.log(`Total villages processed: ${stats.total}`);
  console.log(`✅ Updated with population: ${stats.updated}`);
  console.log(`ℹ️  Already had population: ${stats.alreadyHasPopulation}`);
  console.log(`⚠️  Could not map to department: ${stats.noMapping}`);
  console.log(`❌ Failed: ${stats.failed}`);

  console.log('\n📍 Mapping Sources:');
  for (const [source, count] of Object.entries(stats.bySource)) {
    if (count > 0) {
      console.log(`   ${source}: ${count}`);
    }
  }

  console.log('\n🏛️ Top Departments by Village Count:');
  const sortedDepts = [...stats.byDepartment.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [dept, count] of sortedDepts) {
    console.log(`   ${dept}: ${count} villages`);
  }

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const err of stats.errors.slice(0, 10)) {
      console.log(`   ${err.village}: ${err.error}`);
    }
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }

  // Success rate
  const successRate = ((stats.updated + stats.alreadyHasPopulation) / stats.total * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);
}

/**
 * Main integration function
 */
async function main() {
  if (OPTIONS.help) {
    printHelp();
    return;
  }

  console.log('🚀 Population Data Integration Script');
  console.log('=====================================\n');

  try {
    // Step 1: Download data if requested
    if (OPTIONS.download) {
      console.log('📥 Step 1: Downloading population data...\n');
      const downloadResults = await downloadAllPopulationData();
      
      if (downloadResults.failed.length > 0 && downloadResults.success.length === 0) {
        console.error('\n❌ All downloads failed. Cannot proceed with update.');
        process.exit(1);
      }
    } else {
      console.log('⏭️  Skipping download (use --download to fetch fresh data)\n');
    }

    // Step 2: Update villages if requested
    if (OPTIONS.update || OPTIONS.dryRun) {
      console.log('\n📊 Step 2: Updating village population data...\n');
      
      // Connect to database
      await connectDB();
      
      // Run update
      const stats = await updateVillages(OPTIONS.dryRun, OPTIONS.verbose);
      
      // Print summary
      printSummary(stats, OPTIONS.dryRun);
      
      // Disconnect
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }

    console.log('\n✅ Integration complete!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { updateVillages, countVillagesPerDepartment };
