#!/usr/bin/env node
/**
 * Kill Port Utility Script
 * 
 * Finds and kills processes using a specified port on Windows.
 * Usage: node kill-port.js [port]
 * Default port: 5000
 * 
 * Examples:
 *   node kill-port.js        # Kills process on port 5000
 *   node kill-port.js 3000   # Kills process on port 3000
 */

const { exec } = require('child_process');
const readline = require('readline');

// Get port from command line argument or default to 5000
const PORT = process.argv[2] || 5000;

console.log('═══════════════════════════════════════════');
console.log(`🔍 Kill Port Utility - Port ${PORT}`);
console.log('═══════════════════════════════════════════');

/**
 * Execute a shell command and return a promise
 */
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Find process using the specified port on Windows
 */
async function findProcessOnPort(port) {
  try {
    // Use netstat to find the process
    const command = `netstat -ano | findstr :${port} | findstr LISTENING`;
    const output = await execPromise(command);
    
    // Parse the output to get PID
    const lines = output.trim().split('\n');
    const pids = new Set();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    }
    
    return Array.from(pids);
  } catch (err) {
    return [];
  }
}

/**
 * Get process details by PID
 */
async function getProcessDetails(pid) {
  try {
    const command = `tasklist /FI "PID eq ${pid}" /FO CSV /NH`;
    const output = await execPromise(command);
    const parts = output.trim().split(',');
    if (parts.length > 0) {
      return parts[0].replace(/"/g, '');
    }
    return 'Unknown';
  } catch (err) {
    return 'Unknown';
  }
}

/**
 * Kill a process by PID
 */
async function killProcess(pid) {
  try {
    // /F = Force, /T = Kill child processes too
    await execPromise(`taskkill /PID ${pid} /F /T`);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Prompt user for confirmation
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`\n🔎 Searching for processes on port ${PORT}...\n`);
    
    const pids = await findProcessOnPort(PORT);
    
    if (pids.length === 0) {
      console.log(`✅ No process found using port ${PORT}`);
      console.log('   The port is available for use.\n');
      process.exit(0);
    }
    
    console.log(`⚠️  Found ${pids.length} process(es) using port ${PORT}:\n`);
    
    // Get details for each process
    const processDetails = [];
    for (const pid of pids) {
      const name = await getProcessDetails(pid);
      processDetails.push({ pid, name });
      console.log(`   PID: ${pid} - Process: ${name}`);
    }
    
    console.log('');
    
    // Check if running with --force flag
    const forceKill = process.argv.includes('--force') || process.argv.includes('-f');
    
    let shouldKill = forceKill;
    if (!forceKill) {
      shouldKill = await askConfirmation('❓ Do you want to kill these processes? (y/n): ');
    }
    
    if (shouldKill) {
      console.log('\n🔪 Killing processes...\n');
      
      for (const { pid, name } of processDetails) {
        const success = await killProcess(pid);
        if (success) {
          console.log(`   ✅ Killed PID ${pid} (${name})`);
        } else {
          console.log(`   ❌ Failed to kill PID ${pid} (${name})`);
          console.log(`      Try running as Administrator or use: taskkill /PID ${pid} /F`);
        }
      }
      
      // Verify the port is now free
      console.log(`\n🔎 Verifying port ${PORT} is free...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second
      
      const remainingPids = await findProcessOnPort(PORT);
      if (remainingPids.length === 0) {
        console.log(`✅ Port ${PORT} is now available!\n`);
      } else {
        console.log(`⚠️  Port ${PORT} may still be in use. Try running as Administrator.\n`);
      }
    } else {
      console.log('\n❌ Operation cancelled.\n');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
  }
}

// Run the script
main();
