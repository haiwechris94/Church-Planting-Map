/**
 * Seed Test People Groups
 * 
 * This script creates test people groups with village names
 * that match the GeoJSON data for testing the village coloring feature.
 * 
 * Usage: node backend/scripts/seedTestPeopleGroups.js
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables (root directory is 2 levels up from backend/scripts)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Define the schema
const peopleGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  villageName: String,
  villageId: mongoose.Schema.Types.ObjectId,
  // Engagement status: pioneer, midway, tipping-point, dmm
  engagementStatus: {
    type: String,
    enum: ['pioneer', 'midway', 'tipping-point', 'dmm'],
    default: 'pioneer'
  },
  // Engagement level: I, II, III, IV
  engagementLevel: {
    type: String,
    enum: ['I', 'II', 'III', 'IV', ''],
    default: ''
  },
  population: Number,
  language: String,
  religion: String,
  description: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number]
  },
  createdBy: mongoose.Schema.Types.ObjectId,
  approved: { type: Boolean, default: true }
}, { timestamps: true });

// Test people groups with village names from the GeoJSON
// Using correct status values: pioneer, midway, tipping-point, dmm
// Village names are from the actual villages.geojson file
const testPeopleGroups = [
  {
    name: 'Toupouri',
    villageName: 'Mokolo',  // Actual village in GeoJSON
    engagementStatus: 'pioneer',
    engagementLevel: 'I',
    population: 150000,
    language: 'Toupouri',
    religion: 'Traditional',
    description: 'The Toupouri people live in the Far North region of Cameroon',
    location: { type: 'Point', coordinates: [13.8000, 10.7333] }
  },
  {
    name: 'Moundang',
    villageName: 'Garey Kaele',  // Actual village in GeoJSON
    engagementStatus: 'midway',
    engagementLevel: 'II',
    population: 200000,
    language: 'Moundang',
    religion: 'Islam/Traditional',
    description: 'The Moundang people are found in the Mayo-Kani department',
    location: { type: 'Point', coordinates: [14.4500, 10.1000] }
  },
  {
    name: 'Guiziga',
    villageName: 'Garoua Sambé',  // Actual village in GeoJSON
    engagementStatus: 'tipping-point',
    engagementLevel: 'III',
    population: 100000,
    language: 'Guiziga',
    religion: 'Traditional/Islam',
    description: 'The Guiziga people live in the Mandara Mountains area',
    location: { type: 'Point', coordinates: [13.4000, 9.3000] }
  },
  {
    name: 'Bana',
    villageName: 'Moraka',  // Actual village in GeoJSON (closest to Mora)
    engagementStatus: 'dmm',
    engagementLevel: 'IV',
    population: 50000,
    language: 'Bana',
    religion: 'Traditional',
    description: 'The Bana people are found near the Nigerian border',
    location: { type: 'Point', coordinates: [14.1500, 11.0500] }
  },
  {
    name: 'Fulani (Peul)',
    villageName: 'Garoua Winde',  // Actual village in GeoJSON
    engagementStatus: 'midway',
    engagementLevel: 'II',
    population: 500000,
    language: 'Fulfulde',
    religion: 'Islam',
    description: 'The Fulani are a large ethnic group spread across the Sahel',
    location: { type: 'Point', coordinates: [13.4000, 9.3000] }
  }
];

async function getVillageNamesFromGeoJSON() {
  const geoJsonPath = path.join(__dirname, '../../frontend/public/data/villages.geojson');
  
  if (!fs.existsSync(geoJsonPath)) {
    console.log('⚠️  GeoJSON file not found, using default village names');
    return null;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
    const names = data.features
      .map(f => f.properties?.name)
      .filter(Boolean);
    return [...new Set(names)];
  } catch (error) {
    console.log('⚠️  Error reading GeoJSON:', error.message);
    return null;
  }
}

async function seedPeopleGroups() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
  
  console.log('\n' + '═'.repeat(60));
  console.log('🌱 SEEDING TEST PEOPLE GROUPS');
  console.log('═'.repeat(60));
  
  console.log(`\n🔌 Connecting to MongoDB...`);
  console.log(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    const PeopleGroup = mongoose.model('PeopleGroup', peopleGroupSchema);
    
    // Get village names from GeoJSON
    const geoJsonVillages = await getVillageNamesFromGeoJSON();
    
    if (geoJsonVillages) {
      console.log(`📍 Found ${geoJsonVillages.length} villages in GeoJSON`);
      
      // Check if our test village names exist in GeoJSON
      console.log('\n🔍 Checking village name matches:\n');
      testPeopleGroups.forEach(pg => {
        const match = geoJsonVillages.find(v => 
          v.toLowerCase() === pg.villageName.toLowerCase()
        );
        if (match) {
          console.log(`   ✅ ${pg.villageName} → Found as "${match}"`);
          pg.villageName = match; // Use exact case from GeoJSON
        } else {
          // Try partial match
          const partial = geoJsonVillages.find(v => 
            v.toLowerCase().includes(pg.villageName.toLowerCase()) ||
            pg.villageName.toLowerCase().includes(v.toLowerCase())
          );
          if (partial) {
            console.log(`   ⚠️  ${pg.villageName} → Partial match: "${partial}"`);
            pg.villageName = partial;
          } else {
            console.log(`   ❌ ${pg.villageName} → No match found`);
          }
        }
      });
    }
    
    // Check existing people groups
    const existing = await PeopleGroup.find({});
    console.log(`\n📊 Existing people groups: ${existing.length}`);
    
    if (existing.length > 0) {
      console.log('\n📋 Current people groups:');
      existing.forEach(pg => {
        console.log(`   - ${pg.name} (${pg.villageName || 'No village'})`);
      });
      
      console.log('\n⚠️  People groups already exist.');
      console.log('   To reset, run: node backend/scripts/seedTestPeopleGroups.js --reset');
      
      if (process.argv.includes('--reset')) {
        console.log('\n🗑️  Deleting existing people groups...');
        await PeopleGroup.deleteMany({});
        console.log('✅ Deleted all existing people groups');
      } else {
        await mongoose.disconnect();
        return;
      }
    }
    
    // Insert test people groups
    console.log('\n📝 Creating test people groups...\n');
    
    for (const pg of testPeopleGroups) {
      const created = await PeopleGroup.create(pg);
      console.log(`   ✅ Created: ${created.name}`);
      console.log(`      Village: ${created.villageName}`);
      console.log(`      Status: ${created.engagementStatus}`);
      console.log('');
    }
    
    console.log('═'.repeat(60));
    console.log('✅ SEEDING COMPLETE');
    console.log('═'.repeat(60));
    
    // Verify
    const final = await PeopleGroup.find({});
    console.log(`\n📊 Total people groups: ${final.length}`);
    
    // Group by status
    const byStatus = {};
    final.forEach(pg => {
      byStatus[pg.engagementStatus] = (byStatus[pg.engagementStatus] || 0) + 1;
    });
    
    console.log('\n📈 By status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MongoDB is running!');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }
}

// Run the script
seedPeopleGroups().catch(console.error);
