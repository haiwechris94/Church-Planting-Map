/**
 * Script to generate Voronoi polygons and update village boundaries in database
 * Run with: node scripts/updateVillageBoundaries.js [countryCode]
 * Example: node scripts/updateVillageBoundaries.js COG
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const turf = require('@turf/turf');

// Import Village model
const Village = require('../models/Village');

/**
 * Generate Voronoi diagram from village points
 */
function generateVoronoiDiagram(villages, options = {}) {
  const { padding = 0.5 } = options;

  // Filter villages with valid coordinates
  const validVillages = villages.filter(v => 
    v.location?.coordinates && 
    Array.isArray(v.location.coordinates) &&
    v.location.coordinates.length === 2
  );

  if (validVillages.length < 3) {
    throw new Error('Minimum 3 villages with valid coordinates required for Voronoi diagram');
  }

  console.log(`📍 Generating Voronoi for ${validVillages.length} villages`);

  // Create GeoJSON points from villages
  const points = turf.featureCollection(
    validVillages.map(village => 
      turf.point(village.location.coordinates, {
        villageId: village._id.toString(),
        name: village.name
      })
    )
  );

  // Calculate bounding box with padding
  const bbox = turf.bbox(points);
  const paddedBbox = [
    bbox[0] - padding, // minX (west)
    bbox[1] - padding, // minY (south)
    bbox[2] + padding, // maxX (east)
    bbox[3] + padding  // maxY (north)
  ];

  console.log(`📐 Bounding box: [${paddedBbox.join(', ')}]`);

  // Generate Voronoi polygons
  const voronoiPolygons = turf.voronoi(points, { bbox: paddedBbox });

  // Map polygons back to villages
  const villagePolygons = voronoiPolygons.features
    .map((polygon, index) => {
      if (!polygon || !polygon.geometry) return null;
      
      const village = validVillages[index];
      return {
        villageId: village._id,
        villageName: village.name,
        boundary: polygon.geometry // This is the Polygon GeoJSON
      };
    })
    .filter(v => v !== null);

  return villagePolygons;
}

/**
 * Update villages with boundary data
 */
async function updateVillageBoundaries(countryCode = null) {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Build query
    const query = {
      'location.coordinates': { $exists: true }
    };

    if (countryCode) {
      // Try both countryCode and country name matching
      const countryCodeUpper = countryCode.toUpperCase();
      
      // Map ISO 3166-1 alpha-3 to alpha-2 codes
      const countryCodeMap = {
        'COG': 'CG',  // Congo (Brazzaville)
        'COD': 'CD',  // Congo (Kinshasa)
        'CMR': 'CM',  // Cameroon
        'TCD': 'TD',  // Chad
        'CAF': 'CF',  // Central African Republic
        'GAB': 'GA',  // Gabon
        'GNQ': 'GQ',  // Equatorial Guinea
      };
      
      const alpha2Code = countryCodeMap[countryCodeUpper] || countryCodeUpper;
      
      query.$or = [
        { countryCode: countryCodeUpper },
        { 'osmData.countryCode': alpha2Code },
        { country: new RegExp(countryCode, 'i') }
      ];
      console.log(`🌍 Filtering for country: ${countryCodeUpper} (OSM code: ${alpha2Code})`);
    }

    console.log('📍 Fetching villages...');
    const villages = await Village.find(query)
      .select('_id name location country countryCode');

    if (!villages || villages.length === 0) {
      console.log('❌ No villages found with the specified criteria');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Found ${villages.length} villages`);

    // Generate Voronoi polygons
    console.log('🔷 Generating Voronoi diagram...');
    const villagePolygons = generateVoronoiDiagram(villages, { padding: 0.5 });

    console.log(`✅ Generated ${villagePolygons.length} Voronoi polygons`);

    // Update villages in database
    console.log('💾 Updating villages in database...');
    let successCount = 0;
    let errorCount = 0;

    for (const vp of villagePolygons) {
      try {
        await Village.findByIdAndUpdate(
          vp.villageId,
          {
            $set: {
              boundary: vp.boundary
            }
          },
          { runValidators: true }
        );
        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`  ✓ Updated ${successCount}/${villagePolygons.length} villages...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Error updating village ${vp.villageName}:`, error.message);
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`  ✅ Successfully updated: ${successCount} villages`);
    console.log(`  ❌ Errors: ${errorCount} villages`);
    console.log(`  📍 Total processed: ${villagePolygons.length} villages`);

    // Verify the update
    console.log('\n🔍 Verifying updates...');
    const verifyQuery = {
      'boundary.coordinates': { $exists: true, $ne: null }
    };
    
    if (countryCode) {
      const countryCodeUpper = countryCode.toUpperCase();
      const countryCodeMap = {
        'COG': 'CG',
        'COD': 'CD',
        'CMR': 'CM',
        'TCD': 'TD',
        'CAF': 'CF',
        'GAB': 'GA',
        'GNQ': 'GQ',
      };
      const alpha2Code = countryCodeMap[countryCodeUpper] || countryCodeUpper;
      
      verifyQuery.$or = [
        { countryCode: countryCodeUpper },
        { 'osmData.countryCode': alpha2Code },
        { country: new RegExp(countryCode, 'i') }
      ];
    }
    
    const villagesWithBoundaries = await Village.countDocuments(verifyQuery);

    console.log(`✅ Villages with boundaries: ${villagesWithBoundaries}`);

    await mongoose.disconnect();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get country code from command line arguments
const countryCode = process.argv[2];

if (countryCode) {
  console.log(`\n🚀 Starting boundary update for country: ${countryCode}\n`);
} else {
  console.log('\n🚀 Starting boundary update for ALL villages\n');
  console.log('⚠️  To update a specific country, run: node scripts/updateVillageBoundaries.js [COUNTRY_CODE]');
  console.log('   Example: node scripts/updateVillageBoundaries.js COG\n');
}

// Run the script
updateVillageBoundaries(countryCode);
