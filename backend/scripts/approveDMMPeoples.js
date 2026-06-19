/**
 * Migration Script: Approve existing DMM people groups
 *
 * Context:
 * - People groups created before the approval workflow was set up have approved: false
 * - The main GET / route returns them, but /by-bounds and stats routes filter by approved: true
 * - This causes DMM people groups to be invisible on the React Leaflet map
 *
 * This script:
 * 1. Shows current approval stats by source
 * 2. Approves all people groups with source DMM, manual, or null/undefined
 * 3. Shows final stats
 *
 * Run with: node backend/scripts/approveDMMPeoples.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PeopleGroup = require('../models/PeopleGroup');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting';

async function migrate() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Migration: Approve existing DMM People Groups');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // --- Current stats ---
    console.log('📊 Current approval status by source:');
    const currentStats = await PeopleGroup.aggregate([
      {
        $group: {
          _id: { source: '$source', approved: '$approved' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.source': 1, '_id.approved': 1 } }
    ]);
    currentStats.forEach(s => {
      const src = s._id.source || 'null/undefined';
      const appr = s._id.approved === true ? 'approved' : (s._id.approved === false ? 'not approved' : 'no flag');
      console.log(`   source="${src}" | ${appr} : ${s.count}`);
    });
    console.log('');

    // --- Count targets ---
    const targetQuery = {
      approved: { $ne: true },
      $or: [
        { source: 'DMM' },
        { source: 'manual' },
        { source: null },
        { source: { $exists: false } }
      ]
    };
    const targetCount = await PeopleGroup.countDocuments(targetQuery);
    console.log(`📋 People groups to approve (DMM / manual / null source, not yet approved): ${targetCount}`);
    console.log('');

    if (targetCount === 0) {
      console.log('✅ Nothing to do — all DMM people groups are already approved.');
    } else {
      console.log('🔄 Approving...');
      const result = await PeopleGroup.updateMany(
        targetQuery,
        {
          $set: {
            approved: true,
            approvedAt: new Date()
          }
        }
      );
      console.log(`✅ ${result.modifiedCount} people groups approved.`);
    }

    console.log('');

    // --- Final stats ---
    console.log('📊 Final approval status by source:');
    const finalStats = await PeopleGroup.aggregate([
      {
        $group: {
          _id: { source: '$source', approved: '$approved' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.source': 1, '_id.approved': 1 } }
    ]);
    finalStats.forEach(s => {
      const src = s._id.source || 'null/undefined';
      const appr = s._id.approved === true ? 'approved' : (s._id.approved === false ? 'not approved' : 'no flag');
      console.log(`   source="${src}" | ${appr} : ${s.count}`);
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

migrate();
