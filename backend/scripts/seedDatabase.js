/**
 * Database Seed Script
 * Automatically seeds the PeopleGroup collection with sample data on startup
 * 
 * Features:
 * - Reads sample-people-groups.csv from frontend/public/data/
 * - Checks if PeopleGroup collection is empty or if sample data already exists
 * - Imports data only if needed (prevents duplicates)
 * - Can be integrated into server.js for automatic startup seeding
 * 
 * Usage:
 *   Standalone: node scripts/seedDatabase.js
 *   Integrated: Called from server.js after MongoDB connection
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Models
const PeopleGroup = require('../models/PeopleGroup');
const Village = require('../models/Village');
const User = require('../models/User');

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '../../frontend/public/data/sample-people-groups.csv');
const ADMIN_EMAIL = 'chrishaiwe@gmail.com'; // Default admin user for seeding
const SAMPLE_DATA_MARKER = '[SEED]'; // Marker to identify seeded data

// CSV column mapping
const COLUMN_MAP = {
  'People group name': 'name',
  'Village Name': 'villageName',
  'Number Of Churches': 'numberOfChurches',
  'Church Generation': 'churchGeneration',
  'description': 'description',
  'Latitude': 'latitude',
  'Longitude': 'longitude'
};

/**
 * Parse CSV content into array of objects
 * @param {string} content - CSV file content
 * @param {string} delimiter - Column delimiter (default: semicolon)
 * @returns {Array} Array of parsed row objects
 */
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

/**
 * Check if the database needs seeding
 * @returns {Object} { needsSeeding: boolean, reason: string }
 */
async function checkIfSeedingNeeded() {
  const totalCount = await PeopleGroup.countDocuments();
  
  if (totalCount === 0) {
    return { needsSeeding: true, reason: 'PeopleGroup collection is empty' };
  }

  // Check if sample data already exists by looking for known sample entries
  const sampleNames = ['Bamileke', 'Fulani', 'Bassa', 'Ewondo', 'Duala'];
  const existingSamples = await PeopleGroup.find({ 
    name: { $in: sampleNames } 
  }).countDocuments();

  if (existingSamples >= sampleNames.length) {
    return { needsSeeding: false, reason: `Sample data already exists (${existingSamples} sample entries found)` };
  }

  // Check if any sample data exists
  if (existingSamples > 0) {
    return { needsSeeding: false, reason: `Partial sample data exists (${existingSamples}/${sampleNames.length} entries)` };
  }

  return { needsSeeding: true, reason: `Collection has ${totalCount} entries but no sample data` };
}

/**
 * Seed the database with sample people groups
 * @param {Object} options - Seeding options
 * @param {boolean} options.force - Force seeding even if data exists
 * @param {boolean} options.standalone - Running as standalone script (manages own connection)
 * @returns {Object} Seeding results
 */
async function seedDatabase(options = {}) {
  const { force = false, standalone = false } = options;
  const results = {
    success: false,
    imported: [],
    skipped: [],
    errors: [],
    message: ''
  };

  try {
    console.log('🌱 [SeedDatabase] Starting database seed check...');

    // Check if seeding is needed
    if (!force) {
      const { needsSeeding, reason } = await checkIfSeedingNeeded();
      if (!needsSeeding) {
        console.log(`✅ [SeedDatabase] Seeding skipped: ${reason}`);
        results.success = true;
        results.message = `Seeding skipped: ${reason}`;
        return results;
      }
      console.log(`📋 [SeedDatabase] Seeding needed: ${reason}`);
    } else {
      console.log('⚠️  [SeedDatabase] Force seeding enabled - will import regardless of existing data');
    }

    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.log(`⚠️  [SeedDatabase] CSV file not found: ${CSV_FILE_PATH}`);
      results.message = 'CSV file not found';
      return results;
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    console.log(`📂 [SeedDatabase] Read CSV file (${csvContent.length} bytes)`);

    const rows = parseCSV(csvContent, ';');
    console.log(`📊 [SeedDatabase] Parsed ${rows.length} data rows`);

    if (rows.length === 0) {
      console.log('⚠️  [SeedDatabase] No data rows found in CSV');
      results.message = 'No data rows in CSV';
      return results;
    }

    // Find admin user for attribution
    let adminUser = await User.findOne({ email: ADMIN_EMAIL });
    if (!adminUser) {
      // Try to find any admin user
      adminUser = await User.findOne({ role: 'admin' });
    }
    
    if (adminUser) {
      console.log(`👤 [SeedDatabase] Using admin user: ${adminUser.name} (${adminUser.email})`);
    } else {
      console.log('⚠️  [SeedDatabase] No admin user found - records will be created without creator');
    }

    // Import each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row and 0-indexing

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
          results.skipped.push({ row: rowNum, reason: 'Invalid coordinates', name: row.name });
          continue;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          results.skipped.push({ row: rowNum, reason: 'Coordinates out of range', name: row.name });
          continue;
        }

        // Check for existing people group with same name
        const existing = await PeopleGroup.findOne({ name: row.name.trim() });
        if (existing) {
          results.skipped.push({ row: rowNum, reason: 'Already exists', name: row.name });
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
          status: 'pioneer',
          engagementStatus: 'pioneer',
          source: 'DMM', // Explicitly set source for seeded data
          createdBy: adminUser?._id,
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

        console.log(`   ✅ [SeedDatabase] Imported: "${peopleGroup.name}"`);

      } catch (error) {
        results.errors.push({ row: rowNum, error: error.message, name: row.name });
        console.log(`   ❌ [SeedDatabase] Error row ${rowNum}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('🌱 [SeedDatabase] SEED SUMMARY');
    console.log('═'.repeat(50));
    console.log(`   Total rows: ${rows.length}`);
    console.log(`   ✅ Imported: ${results.imported.length}`);
    console.log(`   ⏭️  Skipped: ${results.skipped.length}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    console.log('═'.repeat(50) + '\n');

    results.success = true;
    results.message = `Seeded ${results.imported.length} people groups`;

    return results;

  } catch (error) {
    console.error('❌ [SeedDatabase] Fatal error:', error.message);
    results.message = error.message;
    return results;
  }
}

/**
 * Run as standalone script
 */
async function runStandalone() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
    console.log('🔌 [SeedDatabase] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ [SeedDatabase] Connected to MongoDB');

    // Run seeding
    const results = await seedDatabase({ standalone: true });

    // Log results
    if (results.skipped.length > 0) {
      console.log('\n📋 Skipped entries:');
      results.skipped.forEach(s => {
        console.log(`   Row ${s.row}: ${s.reason}${s.name ? ` (${s.name})` : ''}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(e => {
        console.log(`   Row ${e.row}: ${e.error}${e.name ? ` (${e.name})` : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ [SeedDatabase] Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 [SeedDatabase] Disconnected from MongoDB');
  }
}

// Export for use in server.js
module.exports = { seedDatabase, checkIfSeedingNeeded };

// Run standalone if executed directly
if (require.main === module) {
  runStandalone();
}
