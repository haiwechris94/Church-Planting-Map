/**
 * GeoJSON Village Names Extractor
 * 
 * This script reads the Admin 4 GeoJSON file and extracts
 * all village names to help match people group assignments.
 * 
 * Usage: node backend/scripts/listGeoJSONVillages.js
 */

const fs = require('fs');
const path = require('path');

function listGeoJSONVillages() {
  console.log('\n' + '═'.repeat(60));
  console.log('📍 GEOJSON VILLAGE NAMES EXTRACTOR');
  console.log('═'.repeat(60));
  
  // Try multiple possible paths
  const possiblePaths = [
    path.join(__dirname, '../../frontend/public/data/villages.geojson'),
    path.join(__dirname, '../../frontend/public/data/villages_voronoi.geojson'),
    path.join(__dirname, '../../frontend/public/data/Villages découpés.geojson'),
    path.join(__dirname, '../../frontend/public/data/voronoi.geojson'),
    path.join(__dirname, '../../frontend/public/data/Admin123CMR fusionnées.geojson')
  ];
  
  let geoJsonPath = null;
  let data = null;
  
  // Find the GeoJSON file
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      geoJsonPath = p;
      console.log(`\n✅ Found GeoJSON file: ${path.basename(p)}`);
      break;
    }
  }
  
  // If not found, list what's in the data directory
  if (!geoJsonPath) {
    const dataDir = path.join(__dirname, '../../frontend/public/data');
    console.log(`\n❌ No GeoJSON file found in expected locations.`);
    
    if (fs.existsSync(dataDir)) {
      console.log(`\n📁 Files in ${dataDir}:`);
      const files = fs.readdirSync(dataDir);
      files.forEach(f => {
        const stats = fs.statSync(path.join(dataDir, f));
        const size = (stats.size / 1024).toFixed(1);
        console.log(`   - ${f} (${size} KB)`);
      });
      
      // Try to find any .geojson or .json file
      const geoFiles = files.filter(f => f.endsWith('.geojson') || f.endsWith('.json'));
      if (geoFiles.length > 0) {
        geoJsonPath = path.join(dataDir, geoFiles[0]);
        console.log(`\n📄 Trying: ${geoFiles[0]}`);
      }
    } else {
      console.log(`\n📁 Data directory not found: ${dataDir}`);
      console.log('   Make sure the frontend/public/data directory exists.');
      return;
    }
  }
  
  if (!geoJsonPath) {
    console.log('\n❌ No GeoJSON file to process.');
    return;
  }
  
  // Read and parse the file
  try {
    console.log(`\n📖 Reading file...`);
    const fileContent = fs.readFileSync(geoJsonPath, 'utf8');
    data = JSON.parse(fileContent);
    console.log(`✅ Parsed successfully`);
  } catch (error) {
    console.error(`\n❌ Error reading/parsing file: ${error.message}`);
    return;
  }
  
  // Extract village names
  if (!data.features || !Array.isArray(data.features)) {
    console.log('\n❌ Invalid GeoJSON: no features array found');
    return;
  }
  
  console.log(`\n📊 Total features: ${data.features.length}`);
  
  // Try different property names for village name
  const nameProperties = ['name', 'NAME', 'ADM4_NAME', 'ADM4_EN', 'admin4Name', 'village_name', 'VILLAGE'];
  
  // Check what properties exist
  if (data.features.length > 0) {
    const sampleProps = data.features[0].properties;
    console.log('\n📋 Available properties in features:');
    Object.keys(sampleProps || {}).forEach(key => {
      console.log(`   - ${key}: "${sampleProps[key]}"`);
    });
  }
  
  // Extract names using available properties
  const villages = new Map();
  
  data.features.forEach((feature, index) => {
    const props = feature.properties || {};
    
    // Try each possible name property
    let villageName = null;
    for (const prop of nameProperties) {
      if (props[prop]) {
        villageName = props[prop];
        break;
      }
    }
    
    // If no name found, try the first string property
    if (!villageName) {
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === 'string' && value.length > 0 && value.length < 100) {
          villageName = value;
          break;
        }
      }
    }
    
    if (villageName) {
      if (!villages.has(villageName)) {
        villages.set(villageName, {
          name: villageName,
          count: 0,
          properties: props
        });
      }
      villages.get(villageName).count++;
    }
  });
  
  // Sort and display
  const sortedVillages = Array.from(villages.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  console.log('\n' + '═'.repeat(60));
  console.log(`📍 VILLAGES IN GEOJSON (${sortedVillages.length} unique)`);
  console.log('═'.repeat(60));
  console.log('');
  
  // Display in columns
  const columnWidth = 30;
  sortedVillages.forEach((v, i) => {
    const num = String(i + 1).padStart(3, ' ');
    const name = v.name.substring(0, columnWidth - 1).padEnd(columnWidth);
    const count = v.count > 1 ? ` (${v.count} features)` : '';
    console.log(`${num}. ${name}${count}`);
  });
  
  // Show some statistics
  console.log('\n' + '═'.repeat(60));
  console.log('📊 STATISTICS');
  console.log('═'.repeat(60));
  console.log(`\n   Total features: ${data.features.length}`);
  console.log(`   Unique villages: ${sortedVillages.length}`);
  
  // Show villages that might match our expected people groups
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 SEARCHING FOR MATCHING VILLAGES');
  console.log('═'.repeat(60));
  
  const searchTerms = ['Toupouri', 'Moundang', 'Bana', 'Guiziga', 'Maroua', 'Kaele', 'Mokolo', 'Mora'];
  
  console.log('\n');
  searchTerms.forEach(term => {
    const matches = sortedVillages.filter(v => 
      v.name.toLowerCase().includes(term.toLowerCase())
    );
    
    if (matches.length > 0) {
      console.log(`✅ "${term}" matches:`);
      matches.forEach(m => console.log(`   - ${m.name}`));
    } else {
      console.log(`❌ "${term}": No matches found`);
    }
  });
  
  // Export village names to a file for reference
  const outputPath = path.join(__dirname, 'village_names.txt');
  const output = sortedVillages.map(v => v.name).join('\n');
  fs.writeFileSync(outputPath, output);
  console.log(`\n📄 Village names exported to: ${outputPath}`);
  
  console.log('');
}

// Run the script
listGeoJSONVillages();
