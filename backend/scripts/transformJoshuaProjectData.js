/**
 * Joshua Project Data Transformer
 * 
 * This script transforms Joshua Project CSV data into the format required
 * by the Church Planting Map application.
 * 
 * Usage:
 *   1. Download Joshua Project CSV for Cameroon from https://joshuaproject.net/countries/CM
 *   2. Save it as 'joshua-project-cameroon.csv' in the project root
 *   3. Run: node scripts/transformJoshuaProjectData.js
 *   4. Import the generated 'joshua-project-transformed.csv' using the app's import feature
 */

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = process.argv[2] || 'joshua-project-cameroon.csv';
const OUTPUT_FILE = process.argv[3] || 'joshua-project-transformed.csv';

// Region code mapping (Joshua Project codes to Cameroon region names)
const REGION_MAP = {
  'CE': 'Centre',
  'AD': 'Adamawa',
  'ES': 'Est',
  'EN': 'Extrême-Nord',
  'LT': 'Littoral',
  'NO': 'Nord',
  'NW': 'Nord-Ouest',
  'OU': 'Ouest',
  'SU': 'Sud',
  'SW': 'Sud-Ouest',
  // Alternative codes
  'Centre': 'Centre',
  'Adamawa': 'Adamawa',
  'East': 'Est',
  'Far North': 'Extrême-Nord',
  'Littoral': 'Littoral',
  'North': 'Nord',
  'Northwest': 'Nord-Ouest',
  'West': 'Ouest',
  'South': 'Sud',
  'Southwest': 'Sud-Ouest',
};

// JPScale to status mapping
// 1 = Unreached, 2 = Minimally Reached, 3 = Superficially Reached, 
// 4 = Partially Reached, 5 = Significantly Reached
const JP_SCALE_TO_STATUS = {
  '1': 'unreached',
  '1.0': 'unreached',
  '1.1': 'unreached',
  '1.2': 'unreached',
  '2': 'unreached',
  '2.0': 'unreached',
  '2.1': 'pioneer',
  '2.2': 'pioneer',
  '3': 'pioneer',
  '3.0': 'pioneer',
  '3.1': 'midway',
  '3.2': 'midway',
  '4': 'midway',
  '4.0': 'midway',
  '4.1': 'tipping-point',
  '4.2': 'tipping-point',
  '5': 'tipping-point',
  '5.0': 'tipping-point',
};

// Common Joshua Project field names (they may vary)
const FIELD_ALIASES = {
  name: ['PeopNameInCountry', 'PeopleName', 'Name', 'PeopleGroup', 'Peuple', 'name'],
  population: ['Population', 'Pop', 'population'],
  latitude: ['Latitude', 'Lat', 'latitude'],
  longitude: ['Longitude', 'Lng', 'Long', 'longitude'],
  language: ['PrimaryLanguageName', 'Language', 'PrimaryLanguage', 'language'],
  religion: ['PrimaryReligion', 'Religion', 'religion'],
  region: ['ROG3', 'Region', 'Province', 'region'],
  country: ['Ctry', 'Country', 'country'],
  jpScale: ['JPScale', 'ProgressScale', 'Scale', 'jpScale'],
  percentEvangelical: ['PercentEvangelical', 'PctEvangelical', 'Evangelical'],
};

/**
 * Parse CSV content into array of objects
 */
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  
  // Parse header
  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Find field value using aliases
 */
function getFieldValue(row, fieldName) {
  const aliases = FIELD_ALIASES[fieldName] || [fieldName];
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== '') {
      return row[alias];
    }
  }
  return '';
}

/**
 * Map region code to region name
 */
function mapRegion(regionCode) {
  if (!regionCode) return '';
  return REGION_MAP[regionCode] || REGION_MAP[regionCode.toUpperCase()] || regionCode;
}

/**
 * Map JPScale to status
 */
function mapStatus(jpScale) {
  if (!jpScale) return 'unreached';
  const scale = jpScale.toString().trim();
  return JP_SCALE_TO_STATUS[scale] || 'unreached';
}

/**
 * Validate coordinates are within Cameroon bounds
 */
function validateCoordinates(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  // Cameroon bounds (approximate)
  const isValidLat = latitude >= 1.6 && latitude <= 13.1;
  const isValidLng = longitude >= 8.5 && longitude <= 16.2;
  
  return isValidLat && isValidLng;
}

/**
 * Transform Joshua Project row to app format
 */
function transformRow(row) {
  const name = getFieldValue(row, 'name');
  const population = getFieldValue(row, 'population');
  const latitude = getFieldValue(row, 'latitude');
  const longitude = getFieldValue(row, 'longitude');
  const language = getFieldValue(row, 'language');
  const religion = getFieldValue(row, 'religion');
  const region = getFieldValue(row, 'region');
  const country = getFieldValue(row, 'country') || 'Cameroon';
  const jpScale = getFieldValue(row, 'jpScale');
  
  // Skip rows without name or coordinates
  if (!name || !latitude || !longitude) {
    return null;
  }
  
  // Validate coordinates
  if (!validateCoordinates(latitude, longitude)) {
    console.warn(`Warning: Invalid coordinates for "${name}" (${latitude}, ${longitude})`);
  }
  
  const status = mapStatus(jpScale);
  
  return {
    name: name,
    villageName: '', // Not available from Joshua Project
    numberOfChurches: 0,
    churchGeneration: 0,
    description: `${language ? `Language: ${language}. ` : ''}${religion ? `Religion: ${religion}.` : ''}`.trim(),
    latitude: latitude,
    longitude: longitude,
    status: status,
    engagementStatus: status,
    population: population || 0,
    region: mapRegion(region),
    country: country,
    language: language,
    religion: religion,
  };
}

/**
 * Convert array of objects to CSV string
 */
function toCSV(rows) {
  if (rows.length === 0) return '';
  
  const headers = [
    'name',
    'villageName',
    'numberOfChurches',
    'churchGeneration',
    'description',
    'latitude',
    'longitude',
    'status',
    'engagementStatus',
    'population',
    'region',
    'country',
    'language',
    'religion'
  ];
  
  const csvRows = [headers.join(';')];
  
  for (const row of rows) {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape semicolons and quotes
      if (value.toString().includes(';') || value.toString().includes('"')) {
        return `"${value.toString().replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(';'));
  }
  
  return csvRows.join('\n');
}

/**
 * Main function
 */
function main() {
  console.log('Joshua Project Data Transformer');
  console.log('================================\n');
  
  // Check if input file exists
  const inputPath = path.resolve(INPUT_FILE);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    console.log('\nUsage:');
    console.log('  1. Download Joshua Project CSV for Cameroon');
    console.log('  2. Save it as "joshua-project-cameroon.csv" in the project root');
    console.log('  3. Run: node scripts/transformJoshuaProjectData.js');
    console.log('\nOr specify custom input/output files:');
    console.log('  node scripts/transformJoshuaProjectData.js <input.csv> <output.csv>');
    process.exit(1);
  }
  
  console.log(`Reading: ${inputPath}`);
  
  // Read and parse input file
  const content = fs.readFileSync(inputPath, 'utf-8');
  const rows = parseCSV(content);
  
  console.log(`Found ${rows.length} rows in input file\n`);
  
  // Transform rows
  const transformedRows = [];
  let skipped = 0;
  
  for (const row of rows) {
    const transformed = transformRow(row);
    if (transformed) {
      transformedRows.push(transformed);
    } else {
      skipped++;
    }
  }
  
  console.log(`Transformed: ${transformedRows.length} people groups`);
  console.log(`Skipped: ${skipped} rows (missing name or coordinates)\n`);
  
  // Generate statistics
  const statusCounts = {};
  let totalPopulation = 0;
  
  for (const row of transformedRows) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    totalPopulation += parseInt(row.population) || 0;
  }
  
  console.log('Status Distribution:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`  ${status}: ${count}`);
  }
  console.log(`\nTotal Population: ${totalPopulation.toLocaleString()}\n`);
  
  // Write output file
  const outputPath = path.resolve(OUTPUT_FILE);
  const csvContent = '\ufeff' + toCSV(transformedRows); // Add BOM for Excel UTF-8
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  
  console.log(`Output written to: ${outputPath}`);
  console.log('\nNext steps:');
  console.log('  1. Open the Church Planting Map application');
  console.log('  2. Go to Data Management > Import People Groups');
  console.log('  3. Upload the generated CSV file');
  console.log('  4. Click "Validate" to check the data');
  console.log('  5. Click "Import" to add the people groups');
}

// Run
main();
