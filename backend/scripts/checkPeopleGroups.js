/**
 * Database Debug Script - Check People Groups
 * 
 * This script connects to MongoDB and displays all people groups
 * with their village assignments and engagement statuses.
 * 
 * Usage: node backend/scripts/checkPeopleGroups.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables (root directory is 2 levels up from backend/scripts)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Define the schema inline to avoid model conflicts
const peopleGroupSchema = new mongoose.Schema({
  name: String,
  villageName: String,
  villageId: mongoose.Schema.Types.ObjectId,
  engagementStatus: String,
  engagementLevel: Number,
  population: Number,
  language: String,
  religion: String,
  description: String,
  location: {
    type: { type: String },
    coordinates: [Number]
  }
}, { timestamps: true });

async function checkPeopleGroups() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
  
  console.log('\n🔌 Connecting to MongoDB...');
  console.log(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    const PeopleGroup = mongoose.model('PeopleGroup', peopleGroupSchema);
    
    // Get all people groups
    const groups = await PeopleGroup.find({}).lean();
    
    console.log('═'.repeat(60));
    console.log(`📊 TOTAL PEOPLE GROUPS: ${groups.length}`);
    console.log('═'.repeat(60));
    
    if (groups.length === 0) {
      console.log('\n⚠️  No people groups found in database!');
      console.log('   You need to add people groups via the API or UI.\n');
    } else {
      console.log('\n📋 ALL PEOPLE GROUPS:\n');
      
      groups.forEach((g, index) => {
        console.log(`${index + 1}. ${g.name || 'UNNAMED'}`);
        console.log(`   📍 Village: ${g.villageName || '❌ NOT SET'}`);
        console.log(`   📊 Status: ${g.engagementStatus || '❌ NOT SET'}`);
        console.log(`   📈 Level: ${g.engagementLevel !== undefined ? g.engagementLevel : '❌ NOT SET'}`);
        console.log(`   👥 Population: ${g.population || 'Not specified'}`);
        console.log(`   🗣️  Language: ${g.language || 'Not specified'}`);
        console.log(`   🕌 Religion: ${g.religion || 'Not specified'}`);
        console.log(`   🆔 ID: ${g._id}`);
        console.log('');
      });
      
      // Group by village
      console.log('═'.repeat(60));
      console.log('📍 PEOPLE GROUPS BY VILLAGE');
      console.log('═'.repeat(60));
      
      const byVillage = {};
      const noVillage = [];
      
      groups.forEach(g => {
        if (g.villageName) {
          byVillage[g.villageName] = byVillage[g.villageName] || [];
          byVillage[g.villageName].push(g);
        } else {
          noVillage.push(g);
        }
      });
      
      const villageNames = Object.keys(byVillage).sort();
      
      if (villageNames.length > 0) {
        console.log('\n');
        villageNames.forEach(village => {
          const villageGroups = byVillage[village];
          console.log(`📍 ${village} (${villageGroups.length} people group${villageGroups.length > 1 ? 's' : ''}):`);
          villageGroups.forEach(g => {
            const statusEmoji = getStatusEmoji(g.engagementStatus);
            console.log(`   ${statusEmoji} ${g.name} - ${g.engagementStatus || 'No status'}`);
          });
          console.log('');
        });
      }
      
      if (noVillage.length > 0) {
        console.log('\n⚠️  PEOPLE GROUPS WITHOUT VILLAGE ASSIGNMENT:');
        noVillage.forEach(g => {
          console.log(`   - ${g.name} (ID: ${g._id})`);
        });
        console.log('');
      }
      
      // Check for expected people groups
      console.log('═'.repeat(60));
      console.log('🔍 CHECKING FOR EXPECTED PEOPLE GROUPS');
      console.log('═'.repeat(60));
      
      const expectedGroups = ['Toupouri', 'Moundang', 'Bana', 'Guiziga'];
      console.log('\n');
      
      expectedGroups.forEach(name => {
        const found = groups.find(g => 
          g.name && g.name.toLowerCase().includes(name.toLowerCase())
        );
        if (found) {
          console.log(`✅ ${name}: Found as "${found.name}" in ${found.villageName || 'NO VILLAGE'}`);
        } else {
          console.log(`❌ ${name}: NOT FOUND`);
        }
      });
      
      // Status distribution
      console.log('\n');
      console.log('═'.repeat(60));
      console.log('📊 STATUS DISTRIBUTION');
      console.log('═'.repeat(60));
      
      const statusCounts = {};
      groups.forEach(g => {
        const status = g.engagementStatus || 'No Status';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('\n');
      Object.keys(statusCounts).sort().forEach(status => {
        const emoji = getStatusEmoji(status);
        const count = statusCounts[status];
        const bar = '█'.repeat(Math.min(count * 2, 20));
        console.log(`${emoji} ${status.padEnd(20)} ${bar} ${count}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MongoDB is running!');
      console.error('   Try: mongod --dbpath /path/to/data');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }
}

function getStatusEmoji(status) {
  // Status values from the actual PeopleGroup model
  const statusMap = {
    'pioneer': '🔵',      // Blue - Pioneer stage
    'midway': '🟠',       // Orange - Mid-journey
    'tipping-point': '🟢', // Green - Tipping point
    'dmm': '🔴',          // Red - DMM/Movement
    'unreached': '⚪',
    'No Status': '⚪'
  };
  return statusMap[status] || '⚪';
}

// Run the script
checkPeopleGroups().catch(console.error);
