/**
 * Fix Joshua Project Village Names Migration Script
 * 
 * This script fixes the incorrect villageName field in Joshua Project people groups.
 * 
 * PROBLEM:
 * Joshua Project data was incorrectly setting villageName to the people group name
 * (e.g., "Fulani" instead of an actual village name). This caused village status
 * calculations to fail because:
 * 1. Joshua Project peoples created fake "villages" named after people groups
 * 2. Real villages couldn't find their associated Joshua Project peoples
 * 3. Village statuses showed "Pas d'information" even when peoples existed
 * 
 * SOLUTION:
 * Set villageName to empty string for all Joshua Project peoples.
 * Village status calculations will then use spatial queries to match
 * Joshua Project peoples to villages based on coordinates.
 * 
 * Usage: node scripts/fixJoshuaProjectVillageNames.js [--dry-run]
 * 
 * Options:
 *   --dry-run  Preview changes without saving to database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PeopleGroup = require('../models/PeopleGroup');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

async function fixJoshuaProjectVillageNames() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Fix Joshua Project Village Names Migration');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE MIGRATION'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Count affected records
    const affectedCount = await PeopleGroup.countDocuments({
      source: 'Joshua Project',
      villageName: { $exists: true, $ne: '', $ne: null }
    });

    console.log(`📊 Found ${affectedCount} Joshua Project peoples with non-empty villageName\n`);

    if (affectedCount === 0) {
      console.log('✅ No records need to be fixed. Migration complete.');
      return;
    }

    // Show sample of affected records
    console.log('📋 Sample of affected records:');
    const sampleRecords = await PeopleGroup.find({
      source: 'Joshua Project',
      villageName: { $exists: true, $ne: '', $ne: null }
    })
    .select('name villageName country')
    .limit(10)
    .lean();

    sampleRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. "${record.name}" - villageName: "${record.villageName}" (${record.country})`);
    });
    console.log('');

    if (isDryRun) {
      console.log('⚠️  DRY RUN - No changes will be made');
      console.log(`   Would update ${affectedCount} records to set villageName = ""`);
    } else {
      console.log('🔄 Updating records...');
      
      const result = await PeopleGroup.updateMany(
        {
          source: 'Joshua Project',
          villageName: { $exists: true, $ne: '', $ne: null }
        },
        {
          $set: { villageName: '' }
        }
      );

      console.log(`✅ Updated ${result.modifiedCount} records`);
      console.log(`   Matched: ${result.matchedCount}`);
      console.log(`   Modified: ${result.modifiedCount}`);
    }

    // Verify the fix
    console.log('\n📊 Verification:');
    const remainingCount = await PeopleGroup.countDocuments({
      source: 'Joshua Project',
      villageName: { $exists: true, $ne: '', $ne: null }
    });
    console.log(`   Joshua Project peoples with non-empty villageName: ${remainingCount}`);

    const totalJP = await PeopleGroup.countDocuments({ source: 'Joshua Project' });
    console.log(`   Total Joshua Project peoples: ${totalJP}`);

    const dmmPeoplesWithVillage = await PeopleGroup.countDocuments({
      source: { $ne: 'Joshua Project' },
      villageName: { $exists: true, $ne: '', $ne: null }
    });
    console.log(`   DMM peoples with villageName: ${dmmPeoplesWithVillage}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the backend server to apply changes');
    console.log('   2. Refresh the map view to see updated village statuses');
    console.log('   3. Village statuses will now be calculated from DMM peoples only');
    console.log('      (Joshua Project peoples will be matched via spatial queries)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
fixJoshuaProjectVillageNames();
