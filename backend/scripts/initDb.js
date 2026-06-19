/**
 * Database Initialization Script
 * 
 * This script initializes the MongoDB database with:
 * - Required indexes
 * - Optional seed data for development
 * 
 * Usage:
 *   node scripts/initDb.js           # Initialize only
 *   node scripts/initDb.js --seed    # Initialize with seed data
 *   node scripts/initDb.js --drop    # Drop existing data and reinitialize
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const { User, Village, Church, Activity } = require('../models');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldSeed = args.includes('--seed');
const shouldDrop = args.includes('--drop');

// Seed data for development
const seedData = {
  users: [
    {
      name: 'Admin User',
      email: 'admin@churchplanting.org',
      password: 'admin123',
      organization: 'Church Planting Organization',
      role: 'admin',
    },
    {
      name: 'John Missionary',
      email: 'john@churchplanting.org',
      password: 'missionary123',
      organization: 'Church Planting Organization',
      role: 'missionary',
    },
    {
      name: 'Jane Viewer',
      email: 'jane@churchplanting.org',
      password: 'viewer123',
      organization: 'Partner Organization',
      role: 'viewer',
    },
  ],
  villages: [
    {
      name: 'Riverside Village',
      location: {
        type: 'Point',
        coordinates: [-73.935242, 40.730610], // [longitude, latitude]
      },
      population: 1500,
      status: 'unreached',
      description: 'A small village by the river with no church presence.',
      region: 'Northern Region',
      country: 'Sample Country',
    },
    {
      name: 'Mountain View',
      location: {
        type: 'Point',
        coordinates: [-122.083851, 37.386051],
      },
      population: 3200,
      status: 'in-progress',
      description: 'Church planting efforts have begun in this mountain community.',
      region: 'Western Region',
      country: 'Sample Country',
    },
    {
      name: 'Lakeside Town',
      location: {
        type: 'Point',
        coordinates: [-87.623177, 41.881832],
      },
      population: 5000,
      status: 'church-planted',
      description: 'A thriving community with an established church.',
      region: 'Central Region',
      country: 'Sample Country',
    },
  ],
};

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Drop existing data if requested
    if (shouldDrop) {
      console.log('🗑️  Dropping existing collections...');
      await Promise.all([
        User.deleteMany({}),
        Village.deleteMany({}),
        Church.deleteMany({}),
        Activity.deleteMany({}),
      ]);
      console.log('✅ Collections dropped\n');
    }

    // Ensure indexes are created
    console.log('📊 Creating indexes...');
    await Promise.all([
      User.createIndexes(),
      Village.createIndexes(),
      Church.createIndexes(),
      Activity.createIndexes(),
    ]);
    console.log('✅ Indexes created\n');

    // Seed data if requested
    if (shouldSeed) {
      console.log('🌱 Seeding database with sample data...\n');

      // Create users
      console.log('👥 Creating users...');
      const createdUsers = [];
      for (const userData of seedData.users) {
        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          const user = await User.create(userData);
          createdUsers.push(user);
          console.log(`   ✅ Created user: ${userData.email}`);
        } else {
          createdUsers.push(existingUser);
          console.log(`   ⏭️  User already exists: ${userData.email}`);
        }
      }

      // Create villages
      console.log('\n🏘️  Creating villages...');
      const createdVillages = [];
      for (const villageData of seedData.villages) {
        const existingVillage = await Village.findOne({ name: villageData.name });
        if (!existingVillage) {
          const village = await Village.create(villageData);
          createdVillages.push(village);
          console.log(`   ✅ Created village: ${villageData.name}`);
        } else {
          createdVillages.push(existingVillage);
          console.log(`   ⏭️  Village already exists: ${villageData.name}`);
        }
      }

      // Create a sample church in the "church-planted" village
      console.log('\n⛪ Creating sample church...');
      const lakesideVillage = createdVillages.find(v => v.name === 'Lakeside Town');
      if (lakesideVillage) {
        const existingChurch = await Church.findOne({ village: lakesideVillage._id });
        if (!existingChurch) {
          await Church.create({
            name: 'Lakeside Community Church',
            village: lakesideVillage._id,
            plantedDate: new Date('2023-06-15'),
            status: 'growing',
            description: 'A growing church serving the Lakeside community.',
            memberCount: 45,
            leader: 'Pastor Michael',
          });
          console.log('   ✅ Created church: Lakeside Community Church');
        } else {
          console.log('   ⏭️  Church already exists in Lakeside Town');
        }
      }

      // Create sample activities
      console.log('\n📝 Creating sample activities...');
      const missionary = createdUsers.find(u => u.role === 'missionary');
      const mountainVillage = createdVillages.find(v => v.name === 'Mountain View');
      
      if (missionary && mountainVillage) {
        const existingActivity = await Activity.findOne({ user: missionary._id });
        if (!existingActivity) {
          await Activity.create({
            type: 'visit',
            description: 'Initial visit to Mountain View village to assess church planting opportunities.',
            date: new Date(),
            user: missionary._id,
            village: mountainVillage._id,
            participants: 3,
            notes: 'Met with village leaders. Very receptive to our presence.',
          });
          console.log('   ✅ Created sample activity');
        } else {
          console.log('   ⏭️  Activities already exist');
        }
      }

      console.log('\n✅ Seeding complete!\n');
    }

    // Print summary
    console.log('📈 Database Summary:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Villages: ${await Village.countDocuments()}`);
    console.log(`   Churches: ${await Church.countDocuments()}`);
    console.log(`   Activities: ${await Activity.countDocuments()}`);

    console.log('\n✅ Database initialization complete!');

  } catch (error) {
    console.error('\n❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed.');
    process.exit(0);
  }
}

// Run initialization
initializeDatabase();
