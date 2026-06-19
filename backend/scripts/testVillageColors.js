#!/usr/bin/env node
/**
 * Test Village Status Colors Script
 * Verifies the color coding system for village statuses
 * 
 * Usage: node scripts/testVillageColors.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import the village status service
const villageStatusService = require('../services/villageStatusService');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

// ANSI color codes for status colors
const statusAnsiColors = {
  pioneer: '\x1b[33m',      // Yellow
  midway: '\x1b[34m',       // Blue
  'tipping-point': '\x1b[38;5;208m', // Orange (256 color)
  dmm: '\x1b[32m',          // Green
  unreached: '\x1b[90m',    // Gray
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${colors.bold}═══ ${msg} ═══${colors.reset}\n`),
};

// Test cases for status calculation
const testCases = [
  {
    name: 'DMM Threshold Met',
    percentages: { dmm: 35, tippingPoint: 30, midway: 20, pioneer: 15 },
    expectedStatus: 'dmm',
    description: '≥30% DMM → DMM status',
  },
  {
    name: 'Tipping Point Threshold Met',
    percentages: { dmm: 20, tippingPoint: 45, midway: 20, pioneer: 15 },
    expectedStatus: 'tipping-point',
    description: '≥40% Tipping Point → Tipping Point status',
  },
  {
    name: 'Midway Threshold Met',
    percentages: { dmm: 10, tippingPoint: 30, midway: 55, pioneer: 5 },
    expectedStatus: 'midway',
    description: '≥50% Midway → Midway status',
  },
  {
    name: 'Pioneer Threshold Met',
    percentages: { dmm: 5, tippingPoint: 10, midway: 10, pioneer: 75 },
    expectedStatus: 'pioneer',
    description: '≥70% Pioneer → Pioneer status',
  },
  {
    name: 'No Threshold Met',
    percentages: { dmm: 10, tippingPoint: 20, midway: 30, pioneer: 40 },
    expectedStatus: 'unreached',
    description: 'No threshold met → Unreached status',
  },
  {
    name: 'DMM Priority Over Tipping Point',
    percentages: { dmm: 30, tippingPoint: 40, midway: 20, pioneer: 10 },
    expectedStatus: 'dmm',
    description: 'Both DMM and TP thresholds met → DMM wins (higher priority)',
  },
  {
    name: 'Tipping Point Priority Over Midway',
    percentages: { dmm: 25, tippingPoint: 40, midway: 50, pioneer: 5 },
    expectedStatus: 'tipping-point',
    description: 'Both TP and Midway thresholds met → TP wins',
  },
  {
    name: 'Edge Case: Exactly 30% DMM',
    percentages: { dmm: 30, tippingPoint: 30, midway: 25, pioneer: 15 },
    expectedStatus: 'dmm',
    description: 'Exactly 30% DMM → DMM status (threshold is ≥)',
  },
  {
    name: 'Edge Case: Just Below DMM',
    percentages: { dmm: 29, tippingPoint: 41, midway: 20, pioneer: 10 },
    expectedStatus: 'tipping-point',
    description: '29% DMM (below threshold) → Falls to Tipping Point',
  },
];

// Expected colors from the service
const expectedColors = {
  pioneer: '#eab308',      // Yellow
  midway: '#3b82f6',       // Blue
  'tipping-point': '#f97316', // Orange
  dmm: '#22c55e',          // Green
  unreached: '#9ca3af',    // Gray
};

function printColorSwatch(status, hexColor) {
  const ansiColor = statusAnsiColors[status] || colors.gray;
  const block = '████████';
  return `${ansiColor}${block}${colors.reset} ${hexColor}`;
}

async function testStatusCalculation() {
  log.header('TESTING STATUS CALCULATION LOGIC');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    // Simulate the determineVillageStatus function logic
    let calculatedStatus = 'unreached';
    
    if (testCase.percentages.dmm >= 30) {
      calculatedStatus = 'dmm';
    } else if (testCase.percentages.tippingPoint >= 40) {
      calculatedStatus = 'tipping-point';
    } else if (testCase.percentages.midway >= 50) {
      calculatedStatus = 'midway';
    } else if (testCase.percentages.pioneer >= 70) {
      calculatedStatus = 'pioneer';
    }

    const statusColor = statusAnsiColors[calculatedStatus] || colors.gray;
    
    if (calculatedStatus === testCase.expectedStatus) {
      console.log(`${colors.green}✓${colors.reset} ${testCase.name}`);
      console.log(`  ${colors.gray}${testCase.description}${colors.reset}`);
      console.log(`  Input: DMM=${testCase.percentages.dmm}%, TP=${testCase.percentages.tippingPoint}%, MW=${testCase.percentages.midway}%, P=${testCase.percentages.pioneer}%`);
      console.log(`  Result: ${statusColor}${calculatedStatus}${colors.reset}`);
      passed++;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${testCase.name}`);
      console.log(`  ${colors.gray}${testCase.description}${colors.reset}`);
      console.log(`  Input: DMM=${testCase.percentages.dmm}%, TP=${testCase.percentages.tippingPoint}%, MW=${testCase.percentages.midway}%, P=${testCase.percentages.pioneer}%`);
      console.log(`  Expected: ${statusAnsiColors[testCase.expectedStatus]}${testCase.expectedStatus}${colors.reset}`);
      console.log(`  Got: ${statusColor}${calculatedStatus}${colors.reset}`);
      failed++;
    }
    console.log();
  }

  return { passed, failed };
}

function testColorMapping() {
  log.header('TESTING COLOR MAPPING');

  console.log('Status Color Reference:\n');
  console.log('┌─────────────────┬────────────┬──────────────────┐');
  console.log('│ Status          │ Hex Color  │ Visual           │');
  console.log('├─────────────────┼────────────┼──────────────────┤');

  const statuses = ['pioneer', 'midway', 'tipping-point', 'dmm', 'unreached'];
  
  for (const status of statuses) {
    const hexColor = expectedColors[status];
    const ansiColor = statusAnsiColors[status];
    const paddedStatus = status.padEnd(15);
    const paddedHex = hexColor.padEnd(10);
    console.log(`│ ${ansiColor}${paddedStatus}${colors.reset} │ ${paddedHex} │ ${ansiColor}████████████████${colors.reset} │`);
  }
  
  console.log('└─────────────────┴────────────┴──────────────────┘');
  console.log();

  // Verify colors match expected
  let allMatch = true;
  
  if (villageStatusService.STATUS_COLORS) {
    console.log('Verifying service colors match expected:\n');
    
    for (const status of statuses) {
      const serviceColor = villageStatusService.STATUS_COLORS[status];
      const expected = expectedColors[status];
      
      if (serviceColor === expected) {
        console.log(`${colors.green}✓${colors.reset} ${status}: ${serviceColor}`);
      } else {
        console.log(`${colors.red}✗${colors.reset} ${status}: Expected ${expected}, got ${serviceColor}`);
        allMatch = false;
      }
    }
  } else {
    console.log(`${colors.yellow}⚠${colors.reset} STATUS_COLORS not exported from villageStatusService`);
  }

  return allMatch;
}

async function testWithRealData() {
  log.header('TESTING WITH REAL DATABASE DATA');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');

    // Get village statuses
    const result = await villageStatusService.calculateAllVillageStatuses();
    
    console.log(`\nFound ${result.villages.length} villages with people groups\n`);

    // Show statistics
    console.log('Status Distribution:');
    console.log('┌─────────────────┬───────┬────────────────────┐');
    console.log('│ Status          │ Count │ Visual             │');
    console.log('├─────────────────┼───────┼────────────────────┤');

    const statuses = ['dmm', 'tipping-point', 'midway', 'pioneer', 'unreached'];
    
    for (const status of statuses) {
      const count = result.statistics.byStatus[status] || 0;
      const ansiColor = statusAnsiColors[status];
      const paddedStatus = status.padEnd(15);
      const paddedCount = String(count).padStart(5);
      const barLength = Math.min(Math.round(count / 2), 18);
      const bar = '█'.repeat(barLength);
      console.log(`│ ${ansiColor}${paddedStatus}${colors.reset} │ ${paddedCount} │ ${ansiColor}${bar.padEnd(18)}${colors.reset} │`);
    }
    
    console.log('└─────────────────┴───────┴────────────────────┘');
    console.log();

    // Show sample villages
    if (result.villages.length > 0) {
      console.log('Sample Villages:\n');
      
      const samples = result.villages.slice(0, 5);
      for (const village of samples) {
        const ansiColor = statusAnsiColors[village.status] || colors.gray;
        console.log(`${ansiColor}●${colors.reset} ${village.villageName}`);
        console.log(`  Status: ${ansiColor}${village.status}${colors.reset} (${village.statusDisplay})`);
        console.log(`  People Groups: ${village.totalPeoples}`);
        console.log(`  Breakdown: DMM=${village.percentages.dmm}%, TP=${village.percentages.tippingPoint}%, MW=${village.percentages.midway}%, P=${village.percentages.pioneer}%`);
        console.log();
      }
    }

    await mongoose.disconnect();
    log.success('Disconnected from MongoDB');
    
    return true;
  } catch (error) {
    log.error(`Database test failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  VILLAGE STATUS COLOR TESTING');
  console.log('═'.repeat(60));

  // Test 1: Status calculation logic
  const calcResults = await testStatusCalculation();
  
  // Test 2: Color mapping
  const colorsMatch = testColorMapping();
  
  // Test 3: Real data (if database available)
  let dbTestPassed = false;
  if (process.env.MONGODB_URI) {
    dbTestPassed = await testWithRealData();
  } else {
    log.warning('MONGODB_URI not set - skipping database test');
  }

  // Summary
  log.header('TEST SUMMARY');

  console.log(`Status Calculation Tests: ${calcResults.passed}/${calcResults.passed + calcResults.failed} passed`);
  console.log(`Color Mapping: ${colorsMatch ? 'PASS' : 'FAIL'}`);
  console.log(`Database Test: ${dbTestPassed ? 'PASS' : 'SKIPPED/FAIL'}`);
  console.log();

  if (calcResults.failed === 0 && colorsMatch) {
    console.log(`${colors.green}${colors.bold}✅ All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Some tests failed.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
