const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('node backend/scripts/makeAdmin.js', {
    cwd: 'C:/Users/AFC/church-planting-map',
    timeout: 30000,
    encoding: 'utf8'
  });
  fs.writeFileSync('makeAdmin_output.txt', output);
  console.log('DONE');
  console.log(output);
} catch (e) {
  const combined = (e.stdout || '') + (e.stderr || '') + '\n' + e.message;
  fs.writeFileSync('makeAdmin_output.txt', combined);
  console.log('ERROR');
  console.log(combined);
}
