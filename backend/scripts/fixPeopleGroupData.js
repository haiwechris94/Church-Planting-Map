/**
 * Fix People Group Data Script
 * 
 * This script fixes people group records in MongoDB:
 * 1. Sets source='DMM' for all records where source is null/undefined
 * 2. Sets approved=true for all records where approved is not true
 * 
 * Usage: node backend/scripts/fixPeopleGroupData.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables (root directory is 2 levels up from backend/scripts)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function fixPeopleGroupData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔧 FIX PEOPLE GROUP DATA SCRIPT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('🔌 Connecting to MongoDB...');
  console.log(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Access the collection directly to avoid model validation issues
    const db = mongoose.connection.db;
    const collection = db.collection('peoplegroups');
    
    // ═══════════════════════════════════════════════════════════
    // BEFORE COUNTS
    // ═══════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 BEFORE FIX - Current State');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const totalCount = await collection.countDocuments({});
    console.log(`📋 Total people groups: ${totalCount}`);
    
    // Count records with null/undefined source
    const nullSourceCount = await collection.countDocuments({
      $or: [
        { source: null },
        { source: { $exists: false } }
      ]
    });
    console.log(`❌ Records with null/undefined source: ${nullSourceCount}`);
    
    // Count records with source='DMM'
    const dmmSourceCount = await collection.countDocuments({ source: 'DMM' });
    console.log(`✅ Records with source='DMM': ${dmmSourceCount}`);
    
    // Count records with approved not true
    const notApprovedCount = await collection.countDocuments({
      $or: [
        { approved: { $ne: true } },
        { approved: { $exists: false } }
      ]
    });
    console.log(`❌ Records with approved != true: ${notApprovedCount}`);
    
    // Count records with approved=true
    const approvedCount = await collection.countDocuments({ approved: true });
    console.log(`✅ Records with approved=true: ${approvedCount}`);
    
    console.log('');
    
    // ═══════════════════════════════════════════════════════════
    // FIX 1: Set source='DMM' where source is null/undefined
    // ═══════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔧 FIX 1: Setting source="DMM" for null/undefined sources');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const sourceUpdateResult = await collection.updateMany(
      {
        $or: [
          { source: null },
          { source: { $exists: false } }
        ]
      },
      {
        $set: { source: 'DMM' }
      }
    );
    
    console.log(`   Matched: ${sourceUpdateResult.matchedCount}`);
    console.log(`   Modified: ${sourceUpdateResult.modifiedCount}`);
    console.log('');
    
    // ═══════════════════════════════════════════════════════════
    // FIX 2: Set approved=true where approved is not true
    // ═══════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔧 FIX 2: Setting approved=true for non-approved records');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const approvedUpdateResult = await collection.updateMany(
      {
        $or: [
          { approved: { $ne: true } },
          { approved: { $exists: false } }
        ]
      },
      {
        $set: { 
          approved: true,
          approvedAt: new Date()
        }
      }
    );
    
    console.log(`   Matched: ${approvedUpdateResult.matchedCount}`);
    console.log(`   Modified: ${approvedUpdateResult.modifiedCount}`);
    console.log('');
    
    // ═══════════════════════════════════════════════════════════
    // AFTER COUNTS
    // ═══════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 AFTER FIX - Verification');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Verify source fix
    const nullSourceCountAfter = await collection.countDocuments({
      $or: [
        { source: null },
        { source: { $exists: false } }
      ]
    });
    const dmmSourceCountAfter = await collection.countDocuments({ source: 'DMM' });
    
    console.log(`📋 Records with null/undefined source: ${nullSourceCountAfter} (was ${nullSourceCount})`);
    console.log(`📋 Records with source='DMM': ${dmmSourceCountAfter} (was ${dmmSourceCount})`);
    
    // Verify approved fix
    const notApprovedCountAfter = await collection.countDocuments({
      $or: [
        { approved: { $ne: true } },
        { approved: { $exists: false } }
      ]
    });
    const approvedCountAfter = await collection.countDocuments({ approved: true });
    
    console.log(`📋 Records with approved != true: ${notApprovedCountAfter} (was ${notApprovedCount})`);
    console.log(`📋 Records with approved=true: ${approvedCountAfter} (was ${approvedCount})`);
    
    console.log('');
    
    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`   Source field fixes: ${sourceUpdateResult.modifiedCount} records updated`);
    console.log(`   Approved field fixes: ${approvedUpdateResult.modifiedCount} records updated`);
    console.log(`   Total records affected: ${Math.max(sourceUpdateResult.modifiedCount, approvedUpdateResult.modifiedCount)}`);
    
    if (nullSourceCountAfter === 0 && notApprovedCountAfter === 0) {
      console.log('\n🎉 All records have been successfully fixed!');
    } else {
      console.log('\n⚠️  Some records may still need attention.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MongoDB is running!');
      console.error('   Try: mongod --dbpath /path/to/data');
    }
    
    if (error.name === 'MongoServerError') {
      console.error('\n💡 MongoDB server error. Check your connection string and permissions.');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }
}

// Run the script
fixPeopleGroupData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
