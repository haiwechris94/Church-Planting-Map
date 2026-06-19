/**
 * Migration Script: Migrate People Groups to Survey Source
 * 
 * This script migrates existing people groups:
 * - All people groups NOT from 'Joshua Project' source -> 'Survey' source
 * - EXCEPT those created by chrishaiwe@gmail.com which should be 'DMM' source
 * 
 * Run with: node backend/scripts/migrateSurveySource.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const PeopleGroup = require('../models/PeopleGroup');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting';
const DMM_USER_EMAIL = 'chrishaiwe@gmail.com';

async function migrate() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Migration: Update People Group Sources to Survey');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');
    
    // Find the DMM user (chrishaiwe@gmail.com)
    const dmmUser = await User.findOne({ email: DMM_USER_EMAIL });
    if (dmmUser) {
      console.log(`✅ Found DMM user: ${dmmUser.name} (${dmmUser.email})`);
      console.log(`   User ID: ${dmmUser._id}`);
    } else {
      console.log(`⚠️  DMM user (${DMM_USER_EMAIL}) not found in database`);
      console.log('   All non-Joshua Project records will be migrated to Survey');
    }
    console.log('');
    
    // Get current statistics
    console.log('📊 Current Source Distribution:');
    const currentStats = await PeopleGroup.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    currentStats.forEach(stat => {
      console.log(`   ${stat._id || 'null/undefined'}: ${stat.count}`);
    });
    console.log('');
    
    // Count records to be migrated
    const nonJPQuery = { source: { $ne: 'Joshua Project' } };
    const totalNonJP = await PeopleGroup.countDocuments(nonJPQuery);
    console.log(`📋 Total non-Joshua Project records: ${totalNonJP}`);
    
    let dmmUserRecords = 0;
    if (dmmUser) {
      dmmUserRecords = await PeopleGroup.countDocuments({
        ...nonJPQuery,
        createdBy: dmmUser._id
      });
      console.log(`   - Created by ${DMM_USER_EMAIL}: ${dmmUserRecords} (will become DMM)`);
      console.log(`   - Created by others: ${totalNonJP - dmmUserRecords} (will become Survey)`);
    }
    console.log('');
    
    // Perform migration
    console.log('🔄 Starting migration...');
    console.log('');
    
    // Step 1: Migrate all non-Joshua Project records to Survey
    console.log('Step 1: Migrating all non-Joshua Project records to Survey...');
    const surveyResult = await PeopleGroup.updateMany(
      { source: { $ne: 'Joshua Project' } },
      { $set: { source: 'Survey' } }
    );
    console.log(`   ✅ Updated ${surveyResult.modifiedCount} records to Survey`);
    
    // Step 2: Update records created by DMM user back to DMM
    if (dmmUser) {
      console.log('');
      console.log(`Step 2: Updating records created by ${DMM_USER_EMAIL} to DMM...`);
      const dmmResult = await PeopleGroup.updateMany(
        { 
          createdBy: dmmUser._id,
          source: { $ne: 'Joshua Project' }
        },
        { $set: { source: 'DMM' } }
      );
      console.log(`   ✅ Updated ${dmmResult.modifiedCount} records to DMM`);
    }
    
    console.log('');
    
    // Get final statistics
    console.log('📊 Final Source Distribution:');
    const finalStats = await PeopleGroup.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    finalStats.forEach(stat => {
      console.log(`   ${stat._id || 'null/undefined'}: ${stat.count}`);
    });
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Migration completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run migration
migrate();
