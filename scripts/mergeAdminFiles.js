/**
 * Script to merge GADM admin boundary files into single admin123 GeoJSON files
 * Creates GAB_admin123.geojson and CAF_admin123.geojson
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../frontend/public/data');

// Function to merge GADM files into a single admin123 GeoJSON
function mergeAdminFiles(countryCode, countryName, adminLevels) {
  const allFeatures = [];
  
  console.log(`\n=== Merging ${countryName} (${countryCode}) admin files ===`);
  
  adminLevels.forEach(level => {
    const filePath = path.join(dataPath, `gadm41_${countryCode}_${level}.json`);
    console.log(`Checking: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      console.log(`Reading ${filePath}...`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Add layer info to each feature's properties
      data.features.forEach(feature => {
        feature.properties.layer = `gadm41_${countryCode}_${level}`;
        feature.properties.path = `gadm41_${countryCode}_${level}.json|layername=gadm41_${countryCode}_${level}`;
        
        // Ensure all admin level properties exist (set to null if not present)
        if (level === 1) {
          feature.properties.GID_2 = feature.properties.GID_2 || null;
          feature.properties.NAME_2 = feature.properties.NAME_2 || null;
          feature.properties.VARNAME_2 = feature.properties.VARNAME_2 || null;
          feature.properties.NL_NAME_2 = feature.properties.NL_NAME_2 || null;
          feature.properties.TYPE_2 = feature.properties.TYPE_2 || null;
          feature.properties.ENGTYPE_2 = feature.properties.ENGTYPE_2 || null;
          feature.properties.CC_2 = feature.properties.CC_2 || null;
          feature.properties.HASC_2 = feature.properties.HASC_2 || null;
          feature.properties.GID_3 = null;
          feature.properties.NAME_3 = null;
          feature.properties.VARNAME_3 = null;
          feature.properties.NL_NAME_3 = null;
          feature.properties.TYPE_3 = null;
          feature.properties.ENGTYPE_3 = null;
          feature.properties.CC_3 = null;
          feature.properties.HASC_3 = null;
        } else if (level === 2) {
          feature.properties.GID_3 = null;
          feature.properties.NAME_3 = null;
          feature.properties.VARNAME_3 = null;
          feature.properties.NL_NAME_3 = null;
          feature.properties.TYPE_3 = null;
          feature.properties.ENGTYPE_3 = null;
          feature.properties.CC_3 = null;
          feature.properties.HASC_3 = null;
        }
        
        allFeatures.push(feature);
      });
      console.log(`  Added ${data.features.length} features from level ${level}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
  });
  
  // Create merged GeoJSON
  const merged = {
    type: 'FeatureCollection',
    name: `${countryCode}_admin123`,
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
      }
    },
    features: allFeatures
  };
  
  // Write output file
  const outputPath = path.join(dataPath, `${countryCode}_admin123.geojson`);
  fs.writeFileSync(outputPath, JSON.stringify(merged));
  console.log(`Created ${outputPath} with ${allFeatures.length} total features`);
  
  // Verify file was created
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }
  
  return allFeatures.length;
}

console.log('Data path:', dataPath);

// Merge GAB (Gabon) - has levels 1 and 2
const gabCount = mergeAdminFiles('GAB', 'Gabon', [1, 2]);

// Merge CAF (Central African Republic) - has levels 1 and 2
const cafCount = mergeAdminFiles('CAF', 'Central African Republic', [1, 2]);

console.log('\n=== Summary ===');
console.log(`GAB_admin123.geojson: ${gabCount} features`);
console.log(`CAF_admin123.geojson: ${cafCount} features`);
console.log('Done!');
