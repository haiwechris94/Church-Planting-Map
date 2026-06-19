const fs = require('fs');
const p = 'backend/server.js';
let s = fs.readFileSync(p, 'utf8');

const reqDup = "const imbPeopleGroupsRoutes = require('./routes/imbPeopleGroups');\r\nconst finishingTheTaskRoutes = require('./routes/finishingTheTask');\r\nconst imbPeopleGroupsRoutes = require('./routes/imbPeopleGroups');\r\nconst finishingTheTaskRoutes = require('./routes/finishingTheTask');";
const reqOnce = "const imbPeopleGroupsRoutes = require('./routes/imbPeopleGroups');\r\nconst finishingTheTaskRoutes = require('./routes/finishingTheTask');";
s = s.replace(reqDup, reqOnce);

const mountDup = "app.use('/api/imb', imbPeopleGroupsRoutes);\r\napp.use('/api/ftt', finishingTheTaskRoutes);\r\napp.use('/api/imb', imbPeopleGroupsRoutes);\r\napp.use('/api/ftt', finishingTheTaskRoutes);";
const mountOnce = "app.use('/api/imb', imbPeopleGroupsRoutes);\r\napp.use('/api/ftt', finishingTheTaskRoutes);";
s = s.replace(mountDup, mountOnce);

fs.writeFileSync(p, s);

const reqCount = (s.match(/imbPeopleGroupsRoutes = require/g) || []).length;
const mountCount = (s.match(/app\.use\('\/api\/imb'/g) || []).length;
console.log('reqCount', reqCount, 'mountCount', mountCount);
