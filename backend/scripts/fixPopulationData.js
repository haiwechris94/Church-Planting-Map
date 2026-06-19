/**
 * Fix Population Data Script
 * 
 * This script checks and fixes population data for villages in the database.
 * It forces an update of population data even for villages that have population = 0.
 * 
 * Usage: node scripts/fixPopulationData.js [--dry-run] [--verbose]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Village = require('../models/Village');
const demographicService = require('../services/demographicService');

// Parse command line arguments
const args = process.argv.slice(2);
const OPTIONS = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  force: args.includes('--force'), // Force update even if population > 0
};

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
 * Main function to fix population data
 */
async function fixPopulationData() {
  console.log('🚀 Fix Population Data Script');
  console.log('==============================\n');

  if (OPTIONS.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Connect to database
    await connectDB();

    // Load population data
    console.log('📊 Loading population data...');
    await demographicService.loadPopulationData();

    // Get all villages
    const villages = await Village.find({});
    console.log(`📍 Found ${villages.length} villages in database\n`);

    // Count villages per department
    const villagesPerDept = await countVillagesPerDepartment();

    // Check current population status
    const withPopulation = villages.filter(v => v.population > 0);
    const withoutPopulation = villages.filter(v => !v.population || v.population === 0);

    console.log('📊 Current Status:');
    console.log(`   Villages with population > 0: ${withPopulation.length}`);
    console.log(`   Villages with population = 0: ${withoutPopulation.length}`);
    console.log('');

    // Sample some villages to check
    console.log('📋 Sample villages (first 5):');
    villages.slice(0, 5).forEach(v => {
      console.log(`   - ${v.name}: population=${v.population}, region=${v.region}, dept=${v.departement}`);
    });
    console.log('');

    // Process villages that need population update
    const toUpdate = OPTIONS.force ? villages : withoutPopulation;
    console.log(`🔄 Processing ${toUpdate.length} villages...\n`);

    const stats = {
      updated: 0,
      skipped: 0,
      failed: 0,
      noMapping: 0,
    };

    for (let i = 0; i < toUpdate.length; i++) {
      const village = toUpdate[i];

      if (OPTIONS.verbose || (i + 1) % 100 === 0) {
        console.log(`   Processing ${i + 1}/${toUpdate.length}: ${village.name}`);
      }

      try {
        // Get demographics for this village
        const demographics = await demographicService.getVillageDemographics(village);

        if (!demographics.mapped) {
          stats.noMapping++;
          if (OPTIONS.verbose) {
            console.log(`     ⚠️ Could not map: ${demographics.error || 'Unknown reason'}`);
          }
          continue;
        }

        // Calculate estimated population
        let populationSource = demographics.demographics?.totalPopulation || 0;
        let sourceLevel = 'department';

        // If no department population, try region
        if (populationSource === 0 && demographics.region) {
          const regionData = demographicService.getRegionPopulation(demographics.region);
          if (regionData?.totalPopulation) {
            populationSource = regionData.totalPopulation;
            sourceLevel = 'region';
          }
        }

        // Count villages in the area
        const deptKey = demographicService.normalizeAdminName(demographics.department || '');
        const villageCount = villagesPerDept.get(deptKey) || 1;
        const divisor = sourceLevel === 'region' ? Math.max(villageCount * 10, 100) : villageCount;

        // Estimate village population with variance
        const baseEstimate = Math.round(populationSource / divisor);
        const varianceFactor = 0.5 + Math.random();
        const estimatedPopulation = Math.round(baseEstimate * varianceFactor);

        // Ensure minimum population of 100 for mapped villages
        const finalPopulation = Math.max(estimatedPopulation, 100);

        if (OPTIONS.verbose) {
          console.log(`     📍 Department: ${demographics.department}, Region: ${demographics.region}`);
          console.log(`     👥 Estimated population: ${finalPopulation.toLocaleString()}`);
        }

        if (OPTIONS.dryRun) {
          console.log(`     [DRY RUN] Would update ${village.name}: population=${finalPopulation}`);
          stats.updated++;
        } else {
          await Village.findByIdAndUpdate(village._id, {
            population: finalPopulation,
            ...((!village.departement && demographics.department) && { departement: demographics.department }),
            ...((!village.region && demographics.region) && { region: demographics.region })
          });
          stats.updated++;
        }

      } catch (error) {
        stats.failed++;
        if (OPTIONS.verbose) {
          console.error(`     ❌ Error: ${error.message}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total processed: ${toUpdate.length}`);
    console.log(`✅ Updated: ${stats.updated}`);
    console.log(`⚠️ No mapping: ${stats.noMapping}`);
    console.log(`❌ Failed: ${stats.failed}`);

    // Verify the fix
    if (!OPTIONS.dryRun) {
      const afterFix = await Village.find({ population: { $gt: 0 } }).countDocuments();
      console.log(`\n📈 Villages with population > 0 after fix: ${afterFix}`);
    }

    // Disconnect
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✅ Done!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixPopulationData();
}

module.exports = { fixPopulationData };
