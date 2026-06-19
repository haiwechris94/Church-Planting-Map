/**
 * Script to import people groups from CSV file
 * Handles semicolon-delimited CSV files
 * Usage: node scripts/importPeopleGroupsFromCSV.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const PeopleGroup = require('../models/PeopleGroup');
const Village = require('../models/Village');
const User = require('../models/User');

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '../../frontend/public/data/Import CSV.csv');
const ADMIN_EMAIL = 'chrishaiwe@gmail.com'; // User who will be set as creator

// CSV column mapping (based on the file structure)
// Headers: People group name;Village Name;Number Of Churches;Church Generation;description;Latitude;Longitude
const COLUMN_MAP = {
  'People group name': 'name',
  'Village Name': 'villageName',
  'Number Of Churches': 'numberOfChurches',
  'Church Generation': 'churchGeneration',
  'description': 'description',
  'Latitude': 'latitude',
  'Longitude': 'longitude'
};

function parseCSV(content, delimiter = ';') {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    if (values.length === 0 || (values.length === 1 && !values[0].trim())) continue;

    const row = {};
    headers.forEach((header, index) => {
      const mappedField = COLUMN_MAP[header] || header.toLowerCase().replace(/\s+/g, '');
      row[mappedField] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

async function importPeopleGroups() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    console.log(`\n🔍 Looking for admin user: ${ADMIN_EMAIL}`);
    const adminUser = await User.findOne({ email: ADMIN_EMAIL });
    if (!adminUser) {
      console.log(`⚠️  Admin user not found. Will create records without creator.`);
    } else {
      console.log(`✅ Found admin user: ${adminUser.name} (${adminUser.role})`);
    }

    // Read CSV file
    console.log(`\n📂 Reading CSV file: ${CSV_FILE_PATH}`);
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.log(`❌ CSV file not found: ${CSV_FILE_PATH}`);
      process.exit(1);
    }

    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    console.log(`✅ File read successfully (${csvContent.length} bytes)`);

    // Parse CSV
    const rows = parseCSV(csvContent, ';');
    console.log(`\n📊 Parsed ${rows.length} data rows`);

    if (rows.length === 0) {
      console.log('⚠️  No data rows found in CSV file.');
      console.log('   Make sure the CSV has data rows after the header.');
      console.log('\n📋 Expected CSV format (semicolon-delimited):');
      console.log('   People group name;Village Name;Number Of Churches;Church Generation;description;Latitude;Longitude');
      console.log('   Example Group;Example Village;2;1;Description here;5.9631;10.1591');
      process.exit(0);
    }

    // Import each row
    const results = {
      imported: [],
      skipped: [],
      errors: []
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, and we're 0-indexed

      try {
        // Validate required fields
        if (!row.name || row.name.trim() === '') {
          results.skipped.push({ row: rowNum, reason: 'Name is required' });
          continue;
        }

        // Parse coordinates
        const latitude = parseFloat(row.latitude);
        const longitude = parseFloat(row.longitude);

        if (isNaN(latitude) || isNaN(longitude)) {
          results.skipped.push({ row: rowNum, reason: 'Invalid coordinates', data: row });
          continue;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          results.skipped.push({ row: rowNum, reason: 'Coordinates out of range', data: row });
          continue;
        }

        // Check for existing people group with same name
        const existing = await PeopleGroup.findOne({ name: row.name.trim() });
        if (existing) {
          results.skipped.push({ row: rowNum, reason: 'People group already exists', name: row.name });
          continue;
        }

        // Look up village if provided
        let villageRef = null;
        if (row.villageName) {
          const village = await Village.findOne({ name: row.villageName.trim() });
          if (village) {
            villageRef = village._id;
          }
        }

        // Create people group
        const peopleGroup = new PeopleGroup({
          name: row.name.trim(),
          description: row.description?.trim() || '',
          villageName: row.villageName?.trim() || '',
          village: villageRef,
          numberOfChurches: parseInt(row.numberOfChurches) || 0,
          churchGeneration: parseInt(row.churchGeneration) || 0,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          status: 'pioneer', // Default status
          engagementStatus: 'pioneer', // Default engagement status
          createdBy: adminUser?._id,
          // Auto-approve if admin user exists and has admin/supervisor role
          approved: adminUser && ['admin', 'supervisor'].includes(adminUser.role),
          approvedBy: adminUser && ['admin', 'supervisor'].includes(adminUser.role) ? adminUser._id : undefined,
          approvedAt: adminUser && ['admin', 'supervisor'].includes(adminUser.role) ? new Date() : undefined,
        });

        await peopleGroup.save();
        results.imported.push({
          row: rowNum,
          id: peopleGroup._id,
          name: peopleGroup.name
        });

        console.log(`   ✅ Row ${rowNum}: Imported "${peopleGroup.name}"`);

      } catch (error) {
        results.errors.push({ row: rowNum, error: error.message, data: row });
        console.log(`   ❌ Row ${rowNum}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`   Total rows: ${rows.length}`);
    console.log(`   ✅ Imported: ${results.imported.length}`);
    console.log(`   ⏭️  Skipped: ${results.skipped.length}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);

    if (results.skipped.length > 0) {
      console.log('\n📋 Skipped rows:');
      results.skipped.forEach(s => {
        console.log(`   Row ${s.row}: ${s.reason}${s.name ? ` (${s.name})` : ''}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(e => {
        console.log(`   Row ${e.row}: ${e.error}`);
      });
    }

    if (results.imported.length > 0) {
      console.log('\n✅ Successfully imported people groups:');
      results.imported.forEach(i => {
        console.log(`   - ${i.name} (ID: ${i.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

importPeopleGroups();
