/**
 * Joshua Project CSV Import Script
 * 
 * Imports unreached people groups data from Joshua Project CSV file
 * into the Church Planting Map database.
 * 
 * CSV Structure:
 * - Delimiter: semicolon (;)
 * - Skip first 3 header lines
 * - Stop when Ctry column is empty (around line 7128)
 * 
 * Usage: node scripts/importJoshuaProject.js [--dry-run] [--clear-existing]
 * 
 * Options:
 *   --dry-run         Preview import without saving to database
 *   --clear-existing  Clear existing Joshua Project data before import
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const PeopleGroup = require('../models/PeopleGroup');
const User = require('../models/User');

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '../data/UnreachedPeoplesByCountry.csv');
const HEADER_LINES_TO_SKIP = 3;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'chrishaiwe@gmail.com';

// CSV Column indices (0-based, after splitting by semicolon)
const COLUMN_INDICES = {
  ROG3: 0,           // Country code (e.g., AF, CM)
  Ctry: 1,           // Country name
  PeopleID3: 2,      // Unique people group ID
  ROP3: 3,
  PeopNameAcrossCountries: 4,
  PeopNameInCountry: 5,
  Population: 6,
  JPScale: 7,
  LeastReached: 8,
  Frontier: 9,
  ROL3: 10,
  PrimaryLanguageName: 11,
  BibleStatus: 12,
  RLG3: 13,
  PrimaryReligion: 14,
  PercentAdherents: 15,
  PctChristianRange: 16,
  PercentEvangelical: 17,
  PctEvangelicalRange: 18,
  ROP1: 19,
  PeopleID1: 20,
  AffinityBloc: 21,
  PeopleID2: 22,
  ROP2: 23,
  PeopleCluster: 24,
  RegionCode: 25,
  RegionName: 26,
  ROG2: 27,
  Continent: 28,
  TenFortyWindow: 29,
  CountOfCountries: 30,
  IndigenousCode: 31,
  WorkersNeeded: 32,
  Latitude: 33,
  Longitude: 34
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const clearExisting = args.includes('--clear-existing');

/**
 * Parse a single CSV line handling potential edge cases
 */
function parseCSVLine(line, delimiter = ';') {
  const values = line.split(delimiter);
  return values.map(v => v.trim());
}

/**
 * Map JPScale to DMM engagement status
 */
function mapJPScaleToStatus(jpScale) {
  const scale = parseInt(jpScale);
  if (isNaN(scale) || scale <= 2) return 'unreached';
  if (scale === 3) return 'pioneer';
  if (scale === 4) return 'midway';
  if (scale >= 5) return 'dmm';
  return 'unreached';
}

/**
 * Transform CSV row to PeopleGroup document
 */
function transformRowToDocument(values, adminUserId) {
  const latitude = parseFloat(values[COLUMN_INDICES.Latitude]);
  const longitude = parseFloat(values[COLUMN_INDICES.Longitude]);
  const population = parseInt(values[COLUMN_INDICES.Population]) || 0;
  const jpScale = values[COLUMN_INDICES.JPScale];
  const percentEvangelical = parseFloat(values[COLUMN_INDICES.PercentEvangelical]) || 0;
  
  // Validate coordinates
  const validLat = !isNaN(latitude) && latitude >= -90 && latitude <= 90;
  const validLng = !isNaN(longitude) && longitude >= -180 && longitude <= 180;
  
  if (!validLat || !validLng) {
    return null;
  }
  
  const dmmStatus = mapJPScaleToStatus(jpScale);
  
  return {
    name: values[COLUMN_INDICES.PeopNameInCountry] || values[COLUMN_INDICES.PeopNameAcrossCountries] || 'Unknown',
    // NOTE: Joshua Project data does not include village names - only people group names.
    // Setting villageName to empty string to avoid polluting village status calculations.
    villageName: '',
    description: `${values[COLUMN_INDICES.PeopNameInCountry]} people group in ${values[COLUMN_INDICES.Ctry]}. Primary religion: ${values[COLUMN_INDICES.PrimaryReligion] || 'Unknown'}.`,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    status: dmmStatus,
    engagementStatus: dmmStatus,
    population: population,
    language: values[COLUMN_INDICES.PrimaryLanguageName] || '',
    religion: values[COLUMN_INDICES.PrimaryReligion] || '',
    region: values[COLUMN_INDICES.RegionName] || '',
    country: values[COLUMN_INDICES.Ctry] || values[COLUMN_INDICES.ROG3] || '',
    source: 'Joshua Project',
    approved: true,
    createdBy: adminUserId,
    approvedBy: adminUserId,
    approvedAt: new Date(),
    jpData: {
      peopleId: values[COLUMN_INDICES.PeopleID3],
      rog3: values[COLUMN_INDICES.ROG3],
      jpScale: jpScale,
      percentEvangelical: percentEvangelical,
      percentChristian: parseFloat(values[COLUMN_INDICES.PercentAdherents]) || 0
    }
  };
}

/**
 * Main import function
 */
async function importJoshuaProjectData() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Joshua Project CSV Import Script');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE IMPORT'}`);
  console.log(`  Clear existing: ${clearExisting ? 'YES' : 'NO'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Statistics
  const stats = {
    totalLines: 0,
    dataLines: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    byCountry: {},
    byStatus: {}
  };

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find admin user for createdBy field
    console.log(`🔍 Looking for admin user: ${ADMIN_EMAIL}`);
    let adminUser = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!adminUser) {
      // Try to find any admin user
      adminUser = await User.findOne({ role: 'admin' });
    }
    
    if (!adminUser) {
      console.log('⚠️  No admin user found. Creating system user reference...');
      // We'll use a placeholder ObjectId for system imports
      adminUser = { _id: new mongoose.Types.ObjectId() };
    } else {
      console.log(`✅ Found admin user: ${adminUser.name || adminUser.email}\n`);
    }

    // Clear existing data if requested
    if (clearExisting && !isDryRun) {
      console.log('🗑️  Clearing existing Joshua Project data...');
      const deleteResult = await PeopleGroup.deleteMany({ source: 'Joshua Project' });
      console.log(`   Deleted ${deleteResult.deletedCount} existing records\n`);
    }

    // Read CSV file
    console.log(`📂 Reading CSV file: ${CSV_FILE_PATH}`);
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found: ${CSV_FILE_PATH}`);
    }

    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = csvContent.split(/\r?\n/);
    stats.totalLines = lines.length;
    console.log(`✅ File read successfully (${lines.length} lines)\n`);

    // Process lines
    console.log('📊 Processing data...\n');
    const startTime = Date.now();
    let lastProgressUpdate = 0;

    for (let i = HEADER_LINES_TO_SKIP; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line || !line.trim()) continue;
      
      const values = parseCSVLine(line);
      
      // Stop if Ctry (country) column is empty - end of data
      const countryCode = values[COLUMN_INDICES.ROG3];
      const countryName = values[COLUMN_INDICES.Ctry];
      
      if (!countryCode || !countryName) {
        console.log(`\n📍 Reached end of data at line ${i + 1}`);
        break;
      }
      
      stats.dataLines++;
      
      // Transform row to document
      const document = transformRowToDocument(values, adminUser._id);
      
      if (!document) {
        stats.skipped++;
        continue;
      }
      
      // Track statistics
      stats.byCountry[document.country] = (stats.byCountry[document.country] || 0) + 1;
      stats.byStatus[document.status] = (stats.byStatus[document.status] || 0) + 1;
      
      if (!isDryRun) {
        try {
          // Check for existing record by peopleId
          const existingRecord = await PeopleGroup.findOne({
            'jpData.peopleId': document.jpData.peopleId,
            source: 'Joshua Project'
          });
          
          if (existingRecord) {
            // Update existing record
            await PeopleGroup.findByIdAndUpdate(existingRecord._id, document);
            stats.updated++;
          } else {
            // Create new record
            const newPeopleGroup = new PeopleGroup(document);
            await newPeopleGroup.save();
            stats.imported++;
          }
        } catch (saveError) {
          stats.errors++;
          if (stats.errors <= 10) {
            console.log(`   ❌ Error at line ${i + 1}: ${saveError.message}`);
          }
        }
      } else {
        stats.imported++;
      }
      
      // Progress update every 500 records
      if (stats.dataLines - lastProgressUpdate >= 500) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   📈 Processed ${stats.dataLines} records (${elapsed}s elapsed)...`);
        lastProgressUpdate = stats.dataLines;
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  IMPORT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total lines in file:    ${stats.totalLines}`);
    console.log(`  Data lines processed:   ${stats.dataLines}`);
    console.log(`  ✅ Imported (new):      ${stats.imported}`);
    console.log(`  🔄 Updated (existing):  ${stats.updated}`);
    console.log(`  ⏭️  Skipped:             ${stats.skipped}`);
    console.log(`  ❌ Errors:              ${stats.errors}`);
    console.log(`  ⏱️  Time elapsed:        ${totalTime}s`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Print country breakdown
    console.log('📊 Records by Country (top 20):');
    const sortedCountries = Object.entries(stats.byCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    for (const [country, count] of sortedCountries) {
      console.log(`   ${country.padEnd(30)} ${count}`);
    }

    // Print status breakdown
    console.log('\n📊 Records by Status:');
    for (const [status, count] of Object.entries(stats.byStatus)) {
      console.log(`   ${status.padEnd(20)} ${count}`);
    }

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN - No changes were saved to the database');
      console.log('   Run without --dry-run to perform actual import');
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the import
importJoshuaProjectData();
