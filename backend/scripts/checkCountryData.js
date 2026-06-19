/**
 * Script to check country data in villages collection
 * Run with: node scripts/checkCountryData.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

// Import Village model
const Village = require('../models/Village');

async function checkCountryData() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get distinct country values
    console.log('📊 Checking distinct country values...');
    const countries = await Village.distinct('country');
    console.log('Countries found:', countries);
    console.log('Total unique countries:', countries.length);
    console.log('');

    // Get distinct osmData.countryCode values
    console.log('📊 Checking distinct OSM country codes...');
    const osmCountryCodes = await Village.distinct('osmData.countryCode');
    console.log('OSM Country Codes found:', osmCountryCodes);
    console.log('Total unique OSM codes:', osmCountryCodes.length);
    console.log('');

    // Check for COG specifically
    console.log('🔍 Checking for COG (Congo) data...');
    const cogByCountry = await Village.countDocuments({ country: 'COG' });
    const cogByCountryName = await Village.countDocuments({ country: /Congo/i });
    const cogByOsmCode = await Village.countDocuments({ 'osmData.countryCode': 'COG' });
    
    console.log(`Villages with country = "COG": ${cogByCountry}`);
    console.log(`Villages with country matching "Congo": ${cogByCountryName}`);
    console.log(`Villages with osmData.countryCode = "COG": ${cogByOsmCode}`);
    console.log('');

    // Sample a few villages to see the data structure
    console.log('📋 Sample village data:');
    const samples = await Village.find({ country: /Congo/i }).limit(3).select('name country osmData.countryCode location boundary');
    samples.forEach((v, i) => {
      console.log(`\nSample ${i + 1}:`);
      console.log(`  Name: ${v.name}`);
      console.log(`  Country: ${v.country}`);
      console.log(`  OSM Country Code: ${v.osmData?.countryCode}`);
      console.log(`  Has Boundary: ${!!v.boundary}`);
      console.log(`  Boundary Type: ${v.boundary?.type}`);
    });

    // Check Central African Republic data
    console.log('\n🔍 Checking Central African Republic data...');
    const carCount = await Village.countDocuments({ country: /Central African Republic/i });
    const carOsmCount = await Village.countDocuments({ 'osmData.countryCode': 'CF' });
    console.log(`Villages with country matching "Central African Republic": ${carCount}`);
    console.log(`Villages with osmData.countryCode = "CF": ${carOsmCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

checkCountryData();
