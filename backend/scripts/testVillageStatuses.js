/**
 * API Test Script - Test Village Statuses Endpoint
 * 
 * This script tests the /api/villages/statuses endpoint
 * and displays the calculated statuses for each village.
 * 
 * Usage: node backend/scripts/testVillageStatuses.js
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: data ? JSON.parse(data) : null
        });
      });
    }).on('error', reject);
  });
}

async function testVillageStatuses() {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 TESTING VILLAGE STATUSES API');
  console.log('═'.repeat(60));
  
  const url = `${BASE_URL}/api/villages/statuses`;
  console.log(`\n📡 GET ${url}\n`);
  
  try {
    const response = await makeRequest(url);
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS!\n');
      
      const data = response.data;
      
      if (data.villages && data.villages.length > 0) {
        console.log('═'.repeat(60));
        console.log(`📍 VILLAGES WITH CALCULATED STATUSES (${data.villages.length})`);
        console.log('═'.repeat(60));
        console.log('');
        
        data.villages.forEach((v, index) => {
          const statusEmoji = getStatusEmoji(v.status);
          console.log(`${index + 1}. ${v.villageName}`);
          console.log(`   ${statusEmoji} Status: ${v.status.toUpperCase()}`);
          console.log(`   👥 Total People Groups: ${v.totalPeoples}`);
          
          if (v.statusBreakdown) {
            console.log('   📊 Breakdown:');
            Object.entries(v.statusBreakdown).forEach(([status, count]) => {
              if (count > 0) {
                const pct = ((count / v.totalPeoples) * 100).toFixed(1);
                console.log(`      - ${status}: ${count} (${pct}%)`);
              }
            });
          }
          
          if (v.percentages) {
            console.log('   📈 Percentages:');
            Object.entries(v.percentages).forEach(([status, pct]) => {
              if (pct > 0) {
                console.log(`      - ${status}: ${pct.toFixed(1)}%`);
              }
            });
          }
          console.log('');
        });
        
        // Summary
        console.log('═'.repeat(60));
        console.log('📊 STATUS SUMMARY');
        console.log('═'.repeat(60));
        
        const statusCounts = {};
        data.villages.forEach(v => {
          statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
        });
        
        console.log('');
        Object.entries(statusCounts).sort().forEach(([status, count]) => {
          const emoji = getStatusEmoji(status);
          console.log(`${emoji} ${status.padEnd(25)} ${count} village(s)`);
        });
        
      } else {
        console.log('⚠️  No villages with statuses returned.');
        console.log('   This could mean:');
        console.log('   - No people groups exist in the database');
        console.log('   - People groups don\'t have villageName set');
        console.log('');
        console.log('   Run: node backend/scripts/checkPeopleGroups.js');
        console.log('   to check the database state.');
      }
      
    } else if (response.status === 400) {
      console.log('\n❌ BAD REQUEST (400)\n');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      console.log('\n💡 This usually means the endpoint is receiving unexpected parameters.');
      
    } else if (response.status === 404) {
      console.log('\n❌ NOT FOUND (404)\n');
      console.log('The endpoint /api/villages/statuses does not exist.');
      console.log('Check that the route is properly defined in villageRoutes.js');
      
    } else if (response.status === 500) {
      console.log('\n❌ SERVER ERROR (500)\n');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      console.log('\n💡 Check the backend console for error details.');
      
    } else {
      console.log(`\n⚠️  Unexpected status: ${response.status}\n`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ REQUEST FAILED\n');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 The backend server is not running!');
      console.error('   Start it with: cd backend && npm run dev');
    }
  }
  
  console.log('');
}

function getStatusEmoji(status) {
  const statusMap = {
    'unreached': '🔴',
    'minimally_engaged': '🟠',
    'superficially_engaged': '🟡',
    'engaged': '🟢',
    'established': '🔵'
  };
  return statusMap[status] || '⚪';
}

// Also test the health endpoint
async function testHealth() {
  console.log('\n' + '═'.repeat(60));
  console.log('🏥 TESTING HEALTH ENDPOINT');
  console.log('═'.repeat(60));
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    console.log(`\n📊 Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Backend is healthy!');
    } else {
      console.log('⚠️  Unexpected response');
    }
  } catch (error) {
    console.log('\n❌ Backend is not reachable');
    console.log('   Error:', error.message);
  }
}

// Run tests
async function runAllTests() {
  await testHealth();
  await testVillageStatuses();
  console.log('\n' + '═'.repeat(60));
  console.log('✅ TESTS COMPLETE');
  console.log('═'.repeat(60) + '\n');
}

runAllTests().catch(console.error);
