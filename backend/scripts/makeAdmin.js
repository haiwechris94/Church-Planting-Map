/**
 * Script to make multiple users admins
 * 
 * Usage: node backend/scripts/makeAdmin.js
 */

const path = require('path');

// Try multiple .env locations
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../backend/.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    require('dotenv').config({ path: envPath });
    if (process.env.MONGODB_URI) {
      console.log(`✓ Loaded .env from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (e) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.log('⚠ No .env file found, using default MongoDB URI');
}

const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_EMAILS = [
  'chrishaiwe@gmail.com',
  'haiwechris94@gmail.com'
];

async function makeAdmin() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting';
  
  console.log(`\nConnecting to MongoDB...`);
  console.log(`URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');
    
    for (const email of ADMIN_EMAILS) {
      // Find and update the user
      const user = await User.findOneAndUpdate(
        { email: email },
        { role: 'admin' },
        { new: true }
      );
      
      if (user) {
        console.log('═══════════════════════════════════════════');
        console.log(`✅ SUCCESS: ${user.email} is now an admin`);
        console.log('═══════════════════════════════════════════');
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('═══════════════════════════════════════════\n');
      } else {
        console.log('═══════════════════════════════════════════');
        console.log(`❌ User not found: ${email}`);
        console.log('═══════════════════════════════════════════');
        console.log('   The user needs to register first.');
        console.log('   After registration, run this script again.\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

makeAdmin().catch(console.error);
