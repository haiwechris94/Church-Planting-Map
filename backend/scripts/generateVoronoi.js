/**
 * Script to generate Voronoi diagram GeoJSON from villages
 * Run with: node scripts/generateVoronoi.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const d3 = require('d3-delaunay');

// Import Village model
const Village = require('../models/Village');

async function generateVoronoiGeoJSON() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📍 Fetching villages...');
    const villages = await Village.find({
      location: { $exists: true }
    }).select('name location');

    if (!villages || villages.length === 0) {
      console.log('❌ No villages found with location data');
      process.exit(1);
    }

    console.log(`✅ Found ${villages.length} villages`);

    // Extract points for Voronoi calculation
    const points = villages.map(v => [
      v.location.coordinates[0], // longitude
      v.location.coordinates[1]  // latitude
    ]);

    console.log('🔷 Calculating Voronoi diagram...');

    // Calculate bounds with padding
    const lngs = points.map(p => p[0]);
    const lats = points.map(p => p[1]);
    const padding = 0.5; // degrees
    const bounds = [
      Math.min(...lngs) - padding,
      Math.min(...lats) - padding,
      Math.max(...lngs) + padding,
      Math.max(...lats) + padding
    ];

    console.log(`📐 Bounds: [${bounds.join(', ')}]`);

    // Create Delaunay triangulation
    const delaunay = d3.Delaunay.from(points);
    
    // Create Voronoi diagram
    const voronoi = delaunay.voronoi(bounds);

    // Generate GeoJSON features
    const features = [];
    for (let i = 0; i < points.length; i++) {
      const cell = voronoi.cellPolygon(i);
      if (cell) {
        // Convert to GeoJSON polygon format [lng, lat]
        const coordinates = [cell.map(coord => [coord[0], coord[1]])];
        
        // Calculate area (approximate)
        const area = calculatePolygonArea(coordinates[0]);
        
        features.push({
          type: 'Feature',
          properties: {
            village_id: villages[i]._id.toString(),
            village_name: villages[i].name,
            center: points[i],
            area: area
          },
          geometry: {
            type: 'Polygon',
            coordinates: coordinates
          }
        });
      }
    }

    // Create GeoJSON FeatureCollection
    const geojson = {
      type: 'FeatureCollection',
      features: features
    };

    console.log(`✅ Generated ${features.length} Voronoi polygons`);

    // Save to file
    const outputPath = path.join(__dirname, '../../frontend/public/data/voronoi.geojson');
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
    console.log(`💾 Saved to: ${outputPath}`);

    // Print stats
    const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);
    console.log(`📊 File size: ${fileSize} KB`);
    console.log('✅ Voronoi diagram generated successfully!');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error generating Voronoi diagram:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

/**
 * Calculate approximate area of a polygon in square kilometers
 * Using spherical excess formula for better accuracy
 */
function calculatePolygonArea(coordinates) {
  if (coordinates.length < 3) return 0;

  let area = 0;
  const R = 6371; // Earth's radius in km

  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[j];
    
    area += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
  }

  area = Math.abs(area * R * R / 2);
  return area;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

// Run the script
generateVoronoiGeoJSON();
