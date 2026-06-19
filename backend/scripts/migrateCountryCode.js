/**
 * Migration script to add countryCode field to existing PeopleGroup documents
 * 
 * This script:
 * 1. Finds all people groups without a countryCode
 * 2. Maps country names to ISO 3166-1 alpha-2 codes
 * 3. Updates documents with the appropriate countryCode
 * 
 * Usage: node backend/scripts/migrateCountryCode.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PeopleGroup = require('../models/PeopleGroup');

// Country name to ISO 3166-1 alpha-2 code mapping
const countryNameToCode = {
  // Africa
  'Cameroon': 'CM',
  'Cameroun': 'CM',
  'Nigeria': 'NG',
  'Chad': 'TD',
  'Tchad': 'TD',
  'Central African Republic': 'CF',
  'République centrafricaine': 'CF',
  'Gabon': 'GA',
  'Equatorial Guinea': 'GQ',
  'Guinée équatoriale': 'GQ',
  'Congo': 'CG',
  'Democratic Republic of the Congo': 'CD',
  'République démocratique du Congo': 'CD',
  'South Sudan': 'SS',
  'Soudan du Sud': 'SS',
  'Sudan': 'SD',
  'Soudan': 'SD',
  'Ethiopia': 'ET',
  'Éthiopie': 'ET',
  'Kenya': 'KE',
  'Uganda': 'UG',
  'Ouganda': 'UG',
  'Tanzania': 'TZ',
  'Tanzanie': 'TZ',
  'Rwanda': 'RW',
  'Burundi': 'BI',
  'South Africa': 'ZA',
  'Afrique du Sud': 'ZA',
  'Ghana': 'GH',
  'Ivory Coast': 'CI',
  "Côte d'Ivoire": 'CI',
  'Senegal': 'SN',
  'Sénégal': 'SN',
  'Mali': 'ML',
  'Burkina Faso': 'BF',
  'Niger': 'NE',
  'Benin': 'BJ',
  'Bénin': 'BJ',
  'Togo': 'TG',
  'Guinea': 'GN',
  'Guinée': 'GN',
  'Sierra Leone': 'SL',
  'Liberia': 'LR',
  'Mauritania': 'MR',
  'Mauritanie': 'MR',
  'Morocco': 'MA',
  'Maroc': 'MA',
  'Algeria': 'DZ',
  'Algérie': 'DZ',
  'Tunisia': 'TN',
  'Tunisie': 'TN',
  'Libya': 'LY',
  'Libye': 'LY',
  'Egypt': 'EG',
  'Égypte': 'EG',
  'Mozambique': 'MZ',
  'Zimbabwe': 'ZW',
  'Zambia': 'ZM',
  'Zambie': 'ZM',
  'Malawi': 'MW',
  'Botswana': 'BW',
  'Namibia': 'NA',
  'Namibie': 'NA',
  'Angola': 'AO',
  'Madagascar': 'MG',
  'Mauritius': 'MU',
  'Maurice': 'MU',
  'Seychelles': 'SC',
  'Comoros': 'KM',
  'Comores': 'KM',
  'Djibouti': 'DJ',
  'Eritrea': 'ER',
  'Érythrée': 'ER',
  'Somalia': 'SO',
  'Somalie': 'SO',
  
  // Other regions (add as needed)
  'United States': 'US',
  'États-Unis': 'US',
  'Canada': 'CA',
  'Mexico': 'MX',
  'Mexique': 'MX',
  'Brazil': 'BR',
  'Brésil': 'BR',
  'Argentina': 'AR',
  'Argentine': 'AR',
  'France': 'FR',
  'Germany': 'DE',
  'Allemagne': 'DE',
  'United Kingdom': 'GB',
  'Royaume-Uni': 'GB',
  'Spain': 'ES',
  'Espagne': 'ES',
  'Italy': 'IT',
  'Italie': 'IT',
  'China': 'CN',
  'Chine': 'CN',
  'India': 'IN',
  'Inde': 'IN',
  'Japan': 'JP',
  'Japon': 'JP',
  'Australia': 'AU',
  'Australie': 'AU',
};

async function migrateCountryCodes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all people groups without countryCode
    const peopleGroupsWithoutCode = await PeopleGroup.find({
      $or: [
        { countryCode: { $exists: false } },
        { countryCode: null },
        { countryCode: '' }
      ]
    });

    console.log(`Found ${peopleGroupsWithoutCode.length} people groups without countryCode`);

    let updated = 0;
    let skipped = 0;
    const unmappedCountries = new Set();

    for (const pg of peopleGroupsWithoutCode) {
      if (pg.country) {
        // Try to find the country code
        const countryCode = countryNameToCode[pg.country] || 
                           countryNameToCode[pg.country.trim()] ||
                           countryNameToCode[pg.country.charAt(0).toUpperCase() + pg.country.slice(1).toLowerCase()];
        
        if (countryCode) {
          await PeopleGroup.updateOne(
            { _id: pg._id },
            { $set: { countryCode: countryCode } }
          );
          updated++;
          console.log(`Updated: ${pg.name} (${pg.country}) -> ${countryCode}`);
        } else {
          unmappedCountries.add(pg.country);
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Total processed: ${peopleGroupsWithoutCode.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    
    if (unmappedCountries.size > 0) {
      console.log('\nUnmapped countries (add to mapping if needed):');
      unmappedCountries.forEach(c => console.log(`  - "${c}"`));
    }

    // Also update any records that have country='Cameroon' but no countryCode
    const cameroonUpdate = await PeopleGroup.updateMany(
      { 
        country: { $regex: /cameroon|cameroun/i },
        $or: [
          { countryCode: { $exists: false } },
          { countryCode: null },
          { countryCode: '' }
        ]
      },
      { $set: { countryCode: 'CM' } }
    );
    console.log(`\nAdditional Cameroon records updated: ${cameroonUpdate.modifiedCount}`);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
migrateCountryCodes();
