#!/usr/bin/env node
/**
 * OSM Village Extraction Script
 * Command-line tool to extract villages from OSM.pbf file
 * 
 * Usage:
 *   node scripts/extractOsmVillages.js --country CM
 *   node scripts/extractOsmVillages.js --all
 *   node scripts/extractOsmVillages.js --list
 * 
 * Options:
 *   --country <code>  Extract villages for a specific country (e.g., CM, CF, CD)
 *   --all             Extract villages for all Central African countries
 *   --list            List all supported countries
 *   --dry-run         Show what would be extracted without saving to database
 *   --verbose         Show detailed progress
 */

require('dotenv').config();
const mongoose = require('mongoose');
const osmService = require('../services/osmService');
const jobQueueService = require('../services/jobQueueService');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  country: null,
  all: false,
  list: false,
  dryRun: false,
  verbose: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--country':
    case '-c':
      options.country = args[++i];
      break;
    case '--all':
    case '-a':
      options.all = true;
      break;
    case '--list':
    case '-l':
      options.list = true;
      break;
    case '--dry-run':
    case '-d':
      options.dryRun = true;
      break;
    case '--verbose':
    case '-v':
      options.verbose = true;
      break;
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
  }
}

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║           OSM Village Extraction Tool - Central Africa            ║
╚═══════════════════════════════════════════════════════════════════╝

Usage:
  node scripts/extractOsmVillages.js [options]

Options:
  --country, -c <code>  Extract villages for a specific country
                        Example: --country CM (Cameroon)
  
  --all, -a             Extract villages for all Central African countries
  
  --list, -l            List all supported countries with their codes
  
  --dry-run, -d         Show extraction results without saving to database
  
  --verbose, -v         Show detailed progress during extraction
  
  --help, -h            Show this help message

Examples:
  # List supported countries
  node scripts/extractOsmVillages.js --list

  # Extract villages for Cameroon
  node scripts/extractOsmVillages.js --country CM

  # Extract for all countries (dry run)
  node scripts/extractOsmVillages.js --all --dry-run

  # Verbose extraction for DRC
  node scripts/extractOsmVillages.js --country CD --verbose

Supported Countries (Central Africa):
  CM - Cameroon (Cameroun)
  CF - Central African Republic (République centrafricaine)
  TD - Chad (Tchad)
  CG - Republic of the Congo (République du Congo)
  CD - Democratic Republic of the Congo (RDC)
  GQ - Equatorial Guinea (Guinée équatoriale)
  GA - Gabon
  ST - São Tomé and Príncipe
  AO - Angola
  BI - Burundi
  RW - Rwanda
`);
}

async function listCountries() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║              Supported Central African Countries                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  
  const countries = osmService.getCentralAfricanCountries();
  
  console.log('Code │ Name                                  │ French Name');
  console.log('─────┼───────────────────────────────────────┼─────────────────────────────');
  
  countries.forEach(country => {
    const name = country.name.padEnd(37);
    const nameFr = country.nameFr || '';
    console.log(`  ${country.code} │ ${name} │ ${nameFr}`);
  });
  
  console.log('\nTotal: ' + countries.length + ' countries\n');
}

async function extractForCountry(countryCode) {
  const countryInfo = osmService.getCountryInfo(countryCode);
  
  if (!countryInfo) {
    console.error(`\n❌ Unknown country code: ${countryCode}`);
    console.log('Use --list to see supported countries.\n');
    process.exit(1);
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║  Extracting villages for: ${countryInfo.name.padEnd(38)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📍 Country: ${countryInfo.name} (${countryInfo.nameFr})`);
  console.log(`📦 Bounding Box: [${countryInfo.bbox.join(', ')}]`);
  console.log(`🔧 Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('');
  
  try {
    // Extract villages
    console.log('🔄 Starting extraction from OSM.pbf file...');
    console.log('   Progress updates will appear every 100,000 items or 5 seconds\n');
    const startTime = Date.now();
    
    const result = await osmService.extractVillagesForCountry(countryCode, {
      onProgress: (progress) => {
        if (options.verbose) {
          const percent = progress.fileSizeBytes > 0 
            ? ((progress.bytesRead / progress.fileSizeBytes) * 100).toFixed(1) 
            : 0;
          process.stdout.write(`\r   [${percent}%] Items: ${progress.totalItemsProcessed.toLocaleString()} | Villages: ${progress.villagesFound.toLocaleString()}`);
        }
      },
    });
    
    const extractionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const extractionMinutes = (extractionTime / 60).toFixed(1);
    
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                        EXTRACTION RESULTS                         ');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`   Country:          ${result.countryName}`);
    console.log(`   Total Items:      ${result.stats.totalItemsProcessed?.toLocaleString() || 'N/A'}`);
    console.log(`      • Nodes:       ${result.stats.nodesProcessed.toLocaleString()}`);
    console.log(`      • Ways:        ${result.stats.waysProcessed?.toLocaleString() || 'N/A'}`);
    console.log(`      • Relations:   ${result.stats.relationsProcessed?.toLocaleString() || 'N/A'}`);
    console.log(`   Villages Found:   ${result.stats.villagesFound.toLocaleString()}`);
    console.log(`   Extraction Time:  ${extractionTime}s (${extractionMinutes} min)`);
    
    if (result.warning) {
      console.log(`\n   ⚠️  Warning: ${result.warning}`);
    }
    
    if (!options.dryRun && result.villages.length > 0) {
      console.log('\n🔄 Saving villages to database...');
      
      const saveResult = await osmService.saveVillagesToDatabase(result.villages, {
        onProgress: (progress) => {
          if (options.verbose) {
            process.stdout.write(`\r   Saved: ${progress.saved}/${progress.total}`);
          }
        },
      });
      
      console.log('\n');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('                          SAVE RESULTS                             ');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log(`   Villages Saved:   ${saveResult.saved.toLocaleString()}`);
      console.log(`   Duplicates:       ${saveResult.skipped.toLocaleString()}`);
      console.log(`   Updated:          ${saveResult.updated.toLocaleString()}`);
      console.log(`   Errors:           ${saveResult.errors.length}`);
      
      if (saveResult.errors.length > 0 && options.verbose) {
        console.log('\n   Errors:');
        saveResult.errors.slice(0, 5).forEach(err => {
          console.log(`     - ${err.village}: ${err.error}`);
        });
        if (saveResult.errors.length > 5) {
          console.log(`     ... and ${saveResult.errors.length - 5} more`);
        }
      }
    } else if (options.dryRun) {
      console.log('\n   ℹ️  Dry run mode - no data saved to database');
    }
    
    console.log('\n✅ Extraction complete!\n');
    
  } catch (error) {
    console.error('\n❌ Extraction failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function extractAllCountries() {
  const countries = osmService.getCentralAfricanCountries();
  
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     Batch Extraction - All Central African Countries             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Total Countries: ${countries.length}`);
  console.log(`🔧 Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('');
  
  let totalExtracted = 0;
  let totalSaved = 0;
  const results = [];
  
  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    console.log(`\n[${i + 1}/${countries.length}] Processing ${country.name}...`);
    
    try {
      const result = await osmService.extractVillagesForCountry(country.code);
      totalExtracted += result.stats.villagesFound;
      
      if (!options.dryRun && result.villages.length > 0) {
        const saveResult = await osmService.saveVillagesToDatabase(result.villages);
        totalSaved += saveResult.saved;
        
        results.push({
          country: country.name,
          code: country.code,
          extracted: result.stats.villagesFound,
          saved: saveResult.saved,
          status: 'success',
        });
      } else {
        results.push({
          country: country.name,
          code: country.code,
          extracted: result.stats.villagesFound,
          saved: 0,
          status: options.dryRun ? 'dry-run' : 'success',
        });
      }
      
      console.log(`   ✓ Found ${result.stats.villagesFound} villages`);
      
    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
      results.push({
        country: country.name,
        code: country.code,
        extracted: 0,
        saved: 0,
        status: 'failed',
        error: error.message,
      });
    }
  }
  
  // Summary
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                         BATCH SUMMARY                             ');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`   Countries Processed: ${countries.length}`);
  console.log(`   Total Extracted:     ${totalExtracted.toLocaleString()}`);
  console.log(`   Total Saved:         ${totalSaved.toLocaleString()}`);
  console.log('');
  
  console.log('   Results by Country:');
  console.log('   ─────────────────────────────────────────────────────────────');
  results.forEach(r => {
    const status = r.status === 'success' ? '✓' : r.status === 'dry-run' ? '○' : '✗';
    console.log(`   ${status} ${r.country.padEnd(35)} ${r.extracted.toString().padStart(6)} extracted`);
  });
  
  console.log('\n✅ Batch extraction complete!\n');
}

async function main() {
  // Show help if no arguments
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }
  
  // List countries
  if (options.list) {
    await listCountries();
    process.exit(0);
  }
  
  // Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
  
  try {
    if (options.country) {
      await extractForCountry(options.country.toUpperCase());
    } else if (options.all) {
      await extractAllCountries();
    } else {
      console.log('Please specify --country <code> or --all');
      console.log('Use --help for more information.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
