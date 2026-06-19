#!/usr/bin/env node
/**
 * Merge GADM GeoJSON files for a country into a single FeatureCollection
 * 
 * Usage: node mergeGeoJSON.js <COUNTRY_CODE>
 * Example: node mergeGeoJSON.js COG
 * 
 * This script:
 * 1. Reads all GADM files for the specified country (gadm41_{CODE}_1.json, gadm41_{CODE}_2.json, etc.)
 * 2. Merges them into a single FeatureCollection
 * 3. Adds proper admin_level property (1, 2, or 3)
 * 4. Standardizes property names
 * 5. Writes to frontend/public/data/Admin123{CODE} fusionnées.geojson
 */

const fs = require('fs');
const path = require('path');

// Get country code from command line arguments
const countryCode = process.argv[2]?.toUpperCase();

if (!countryCode) {
  console.error('Usage: node mergeGeoJSON.js <COUNTRY_CODE>');
  console.error('Example: node mergeGeoJSON.js COG');
  process.exit(1);
}

// Paths
const dataDir = path.join(__dirname, '../../frontend/public/data');
const outputFile = path.join(dataDir, `Admin123${countryCode} fusionnées.geojson`);

console.log(`\n🌍 Merging GADM files for ${countryCode}...`);
console.log(`📁 Data directory: ${dataDir}`);

// Find all GADM files for this country
const gadmFiles = [];
for (let level = 0; level <= 4; level++) {
  const fileName = `gadm41_${countryCode}_${level}.json`;
  const filePath = path.join(dataDir, fileName);
  if (fs.existsSync(filePath)) {
    gadmFiles.push({ level, filePath, fileName });
    console.log(`  ✓ Found: ${fileName}`);
  }
}

// Also check for alternative naming conventions (cog_admin1.geojson, etc.)
for (let level = 0; level <= 4; level++) {
  const fileName = `${countryCode.toLowerCase()}_admin${level}.geojson`;
  const filePath = path.join(dataDir, fileName);
  if (fs.existsSync(filePath) && !gadmFiles.some(f => f.level === level)) {
    gadmFiles.push({ level, filePath, fileName });
    console.log(`  ✓ Found: ${fileName}`);
  }
}

if (gadmFiles.length === 0) {
  console.error(`\n❌ No GADM files found for ${countryCode}`);
  console.error(`Expected files like: gadm41_${countryCode}_1.json, gadm41_${countryCode}_2.json, etc.`);
  process.exit(1);
}

// Sort by level
gadmFiles.sort((a, b) => a.level - b.level);

console.log(`\n📊 Processing ${gadmFiles.length} GADM file(s)...`);

// Merge all features
const allFeatures = [];
let totalFeatures = 0;

for (const { level, filePath, fileName } of gadmFiles) {
  // Skip level 0 (country boundary) - we only want admin levels 1, 2, 3
  if (level === 0) {
    console.log(`  ⏭️  Skipping ${fileName} (country boundary)`);
    continue;
  }
  
  console.log(`\n  📖 Reading ${fileName}...`);
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const geojson = JSON.parse(fileContent);
    
    if (!geojson.features || !Array.isArray(geojson.features)) {
      console.warn(`  ⚠️  ${fileName} has no features array, skipping`);
      continue;
    }
    
    const featureCount = geojson.features.length;
    console.log(`     Found ${featureCount} features`);
    
    // Process each feature
    for (const feature of geojson.features) {
      // Add admin_level property
      feature.properties = feature.properties || {};
      feature.properties.admin_level = level;
      
      // Standardize property names for easier access
      const props = feature.properties;
      
      // Extract names based on GADM format
      if (level === 1) {
        props.name = props.NAME_1 || props.name || 'Unknown';
        props.name_en = props.VARNAME_1 || props.NAME_1 || props.name;
        props.iso_code = props.ISO_1 || props.HASC_1 || '';
        props.parent = props.COUNTRY || props.GID_0 || countryCode;
        props.type = props.TYPE_1 || props.ENGTYPE_1 || 'Region';
      } else if (level === 2) {
        props.name = props.NAME_2 || props.name || 'Unknown';
        props.name_en = props.VARNAME_2 || props.NAME_2 || props.name;
        props.iso_code = props.HASC_2 || '';
        props.parent = props.NAME_1 || '';
        props.type = props.TYPE_2 || props.ENGTYPE_2 || 'District';
      } else if (level === 3) {
        props.name = props.NAME_3 || props.name || 'Unknown';
        props.name_en = props.VARNAME_3 || props.NAME_3 || props.name;
        props.iso_code = props.HASC_3 || '';
        props.parent = props.NAME_2 || '';
        props.type = props.TYPE_3 || props.ENGTYPE_3 || 'Subdivision';
      }
      
      // Keep original GADM properties for compatibility
      // The layer property helps identify the source
      props.layer = `gadm41_${countryCode}_${level}`;
      
      allFeatures.push(feature);
    }
    
    totalFeatures += featureCount;
    console.log(`     ✓ Processed ${featureCount} features (admin level ${level})`);
    
  } catch (error) {
    console.error(`  ❌ Error reading ${fileName}: ${error.message}`);
  }
}

if (allFeatures.length === 0) {
  console.error('\n❌ No features were processed');
  process.exit(1);
}

// Create merged GeoJSON
const mergedGeoJSON = {
  type: 'FeatureCollection',
  name: `Admin123${countryCode} fusionnées`,
  crs: {
    type: 'name',
    properties: {
      name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
    }
  },
  features: allFeatures
};

// Count features by admin level
const levelCounts = {};
for (const feature of allFeatures) {
  const level = feature.properties.admin_level;
  levelCounts[level] = (levelCounts[level] || 0) + 1;
}

console.log('\n📊 Summary:');
console.log(`   Total features: ${allFeatures.length}`);
for (const [level, count] of Object.entries(levelCounts).sort()) {
  const levelName = level === '1' ? 'Regions' : level === '2' ? 'Districts' : level === '3' ? 'Subdivisions' : `Level ${level}`;
  console.log(`   Admin ${level} (${levelName}): ${count}`);
}

// Write output file
console.log(`\n💾 Writing to: ${outputFile}`);

try {
  fs.writeFileSync(outputFile, JSON.stringify(mergedGeoJSON), 'utf8');
  
  // Get file size
  const stats = fs.statSync(outputFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`   ✓ File written successfully (${fileSizeMB} MB)`);
  console.log(`\n✅ Merge complete!`);
  console.log(`   Output: Admin123${countryCode} fusionnées.geojson`);
  console.log(`   Features: ${allFeatures.length}`);
  
} catch (error) {
  console.error(`\n❌ Error writing file: ${error.message}`);
  process.exit(1);
}
