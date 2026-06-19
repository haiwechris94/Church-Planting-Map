#!/usr/bin/env node
/**
 * Database Verification Script
 * Checks database integrity and identifies potential issues
 * 
 * Usage: node scripts/verifyDatabase.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import models
const PeopleGroup = require('../models/PeopleGroup');
const Village = require('../models/Village');
const User = require('../models/User');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
};

async function verifyDatabase() {
  console.log('\n' + '═'.repeat(60));
  console.log('  DATABASE VERIFICATION SCRIPT');
  console.log('═'.repeat(60) + '\n');

  try {
    // Connect to MongoDB
    log.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');

    const issues = [];
    const stats = {};

    // ═══════════════════════════════════════════════════════════════
    // 1. CHECK COLLECTIONS EXIST
    // ═══════════════════════════════════════════════════════════════
    log.header('CHECKING COLLECTIONS');

    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const requiredCollections = ['users', 'villages', 'peoplegroups', 'activities', 'notifications'];
    
    for (const col of requiredCollections) {
      if (collectionNames.includes(col)) {
        log.success(`Collection '${col}' exists`);
      } else {
        log.warning(`Collection '${col}' not found`);
        issues.push({ type: 'missing_collection', collection: col });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. CHECK PEOPLE GROUPS
    // ═══════════════════════════════════════════════════════════════
    log.header('CHECKING PEOPLE GROUPS');

    const totalPeopleGroups = await PeopleGroup.countDocuments();
    const approvedPeopleGroups = await PeopleGroup.countDocuments({ approved: true });
    const pendingPeopleGroups = await PeopleGroup.countDocuments({ approved: false });
    
    stats.peopleGroups = {
      total: totalPeopleGroups,
      approved: approvedPeopleGroups,
      pending: pendingPeopleGroups,
    };

    log.info(`Total people groups: ${totalPeopleGroups}`);
    log.info(`Approved: ${approvedPeopleGroups}`);
    log.info(`Pending approval: ${pendingPeopleGroups}`);

    // Check for people groups without villageName
    const noVillageName = await PeopleGroup.countDocuments({
      $or: [
        { villageName: { $exists: false } },
        { villageName: null },
        { villageName: '' }
      ]
    });
    
    if (noVillageName > 0) {
      log.warning(`${noVillageName} people groups have no villageName`);
      issues.push({ type: 'missing_village_name', count: noVillageName });
    } else {
      log.success('All people groups have villageName');
    }

    // Check for people groups without coordinates
    const noCoordinates = await PeopleGroup.countDocuments({
      $or: [
        { location: { $exists: false } },
        { 'location.coordinates': { $exists: false } },
        { 'location.coordinates': { $size: 0 } }
      ]
    });
    
    if (noCoordinates > 0) {
      log.warning(`${noCoordinates} people groups have no coordinates`);
      issues.push({ type: 'missing_coordinates', count: noCoordinates });
    } else {
      log.success('All people groups have coordinates');
    }

    // Check for invalid engagement status
    const validStatuses = ['pioneer', 'midway', 'tipping-point', 'dmm'];
    const invalidStatus = await PeopleGroup.countDocuments({
      engagementStatus: { $nin: validStatuses }
    });
    
    if (invalidStatus > 0) {
      log.warning(`${invalidStatus} people groups have invalid engagementStatus`);
      issues.push({ type: 'invalid_status', count: invalidStatus });
    } else {
      log.success('All people groups have valid engagementStatus');
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. CHECK VILLAGES
    // ═══════════════════════════════════════════════════════════════
    log.header('CHECKING VILLAGES');

    const totalVillages = await Village.countDocuments();
    stats.villages = { total: totalVillages };
    
    log.info(`Total villages in database: ${totalVillages}`);

    // Check for villages without coordinates
    const villagesNoCoords = await Village.countDocuments({
      $or: [
        { location: { $exists: false } },
        { 'location.coordinates': { $exists: false } }
      ]
    });
    
    if (villagesNoCoords > 0) {
      log.warning(`${villagesNoCoords} villages have no coordinates`);
      issues.push({ type: 'villages_no_coords', count: villagesNoCoords });
    }

    // Check for villages with boundary polygons
    const villagesWithBoundary = await Village.countDocuments({
      'boundary.coordinates': { $exists: true, $ne: null }
    });
    log.info(`Villages with boundary polygons: ${villagesWithBoundary}`);

    // ═══════════════════════════════════════════════════════════════
    // 4. CHECK VILLAGE NAME REFERENCES
    // ═══════════════════════════════════════════════════════════════
    log.header('CHECKING VILLAGE NAME REFERENCES');

    // Load GeoJSON village names
    const geoJsonPath = path.join(__dirname, '..', 'data', 'cameroon_villages.geojson');
    let geoJsonVillages = new Set();
    
    if (fs.existsSync(geoJsonPath)) {
      try {
        const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
        geoJsonVillages = new Set(
          geoJsonData.features
            .map(f => f.properties?.name || f.properties?.NAME)
            .filter(Boolean)
        );
        log.info(`GeoJSON file contains ${geoJsonVillages.size} villages`);
      } catch (err) {
        log.warning(`Could not parse GeoJSON file: ${err.message}`);
      }
    } else {
      log.warning('GeoJSON file not found at: ' + geoJsonPath);
    }

    // Check for orphaned village references
    if (geoJsonVillages.size > 0) {
      const uniqueVillageNames = await PeopleGroup.distinct('villageName', {
        villageName: { $exists: true, $ne: null, $ne: '' }
      });
      
      const orphanedReferences = uniqueVillageNames.filter(name => !geoJsonVillages.has(name));
      
      if (orphanedReferences.length > 0) {
        log.warning(`${orphanedReferences.length} village names don't match GeoJSON`);
        if (orphanedReferences.length <= 10) {
          orphanedReferences.forEach(name => log.info(`  - "${name}"`));
        } else {
          orphanedReferences.slice(0, 10).forEach(name => log.info(`  - "${name}"`));
          log.info(`  ... and ${orphanedReferences.length - 10} more`);
        }
        issues.push({ type: 'orphaned_village_refs', count: orphanedReferences.length, samples: orphanedReferences.slice(0, 5) });
      } else {
        log.success('All village references match GeoJSON');
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. CHECK USERS
    // ═══════════════════════════════════════════════════════════════
    log.header('CHECKING USERS');

    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    stats.users = { total: totalUsers, byRole: {} };
    
    log.info(`Total users: ${totalUsers}`);
    usersByRole.forEach(r => {
      log.info(`  ${r._id}: ${r.count}`);
      stats.users.byRole[r._id] = r.count;
    });

    // Check for admin users
    const adminCount = usersByRole.find(r => r._id === 'admin')?.count || 0;
    if (adminCount === 0) {
      log.warning('No admin users found! Run: node scripts/grantAdminRole.js <email>');
      issues.push({ type: 'no_admin', message: 'No admin users exist' });
    } else {
      log.success(`${adminCount} admin user(s) found`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. CHECK INDEXES
    // ═══════════════════════════════════════════════════════════════
    log.header('CHECKING INDEXES');

    const pgIndexes = await PeopleGroup.collection.indexes();
    const villageIndexes = await Village.collection.indexes();
    
    log.info(`PeopleGroup indexes: ${pgIndexes.length}`);
    pgIndexes.forEach(idx => log.info(`  - ${idx.name}`));
    
    log.info(`Village indexes: ${villageIndexes.length}`);
    villageIndexes.forEach(idx => log.info(`  - ${idx.name}`));

    // Check for 2dsphere index on location
    const hasLocationIndex = pgIndexes.some(idx => 
      idx.key && idx.key.location === '2dsphere'
    );
    
    if (!hasLocationIndex) {
      log.warning('PeopleGroup missing 2dsphere index on location');
      issues.push({ type: 'missing_index', collection: 'peoplegroups', field: 'location' });
    } else {
      log.success('PeopleGroup has 2dsphere index on location');
    }

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    log.header('VERIFICATION SUMMARY');

    console.log('\nStatistics:');
    console.log(JSON.stringify(stats, null, 2));

    if (issues.length === 0) {
      log.success('\n✅ No issues found! Database is healthy.\n');
    } else {
      log.warning(`\n⚠️  Found ${issues.length} issue(s):\n`);
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.type}: ${JSON.stringify(issue)}`);
      });
      console.log('\nRecommendations:');
      
      if (issues.some(i => i.type === 'missing_village_name')) {
        console.log('  - Run: node scripts/migrateVillageNames.js');
      }
      if (issues.some(i => i.type === 'no_admin')) {
        console.log('  - Run: node scripts/grantAdminRole.js <email>');
      }
      if (issues.some(i => i.type === 'orphaned_village_refs')) {
        console.log('  - Review village names in people groups to match GeoJSON');
      }
    }

    console.log('\n' + '═'.repeat(60) + '\n');

  } catch (error) {
    log.error(`Verification failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
  }
}

// Run verification
verifyDatabase();
