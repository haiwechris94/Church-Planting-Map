/**
 * Migration Script: Set Default Country Field
 * 
 * This script updates existing records that don't have a country field
 * to default to 'Cameroon' for backward compatibility.
 * 
 * Run with: node backend/scripts/migrateCountryField.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const Village = require('../models/Village');
const People = require('../models/People');
const PeopleGroup = require('../models/PeopleGroup');
const Church = require('../models/Church');

const DEFAULT_COUNTRY = 'Cameroon';

async function migrateCountryField() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 Starting country field migration...\n');

    // Migrate Villages
    console.log('🏘️  Migrating Villages...');
    const villageResult = await Village.updateMany(
      { 
        $or: [
          { country: { $exists: false } },
          { country: null },
          { country: '' }
        ]
      },
      { $set: { country: DEFAULT_COUNTRY } }
    );
    console.log(`   Updated ${villageResult.modifiedCount} villages`);

    // Migrate People
    console.log('👥 Migrating People...');
    const peopleResult = await People.updateMany(
      { 
        $or: [
          { country: { $exists: false } },
          { country: null },
          { country: '' }
        ]
      },
      { $set: { country: DEFAULT_COUNTRY } }
    );
    console.log(`   Updated ${peopleResult.modifiedCount} people records`);

    // Migrate PeopleGroups
    console.log('👨‍👩‍👧‍👦 Migrating PeopleGroups...');
    const peopleGroupResult = await PeopleGroup.updateMany(
      { 
        $or: [
          { country: { $exists: false } },
          { country: null },
          { country: '' }
        ]
      },
      { $set: { country: DEFAULT_COUNTRY } }
    );
    console.log(`   Updated ${peopleGroupResult.modifiedCount} people groups`);

    // Migrate Churches
    console.log('⛪ Migrating Churches...');
    const churchResult = await Church.updateMany(
      { 
        $or: [
          { country: { $exists: false } },
          { country: null },
          { country: '' }
        ]
      },
      { $set: { country: DEFAULT_COUNTRY } }
    );
    console.log(`   Updated ${churchResult.modifiedCount} churches`);

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`   Villages:      ${villageResult.modifiedCount} updated`);
    console.log(`   People:        ${peopleResult.modifiedCount} updated`);
    console.log(`   PeopleGroups:  ${peopleGroupResult.modifiedCount} updated`);
    console.log(`   Churches:      ${churchResult.modifiedCount} updated`);
    console.log('═══════════════════════════════════════');
    console.log(`   Total:         ${
      villageResult.modifiedCount + 
      peopleResult.modifiedCount + 
      peopleGroupResult.modifiedCount + 
      churchResult.modifiedCount
    } records updated`);

    // Verify counts
    console.log('\n📊 Verification - Records by Country:');
    console.log('═══════════════════════════════════════');
    
    const villagesByCountry = await Village.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('\n   Villages:');
    villagesByCountry.forEach(c => {
      console.log(`      ${c._id || 'null'}: ${c.count}`);
    });

    const peopleGroupsByCountry = await PeopleGroup.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('\n   PeopleGroups:');
    peopleGroupsByCountry.forEach(c => {
      console.log(`      ${c._id || 'null'}: ${c.count}`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Migration completed successfully');
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run the migration
migrateCountryField();
