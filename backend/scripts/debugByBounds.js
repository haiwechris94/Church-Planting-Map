/**
 * Debug Script for by-bounds endpoint
 * Run with: node backend/scripts/debugByBounds.js
 * 
 * This script diagnoses why the by-bounds endpoint returns 0 results
 */
require('dotenv').config();
const mongoose = require('mongoose');
const PeopleGroup = require('../models/PeopleGroup');

async function debugByBounds() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test bounds (Africa)
    const bounds = {
      north: 36,
      south: -23,
      east: 57,
      west: -32
    };

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 DATABASE DIAGNOSTICS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. Total count
    const totalCount = await PeopleGroup.countDocuments();
    console.log(`1. Total PeopleGroup records: ${totalCount}`);

    // 2. Approved count
    const approvedCount = await PeopleGroup.countDocuments({ approved: true });
    console.log(`2. Approved records: ${approvedCount}`);

    // 3. Source distribution
    console.log('\n3. Source field distribution:');
    const sourceCounts = await PeopleGroup.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    if (sourceCounts.length === 0) {
      console.log('   ⚠️  No source values found (all records have null/undefined source)');
    } else {
      sourceCounts.forEach(s => {
        console.log(`   - "${s._id || 'null/undefined'}": ${s.count} records`);
      });
    }

    // 4. Source distribution for approved records only
    console.log('\n4. Source distribution (approved only):');
    const approvedSourceCounts = await PeopleGroup.aggregate([
      { $match: { approved: true } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    if (approvedSourceCounts.length === 0) {
      console.log('   ⚠️  No approved records with source values');
    } else {
      approvedSourceCounts.forEach(s => {
        console.log(`   - "${s._id || 'null/undefined'}": ${s.count} records`);
      });
    }

    // 5. Check for records with valid location
    const withLocation = await PeopleGroup.countDocuments({
      'location.coordinates': { $exists: true, $ne: null }
    });
    console.log(`\n5. Records with valid location: ${withLocation}`);

    // 6. Check geospatial index
    console.log('\n6. Checking indexes on PeopleGroup collection:');
    const indexes = await PeopleGroup.collection.indexes();
    const geoIndex = indexes.find(idx => 
      Object.keys(idx.key).some(k => k === 'location' && idx.key[k] === '2dsphere')
    );
    if (geoIndex) {
      console.log('   ✅ 2dsphere index exists on location field');
    } else {
      console.log('   ⚠️  No 2dsphere index found on location field!');
      console.log('   Available indexes:', indexes.map(i => JSON.stringify(i.key)).join(', '));
    }

    // 7. Test geospatial query
    console.log('\n7. Testing geospatial query with bounds:');
    console.log(`   Bounds: N:${bounds.north}, S:${bounds.south}, E:${bounds.east}, W:${bounds.west}`);
    
    const geoQuery = {
      location: {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: [[
              [bounds.west, bounds.south],
              [bounds.east, bounds.south],
              [bounds.east, bounds.north],
              [bounds.west, bounds.north],
              [bounds.west, bounds.south]
            ]]
          }
        }
      }
    };

    const withinBounds = await PeopleGroup.countDocuments(geoQuery);
    console.log(`   Records within bounds (no filters): ${withinBounds}`);

    const withinBoundsApproved = await PeopleGroup.countDocuments({
      ...geoQuery,
      approved: true
    });
    console.log(`   Records within bounds (approved only): ${withinBoundsApproved}`);

    const withinBoundsDMM = await PeopleGroup.countDocuments({
      ...geoQuery,
      approved: true,
      source: 'DMM'
    });
    console.log(`   Records within bounds (approved + source='DMM'): ${withinBoundsDMM}`);

    // 8. Sample records
    console.log('\n8. Sample records (first 5):');
    const samples = await PeopleGroup.find()
      .select('name source approved location.coordinates')
      .limit(5)
      .lean();
    
    samples.forEach((s, i) => {
      console.log(`   ${i + 1}. "${s.name}"`);
      console.log(`      - source: "${s.source || 'undefined'}"`);
      console.log(`      - approved: ${s.approved}`);
      console.log(`      - coordinates: ${JSON.stringify(s.location?.coordinates)}`);
    });

    // 9. Check if any records have source='DMM'
    const dmmCount = await PeopleGroup.countDocuments({ source: 'DMM' });
    console.log(`\n9. Records with source='DMM': ${dmmCount}`);

    // 10. Recommendations
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (approvedCount === 0) {
      console.log('❌ ISSUE: No approved records found!');
      console.log('   FIX: Run this to approve all records:');
      console.log('   db.peoplegroups.updateMany({}, { $set: { approved: true } })');
    }

    if (dmmCount === 0 && totalCount > 0) {
      console.log('❌ ISSUE: No records have source="DMM"!');
      console.log('   FIX: Update existing records to have source="DMM":');
      console.log('   db.peoplegroups.updateMany({ source: { $exists: false } }, { $set: { source: "DMM" } })');
      console.log('   OR');
      console.log('   db.peoplegroups.updateMany({ source: null }, { $set: { source: "DMM" } })');
    }

    if (!geoIndex) {
      console.log('❌ ISSUE: Missing 2dsphere index on location field!');
      console.log('   FIX: Create the index:');
      console.log('   db.peoplegroups.createIndex({ location: "2dsphere" })');
    }

    if (withinBounds === 0 && totalCount > 0) {
      console.log('❌ ISSUE: No records fall within the test bounds!');
      console.log('   This could mean coordinates are stored incorrectly.');
      console.log('   Check that coordinates are [longitude, latitude] not [latitude, longitude]');
    }

    console.log('\n✅ Debug complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugByBounds();
