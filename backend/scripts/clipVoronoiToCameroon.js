/**
 * Script to clip Voronoi polygons to Cameroon administrative boundaries
 * 
 * OPTIMIZED VERSION: Uses region-by-region clipping for better performance
 * 
 * Run with: node scripts/clipVoronoiToCameroon.js
 * 
 * Input files:
 *   - frontend/public/data/villages_voronoi.geojson (Voronoi polygons)
 *   - frontend/public/data/gadm41_CMR_1.json (Cameroon regions)
 * 
 * Output file:
 *   - frontend/public/data/villages_voronoi_clipped.geojson
 */

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// File paths
const VORONOI_INPUT = path.join(__dirname, '../../frontend/public/data/villages_voronoi.geojson');
const CAMEROON_BOUNDARY = path.join(__dirname, '../../frontend/public/data/gadm41_CMR_1.json');
const OUTPUT_FILE = path.join(__dirname, '../../frontend/public/data/villages_voronoi_clipped.geojson');

/**
 * Load and parse a GeoJSON file
 */
function loadGeoJSON(filePath) {
  console.log(`📂 Loading: ${path.basename(filePath)}`);
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

/**
 * Check if two bounding boxes overlap
 */
function bboxOverlap(bbox1, bbox2) {
  return !(bbox1[2] < bbox2[0] || bbox1[0] > bbox2[2] ||
           bbox1[3] < bbox2[1] || bbox1[1] > bbox2[3]);
}

/**
 * Clip a Voronoi polygon against a single region
 */
function clipToRegion(voronoiFeature, region, regionBbox) {
  try {
    const featureBbox = turf.bbox(voronoiFeature);
    
    // Quick bbox check
    if (!bboxOverlap(featureBbox, regionBbox)) {
      return null;
    }
    
    // Perform intersection
    const clipped = turf.intersect(
      turf.featureCollection([voronoiFeature, region])
    );
    
    return clipped;
  } catch (error) {
    return null;
  }
}

/**
 * Main function to clip all Voronoi polygons
 */
async function clipVoronoiToCameroon() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Voronoi Polygon Clipping Tool for Cameroon (Optimized)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const startTime = Date.now();
  
  try {
    // Check if input files exist
    if (!fs.existsSync(VORONOI_INPUT)) {
      throw new Error(`Voronoi file not found: ${VORONOI_INPUT}`);
    }
    if (!fs.existsSync(CAMEROON_BOUNDARY)) {
      throw new Error(`Cameroon boundary file not found: ${CAMEROON_BOUNDARY}`);
    }
    
    // Load input files
    const voronoiData = loadGeoJSON(VORONOI_INPUT);
    const cameroonRegions = loadGeoJSON(CAMEROON_BOUNDARY);
    
    const totalVoronoi = voronoiData.features.length;
    console.log(`📊 Input Voronoi polygons: ${totalVoronoi}`);
    console.log(`🗺️  Cameroon regions: ${cameroonRegions.features.length}`);
    
    // Pre-calculate bounding boxes for all regions
    const regions = cameroonRegions.features.map(region => ({
      feature: region,
      bbox: turf.bbox(region),
      name: region.properties.NAME_1
    }));
    
    // Calculate overall Cameroon bbox
    const cameroonBbox = [
      Math.min(...regions.map(r => r.bbox[0])),
      Math.min(...regions.map(r => r.bbox[1])),
      Math.max(...regions.map(r => r.bbox[2])),
      Math.max(...regions.map(r => r.bbox[3]))
    ];
    console.log(`📐 Cameroon bbox: [${cameroonBbox.map(n => n.toFixed(2)).join(', ')}]`);
    
    // Process each Voronoi polygon
    console.log('\n✂️  Clipping Voronoi polygons...\n');
    
    const clippedFeatures = [];
    const processedIds = new Set(); // Track which polygons we've processed
    let outsideCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < totalVoronoi; i++) {
      const voronoi = voronoiData.features[i];
      const voronoiBbox = turf.bbox(voronoi);
      
      // Progress indicator
      if ((i + 1) % 500 === 0 || i === totalVoronoi - 1) {
        const percent = ((i + 1) / totalVoronoi * 100).toFixed(1);
        console.log(`   Progress: ${i + 1}/${totalVoronoi} (${percent}%) - Clipped: ${clippedFeatures.length}`);
      }
      
      // Quick check: is this polygon even near Cameroon?
      if (!bboxOverlap(voronoiBbox, cameroonBbox)) {
        outsideCount++;
        continue;
      }
      
      // Try to clip against each region
      let clippedParts = [];
      
      for (const region of regions) {
        const clipped = clipToRegion(voronoi, region.feature, region.bbox);
        if (clipped && clipped.geometry) {
          clippedParts.push(clipped);
        }
      }
      
      // If we got any clipped parts, merge them
      if (clippedParts.length > 0) {
        try {
          let finalClipped;
          
          if (clippedParts.length === 1) {
            finalClipped = clippedParts[0];
          } else {
            // Union all parts together
            finalClipped = clippedParts[0];
            for (let j = 1; j < clippedParts.length; j++) {
              const merged = turf.union(
                turf.featureCollection([finalClipped, clippedParts[j]])
              );
              if (merged) {
                finalClipped = merged;
              }
            }
          }
          
          if (finalClipped && finalClipped.geometry) {
            // Preserve original properties
            finalClipped.properties = { ...voronoi.properties };
            
            // Recalculate area
            const areaKm2 = turf.area(finalClipped) / 1000000;
            finalClipped.properties.area = areaKm2;
            finalClipped.properties.clipped = true;
            
            clippedFeatures.push(finalClipped);
          }
        } catch (error) {
          failedCount++;
        }
      } else {
        outsideCount++;
      }
    }
    
    console.log('\n');
    
    // Create output GeoJSON
    const outputGeoJSON = {
      type: 'FeatureCollection',
      name: 'villages_voronoi_clipped',
      crs: voronoiData.crs || {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
      },
      metadata: {
        description: 'Voronoi polygons clipped to Cameroon national boundary',
        source: 'villages_voronoi.geojson',
        boundary: 'gadm41_CMR_1.json',
        generatedAt: new Date().toISOString(),
        originalCount: totalVoronoi,
        clippedCount: clippedFeatures.length
      },
      features: clippedFeatures
    };
    
    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save output file
    console.log('💾 Saving clipped GeoJSON...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputGeoJSON));
    
    // Calculate statistics
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const inputSize = (fs.statSync(VORONOI_INPUT).size / 1024 / 1024).toFixed(2);
    const outputSize = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
    
    // Calculate total area
    let totalArea = 0;
    clippedFeatures.forEach(f => {
      if (f.properties && f.properties.area) {
        totalArea += f.properties.area;
      }
    });
    
    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   ✅ Successfully clipped: ${clippedFeatures.length} polygons`);
    console.log(`   ⏭️  Outside Cameroon: ${outsideCount} polygons`);
    console.log(`   ❌ Failed to process: ${failedCount} polygons`);
    console.log(`   📐 Total coverage area: ${totalArea.toFixed(2)} km²`);
    console.log(`   📁 Input file size: ${inputSize} MB`);
    console.log(`   📁 Output file size: ${outputSize} MB`);
    console.log(`   ⏱️  Processing time: ${duration} seconds`);
    console.log(`   📍 Output: ${OUTPUT_FILE}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('✅ Voronoi clipping completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update VoronoiLayer.jsx to use villages_voronoi_clipped.geojson');
    console.log('   2. Or pass the new URL as a prop to VoronoiLayer component');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
clipVoronoiToCameroon();
