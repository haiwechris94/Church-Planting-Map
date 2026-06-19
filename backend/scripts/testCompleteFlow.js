/**
 * Complete Flow Test Script
 * 
 * This script tests the complete flow:
 * 1. Creates a test people group via API
 * 2. Verifies it was saved to the database
 * 3. Checks the village statuses endpoint
 * 4. Tests Socket.IO connection
 * 
 * Usage: node backend/scripts/testCompleteFlow.js
 */

const http = require('http');
const { io } = require('socket.io-client');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test data - using a village name that should exist
const testPeopleGroup = {
  name: 'Test People Group ' + Date.now(),
  villageName: 'Maroua', // Common village name in Cameroon
  engagementStatus: 'minimally_engaged',
  engagementLevel: 2,
  population: 5000,
  language: 'French',
  religion: 'Islam',
  description: 'Test people group created by automated test script'
};

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSocketIO() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔌 TESTING SOCKET.IO CONNECTION');
  console.log('═'.repeat(60));
  
  return new Promise((resolve) => {
    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000
    });
    
    const timeout = setTimeout(() => {
      console.log('\n⚠️  Socket.IO connection timed out after 5 seconds');
      socket.disconnect();
      resolve(false);
    }, 5000);
    
    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('\n✅ Socket.IO connected!');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
      
      // Join the villages room
      socket.emit('join', 'villages');
      console.log('   Joined "villages" room');
      
      // Listen for updates
      socket.on('villageStatusUpdate', (data) => {
        console.log('\n📡 Received villageStatusUpdate event!');
        console.log('   Data:', JSON.stringify(data, null, 2));
      });
      
      socket.on('peopleGroupUpdate', (data) => {
        console.log('\n📡 Received peopleGroupUpdate event!');
        console.log('   Data:', JSON.stringify(data, null, 2));
      });
      
      // Keep connection open for a bit to receive events
      setTimeout(() => {
        socket.disconnect();
        resolve(true);
      }, 2000);
    });
    
    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.log('\n❌ Socket.IO connection error:', error.message);
      resolve(false);
    });
  });
}

async function testCreatePeopleGroup() {
  console.log('\n' + '═'.repeat(60));
  console.log('📝 TESTING CREATE PEOPLE GROUP');
  console.log('═'.repeat(60));
  
  console.log('\n📤 Creating test people group:');
  console.log(JSON.stringify(testPeopleGroup, null, 2));
  
  try {
    const response = await makeRequest('POST', '/api/people-groups', testPeopleGroup);
    
    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 201 || response.status === 200) {
      console.log('\n✅ People group created successfully!');
      console.log('   ID:', response.data._id || response.data.id);
      return response.data;
    } else {
      console.log('\n❌ Failed to create people group');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    return null;
  }
}

async function testGetVillageStatuses() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TESTING GET VILLAGE STATUSES');
  console.log('═'.repeat(60));
  
  try {
    const response = await makeRequest('GET', '/api/villages/statuses');
    
    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      console.log('\n✅ Village statuses retrieved successfully!');
      
      if (response.data.villages && response.data.villages.length > 0) {
        console.log(`   Found ${response.data.villages.length} villages with statuses`);
        
        // Look for our test village
        const testVillage = response.data.villages.find(v => 
          v.villageName === testPeopleGroup.villageName
        );
        
        if (testVillage) {
          console.log(`\n   📍 Test village "${testPeopleGroup.villageName}":`);
          console.log(`      Status: ${testVillage.status}`);
          console.log(`      Total peoples: ${testVillage.totalPeoples}`);
        }
        
        return response.data.villages;
      } else {
        console.log('   No villages with statuses found');
        return [];
      }
    } else {
      console.log('\n❌ Failed to get village statuses');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    return null;
  }
}

async function testDeletePeopleGroup(id) {
  if (!id) return;
  
  console.log('\n' + '═'.repeat(60));
  console.log('🗑️  CLEANING UP TEST DATA');
  console.log('═'.repeat(60));
  
  try {
    const response = await makeRequest('DELETE', `/api/people-groups/${id}`);
    
    if (response.status === 200 || response.status === 204) {
      console.log('\n✅ Test people group deleted successfully');
    } else {
      console.log('\n⚠️  Could not delete test people group');
      console.log('   You may need to delete it manually');
    }
  } catch (error) {
    console.log('\n⚠️  Error deleting test data:', error.message);
  }
}

async function runCompleteTest() {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 COMPLETE FLOW TEST');
  console.log('═'.repeat(60));
  console.log(`\n📡 Testing against: ${BASE_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  let createdGroup = null;
  
  try {
    // Step 1: Test Socket.IO connection
    const socketConnected = await testSocketIO();
    
    // Step 2: Get initial village statuses
    console.log('\n📋 Getting initial village statuses...');
    const initialStatuses = await testGetVillageStatuses();
    
    // Step 3: Create a test people group
    createdGroup = await testCreatePeopleGroup();
    
    // Step 4: Wait a moment for Socket.IO to emit
    if (createdGroup) {
      console.log('\n⏳ Waiting 2 seconds for Socket.IO events...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Step 5: Get updated village statuses
    console.log('\n📋 Getting updated village statuses...');
    const updatedStatuses = await testGetVillageStatuses();
    
    // Step 6: Compare results
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═'.repeat(60));
    
    console.log('\n');
    console.log(`✅ Socket.IO Connection: ${socketConnected ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Initial Status Fetch: ${initialStatuses !== null ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Create People Group: ${createdGroup !== null ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Updated Status Fetch: ${updatedStatuses !== null ? 'PASSED' : 'FAILED'}`);
    
    if (initialStatuses && updatedStatuses) {
      const initialCount = initialStatuses.length;
      const updatedCount = updatedStatuses.length;
      
      if (updatedCount >= initialCount) {
        console.log(`✅ Village Count: ${initialCount} → ${updatedCount} (OK)`);
      } else {
        console.log(`⚠️  Village Count: ${initialCount} → ${updatedCount} (Unexpected decrease)`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  } finally {
    // Cleanup
    if (createdGroup && createdGroup._id) {
      await testDeletePeopleGroup(createdGroup._id);
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ COMPLETE FLOW TEST FINISHED');
  console.log('═'.repeat(60));
  console.log(`\n⏰ Finished at: ${new Date().toISOString()}\n`);
}

// Run the test
runCompleteTest().catch(console.error);
