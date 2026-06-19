const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const files = [
  'frontend/src/pages/Churches.jsx',
  'frontend/src/pages/ChurchDetail.jsx',
  'frontend/src/pages/ChurchesMap.jsx',
  'frontend/src/pages/Villages.jsx',
  'frontend/src/pages/AdvancedSearchPage.jsx',
  'backend/routes/churches.js',
];

files.forEach(f => {
  const full = path.join(root, f);
  try {
    fs.unlinkSync(full);
    console.log('DELETED: ' + f);
  } catch (e) {
    console.log('ERROR: ' + f + ' -> ' + e.message);
  }
});

console.log('DONE');
