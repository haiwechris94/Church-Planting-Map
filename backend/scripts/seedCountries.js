/**
 * Seed Countries Script
 * Populates the countries collection with Central African countries
 * 
 * Run with: node backend/scripts/seedCountries.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import Country model
const Country = require('../models/Country');

// Central African countries data
const centralAfricanCountries = [
  {
    code: 'CM',
    code3: 'CMR',
    name: 'Cameroon',
    nameFr: 'Cameroun',
    nameLocal: 'Cameroun',
    region: 'Central Africa',
    defaultCenter: { lat: 7.3697, lng: 12.3547 },
    defaultZoom: 6,
    bounds: { south: 1.6559, west: 8.4994, north: 13.0780, east: 16.1921 },
    capital: 'Yaoundé',
    area: 475442,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 10 },
      2: { name: 'Départements', nameEn: 'Departments', count: 58 },
      3: { name: 'Arrondissements', nameEn: 'Subdivisions', count: 360 },
    },
    languages: ['French', 'English'],
    currency: 'XAF',
    isActive: true,
    isDefault: true, // Cameroon is the default country
    dataAvailable: {
      adminPolygons: true,
      villages: true,
      villagesDecoupes: true,
      joshuaProject: true,
      dmmPeoples: true,
    },
  },
  {
    code: 'TD',
    code3: 'TCD',
    name: 'Chad',
    nameFr: 'Tchad',
    nameLocal: 'تشاد',
    region: 'Central Africa',
    defaultCenter: { lat: 15.4542, lng: 18.7322 },
    defaultZoom: 5,
    bounds: { south: 7.4419, west: 13.4734, north: 23.4505, east: 24.0000 },
    capital: "N'Djamena",
    area: 1284000,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 23 },
      2: { name: 'Départements', nameEn: 'Departments', count: 95 },
      3: { name: 'Sous-préfectures', nameEn: 'Sub-prefectures', count: 365 },
    },
    languages: ['French', 'Arabic'],
    currency: 'XAF',
    isActive: true,
    isDefault: false,
    dataAvailable: {
      adminPolygons: true,
      villages: false,
      villagesDecoupes: false,
      joshuaProject: true,
      dmmPeoples: false,
    },
  },
  {
    code: 'CF',
    code3: 'CAF',
    name: 'Central African Republic',
    nameFr: 'République centrafricaine',
    nameLocal: 'Ködörösêse tî Bêafrîka',
    region: 'Central Africa',
    defaultCenter: { lat: 6.6111, lng: 20.9394 },
    defaultZoom: 6,
    bounds: { south: 2.2205, west: 14.4200, north: 11.0076, east: 27.4583 },
    capital: 'Bangui',
    area: 622984,
    adminLevels: {
      1: { name: 'Préfectures', nameEn: 'Prefectures', count: 17 },
      2: { name: 'Sous-préfectures', nameEn: 'Sub-prefectures', count: 71 },
      3: { name: 'Communes', nameEn: 'Communes', count: 0 },
    },
    languages: ['French', 'Sango'],
    currency: 'XAF',
    isActive: true,
    isDefault: false,
    dataAvailable: {
      adminPolygons: true,
      villages: false,
      villagesDecoupes: false,
      joshuaProject: true,
      dmmPeoples: false,
    },
  },
  {
    code: 'CG',
    code3: 'COG',
    name: 'Congo',
    nameFr: 'Congo',
    nameLocal: 'Congo-Brazzaville',
    region: 'Central Africa',
    defaultCenter: { lat: -0.2280, lng: 15.8277 },
    defaultZoom: 6,
    bounds: { south: -5.0270, west: 11.2050, north: 3.7031, east: 18.6500 },
    capital: 'Brazzaville',
    area: 342000,
    adminLevels: {
      1: { name: 'Départements', nameEn: 'Departments', count: 12 },
      2: { name: 'Districts', nameEn: 'Districts', count: 86 },
      3: { name: 'Communes', nameEn: 'Communes', count: 0 },
    },
    languages: ['French', 'Lingala', 'Kituba'],
    currency: 'XAF',
    isActive: true,
    isDefault: false,
    dataAvailable: {
      adminPolygons: true,
      villages: false,
      villagesDecoupes: false,
      joshuaProject: true,
      dmmPeoples: false,
    },
  },
  {
    code: 'CD',
    code3: 'COD',
    name: 'Democratic Republic of the Congo',
    nameFr: 'République démocratique du Congo',
    nameLocal: 'Congo-Kinshasa',
    region: 'Central Africa',
    defaultCenter: { lat: -4.0383, lng: 21.7587 },
    defaultZoom: 5,
    bounds: { south: -13.4559, west: 12.2046, north: 5.3920, east: 31.3056 },
    capital: 'Kinshasa',
    area: 2344858,
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 26 },
      2: { name: 'Territoires', nameEn: 'Territories', count: 145 },
      3: { name: 'Secteurs/Chefferies', nameEn: 'Sectors', count: 737 },
    },
    languages: ['French', 'Lingala', 'Swahili', 'Kikongo', 'Tshiluba'],
    currency: 'CDF',
    isActive: true,
    isDefault: false,
    dataAvailable: {
      adminPolygons: true,
      villages: false,
      villagesDecoupes: false,
      joshuaProject: true,
      dmmPeoples: false,
    },
  },
  {
    code: 'GA',
    code3: 'GAB',
    name: 'Gabon',
    nameFr: 'Gabon',
    nameLocal: 'Gabon',
    region: 'Central Africa',
    defaultCenter: { lat: -0.8037, lng: 11.6094 },
    defaultZoom: 7,
    bounds: { south: -3.9785, west: 8.6954, north: 2.3226, east: 14.5024 },
    capital: 'Libreville',
    area: 267668,
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 9 },
      2: { name: 'Départements', nameEn: 'Departments', count: 50 },
      3: { name: 'Communes', nameEn: 'Communes', count: 0 },
    },
    languages: ['French'],
    currency: 'XAF',
    isActive: true,
    isDefault: false,
    dataAvailable: {
      adminPolygons: true,
      villages: false,
      villagesDecoupes: false,
      joshuaProject: true,
      dmmPeoples: false,
    },
  },
  {
    code: 'GQ',
    code3: 'GNQ',
    name: 'Equatorial Guinea',
    nameFr: 'Guinée équatoriale',
    nameLocal: 'Guinea Ecuatorial',
    region: 'Central Africa',
    defaultCenter: { lat: 1.6508, lng: 10.2679 },
    defaultZoom: 8,
    bounds: { south: -1.4689, west: 5.6172, north: 3.7886, east: 11.3357 },
    capital: 'Malabo',
    area: 28051,
    adminLevels: {
      1: { name: 'Provincias', nameEn: 'Provinces', count: 8 },
      2: { name: 'Distritos', nameEn: 'Districts', count: 19 },
      3: { name: 'Municipios', nameEn: 'Municipalities', count: 0 },
    },
    languages: ['Spanish', 'French', 'Portuguese'],
    currency: 'XAF',
    isActive: true,
    isDefault: false,
    dataAvailable: {
      adminPolygons: true,
      villages: false,
      villagesDecoupes: false,
      joshuaProject: true,
      dmmPeoples: false,
    },
  },
  {
    code: 'ST',
    code3: 'STP',
    name: 'São Tomé and Príncipe',
    nameFr: 'Sao Tomé-et-Príncipe',
    nameLocal: 'São Tomé e Príncipe',
    region: 'Central Africa',
    defaultCenter: { lat: 0.1864, lng: 6.6131 },
    defaultZoom: 10,
    bounds: { south: -0.0135, west: 6.4701, north: 1.7013, east: 7.4663 },
    capital: 'São Tomé',
    area: 964,
    adminLevels: {
      1: { name: 'Distritos', nameEn: 'Districts', count: 7 },
      2: { name: 'Localidades', nameEn: 'Localities', count: 0 },
      3: { name: '', nameEn: '', count: 0 },
    },
    languages: ['Portuguese'],
    currency: 'STN',
    isActive: true,
    isDefault: false,
    dataAvailable: {
      adminPolygons: true,
      villages: false,
      villagesDecoupes: false,
      joshuaProject: true,
      dmmPeoples: false,
    },
  },
];

async function seedCountries() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing countries (optional - comment out to preserve existing data)
    console.log('🗑️  Clearing existing countries...');
    await Country.deleteMany({});

    // Insert countries
    console.log('📍 Seeding Central African countries...');
    const result = await Country.insertMany(centralAfricanCountries);
    console.log(`✅ Successfully seeded ${result.length} countries:`);
    
    result.forEach(country => {
      console.log(`   - ${country.name} (${country.code}/${country.code3})${country.isDefault ? ' [DEFAULT]' : ''}`);
    });

    // Verify
    const count = await Country.countDocuments();
    console.log(`\n📊 Total countries in database: ${count}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding countries:', error);
    process.exit(1);
  }
}

// Run the seed function
seedCountries();
