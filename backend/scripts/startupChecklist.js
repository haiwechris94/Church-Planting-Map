#!/usr/bin/env node
/**
 * Startup Checklist Script
 * Verifies all required services and configurations are ready
 * 
 * Usage: node scripts/startupChecklist.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${colors.bold}═══ ${msg} ═══${colors.reset}\n`),
};

// Check results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: [],
};

function addResult(name, status, message = '') {
  results.checks.push({ name, status, message });
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else if (status === 'warn') results.warnings++;
}

async function checkEnvironmentVariables() {
  log.header('ENVIRONMENT VARIABLES');

  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const optional = ['PORT', 'NODE_ENV', 'FRONTEND_URL'];

  for (const varName of required) {
    if (process.env[varName]) {
      log.success(`${varName} is set`);
      addResult(`ENV: ${varName}`, 'pass');
    } else {
      log.error(`${varName} is NOT set (required)`);
      addResult(`ENV: ${varName}`, 'fail', 'Required environment variable missing');
    }
  }

  for (const varName of optional) {
    if (process.env[varName]) {
      log.success(`${varName} is set: ${varName === 'JWT_SECRET' ? '***' : process.env[varName]}`);
      addResult(`ENV: ${varName}`, 'pass');
    } else {
      log.warning(`${varName} is not set (optional)`);
      addResult(`ENV: ${varName}`, 'warn', 'Optional variable not set');
    }
  }
}

async function checkMongoDBConnection() {
  log.header('MONGODB CONNECTION');

  try {
    log.info('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    
    log.success('MongoDB connection successful');
    addResult('MongoDB Connection', 'pass');

    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    log.info(`Found ${collections.length} collections`);
    
    const requiredCollections = ['users', 'peoplegroups', 'villages'];
    for (const col of requiredCollections) {
      if (collectionNames.includes(col)) {
        log.success(`Collection '${col}' exists`);
        addResult(`Collection: ${col}`, 'pass');
      } else {
        log.warning(`Collection '${col}' not found (will be created on first use)`);
        addResult(`Collection: ${col}`, 'warn', 'Collection does not exist yet');
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    addResult('MongoDB Connection', 'fail', error.message);
  }
}

async function checkRequiredFiles() {
  log.header('REQUIRED FILES');

  const files = [
    { path: '.env', required: true },
    { path: 'server.js', required: true },
    { path: 'package.json', required: true },
    { path: 'data/cameroon_villages.geojson', required: false },
    { path: 'frontend/package.json', required: true },
    { path: 'frontend/src/main.jsx', required: true },
  ];

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file.path);
    if (fs.existsSync(fullPath)) {
      log.success(`${file.path} exists`);
      addResult(`File: ${file.path}`, 'pass');
    } else if (file.required) {
      log.error(`${file.path} NOT FOUND (required)`);
      addResult(`File: ${file.path}`, 'fail', 'Required file missing');
    } else {
      log.warning(`${file.path} not found (optional)`);
      addResult(`File: ${file.path}`, 'warn', 'Optional file missing');
    }
  }
}

async function checkNodeModules() {
  log.header('NODE MODULES');

  const backendModules = path.join(process.cwd(), 'node_modules');
  const frontendModules = path.join(process.cwd(), 'frontend', 'node_modules');

  if (fs.existsSync(backendModules)) {
    log.success('Backend node_modules exists');
    addResult('Backend Dependencies', 'pass');
  } else {
    log.error('Backend node_modules NOT FOUND - run: npm install');
    addResult('Backend Dependencies', 'fail', 'Run npm install');
  }

  if (fs.existsSync(frontendModules)) {
    log.success('Frontend node_modules exists');
    addResult('Frontend Dependencies', 'pass');
  } else {
    log.error('Frontend node_modules NOT FOUND - run: cd frontend && npm install');
    addResult('Frontend Dependencies', 'fail', 'Run cd frontend && npm install');
  }
}

async function checkAPIEndpoint() {
  log.header('API ENDPOINT');

  const port = process.env.PORT || 5000;
  const url = `http://localhost:${port}/health`;

  return new Promise((resolve) => {
    log.info(`Checking API at ${url}...`);
    
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          log.success(`API is running on port ${port}`);
          try {
            const health = JSON.parse(data);
            log.info(`  Status: ${health.status}`);
            log.info(`  MongoDB: ${health.mongodb}`);
            log.info(`  Socket connections: ${health.socketConnections}`);
            addResult('API Health', 'pass');
          } catch (e) {
            addResult('API Health', 'pass', 'Response received but not JSON');
          }
        } else {
          log.warning(`API returned status ${res.statusCode}`);
          addResult('API Health', 'warn', `Status code: ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        log.warning(`API not running on port ${port} - start with: npm run dev`);
        addResult('API Health', 'warn', 'Server not running');
      } else {
        log.error(`API check failed: ${error.message}`);
        addResult('API Health', 'fail', error.message);
      }
      resolve();
    });

    req.on('timeout', () => {
      log.warning('API request timed out');
      addResult('API Health', 'warn', 'Request timed out');
      req.destroy();
      resolve();
    });
  });
}

async function checkGeoJSONData() {
  log.header('GEOJSON DATA');

  const geoJsonPath = path.join(process.cwd(), 'data', 'cameroon_villages.geojson');

  if (!fs.existsSync(geoJsonPath)) {
    log.warning('GeoJSON file not found at data/cameroon_villages.geojson');
    addResult('GeoJSON Data', 'warn', 'File not found');
    return;
  }

  try {
    const stats = fs.statSync(geoJsonPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    log.info(`GeoJSON file size: ${sizeMB} MB`);

    const data = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
    
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      log.success(`GeoJSON contains ${data.features.length} features`);
      addResult('GeoJSON Data', 'pass', `${data.features.length} villages`);
      
      // Sample check
      const sample = data.features[0];
      if (sample?.properties?.name || sample?.properties?.NAME) {
        log.success('Features have name property');
      } else {
        log.warning('Features may be missing name property');
      }
    } else {
      log.warning('GeoJSON structure may be invalid');
      addResult('GeoJSON Data', 'warn', 'Invalid structure');
    }
  } catch (error) {
    log.error(`Error reading GeoJSON: ${error.message}`);
    addResult('GeoJSON Data', 'fail', error.message);
  }
}

async function checkUploadsDirectory() {
  log.header('UPLOADS DIRECTORY');

  const uploadsPath = path.join(process.cwd(), 'uploads');

  if (fs.existsSync(uploadsPath)) {
    log.success('Uploads directory exists');
    
    // Check if writable
    try {
      const testFile = path.join(uploadsPath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      log.success('Uploads directory is writable');
      addResult('Uploads Directory', 'pass');
    } catch (error) {
      log.error('Uploads directory is not writable');
      addResult('Uploads Directory', 'fail', 'Not writable');
    }
  } else {
    log.warning('Uploads directory does not exist - creating...');
    try {
      fs.mkdirSync(uploadsPath, { recursive: true });
      log.success('Created uploads directory');
      addResult('Uploads Directory', 'pass', 'Created');
    } catch (error) {
      log.error(`Failed to create uploads directory: ${error.message}`);
      addResult('Uploads Directory', 'fail', error.message);
    }
  }
}

async function printSummary() {
  log.header('STARTUP CHECKLIST SUMMARY');

  console.log(`\n${colors.bold}Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed:${colors.reset}   ${results.passed}`);
  console.log(`  ${colors.yellow}Warnings:${colors.reset} ${results.warnings}`);
  console.log(`  ${colors.red}Failed:${colors.reset}   ${results.failed}`);
  console.log();

  if (results.failed > 0) {
    console.log(`${colors.red}${colors.bold}❌ Some checks failed. Please fix the issues above.${colors.reset}\n`);
    
    console.log('Failed checks:');
    results.checks
      .filter(c => c.status === 'fail')
      .forEach(c => console.log(`  - ${c.name}: ${c.message}`));
    console.log();
    
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  All critical checks passed, but there are warnings.${colors.reset}\n`);
    
    console.log('Warnings:');
    results.checks
      .filter(c => c.status === 'warn')
      .forEach(c => console.log(`  - ${c.name}: ${c.message}`));
    console.log();
  } else {
    console.log(`${colors.green}${colors.bold}✅ All checks passed! System is ready.${colors.reset}\n`);
  }

  console.log('Next steps:');
  console.log('  1. Start backend:  npm run dev');
  console.log('  2. Start frontend: cd frontend && npm run dev');
  console.log('  3. Open browser:   http://localhost:5173');
  console.log();
}

async function runChecklist() {
  console.log('\n' + '═'.repeat(60));
  console.log('  CHURCH PLANTING MAP - STARTUP CHECKLIST');
  console.log('═'.repeat(60));

  await checkEnvironmentVariables();
  await checkRequiredFiles();
  await checkNodeModules();
  await checkMongoDBConnection();
  await checkGeoJSONData();
  await checkUploadsDirectory();
  await checkAPIEndpoint();
  await printSummary();
}

// Run checklist
runChecklist().catch(error => {
  console.error('Checklist failed:', error);
  process.exit(1);
});
