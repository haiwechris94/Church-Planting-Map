/**
 * Script to grant admin role to a user
 * Usage: node scripts/grantAdminRole.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const TARGET_EMAIL = 'chrishaiwe@gmail.com';
const NEW_ROLE = 'admin'; // Can be 'admin' or 'supervisor'

async function grantAdminRole() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the user
    console.log(`\n🔍 Looking for user: ${TARGET_EMAIL}`);
    const user = await User.findOne({ email: TARGET_EMAIL });

    if (!user) {
      console.log(`❌ User not found: ${TARGET_EMAIL}`);
      console.log('\n📋 Available users:');
      const users = await User.find({}, 'email name role');
      users.forEach(u => {
        console.log(`   - ${u.email} (${u.name}) - Role: ${u.role}`);
      });
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Current role: ${user.role}`);

    // Update the role
    if (user.role === NEW_ROLE) {
      console.log(`\n⚠️  User already has ${NEW_ROLE} role. No changes needed.`);
    } else {
      const oldRole = user.role;
      user.role = NEW_ROLE;
      await user.save();
      console.log(`\n✅ Role updated successfully!`);
      console.log(`   ${oldRole} → ${NEW_ROLE}`);
    }

    // Verify the update
    const updatedUser = await User.findOne({ email: TARGET_EMAIL });
    console.log(`\n📋 User details after update:`);
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Is Active: ${updatedUser.isActive}`);
    console.log(`   Is Verified: ${updatedUser.isVerified}`);

    // Show permissions
    const permissions = {
      admin: ['read', 'write', 'delete', 'approve', 'export', 'manage-users', 'manage-org', 'analytics'],
      supervisor: ['read', 'write', 'delete', 'approve', 'export', 'analytics', 'manage-team'],
      missionary: ['read', 'write', 'export'],
      guest: ['read'],
    };
    console.log(`\n🔐 Permissions for ${NEW_ROLE}:`);
    console.log(`   ${permissions[NEW_ROLE].join(', ')}`);

    console.log('\n✅ Done! The user can now approve people groups.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

grantAdminRole();
