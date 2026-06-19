/**
 * Script to create the "Admin & Data Restoration" Postman collection
 * Run with: node scripts/create_admin_collection.js
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'postman', 'collections', 'Admin & Data Restoration');

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Created:', filePath.replace(path.join(__dirname, '..') + path.sep, ''));
}

// ─── Collection definition ────────────────────────────────────────────────────
write(path.join(BASE, '.resources', 'definition.yaml'), `$kind: collection
name: Admin & Data Restoration
description: |-
  Diagnostic and restoration collection for the Church Planting Map application.
  Use this collection to:
  - Diagnose missing admin users and people groups
  - Restore admin roles for key users
  - Re-seed missing Gabonese people groups

  ## Workflow
  1. Run the Diagnosis folder first to identify issues
  2. Run Restore Admins to fix admin role assignments
  3. Run Restore Gabon People Groups to re-seed missing data

  ## Authentication
  Login as Admin first — the token is saved automatically to the collection variable \`adminToken\`.
auth:
  type: bearer
  credentials:
    - key: token
      value: '{{adminToken}}'
variables:
  - key: baseUrl
    value: 'http://localhost:5000'
  - key: adminToken
    value: ''
  - key: adminEmail
    value: 'chrishaiwe@gmail.com'
  - key: adminPassword
    value: '{{adminPassword}}'
  - key: userId_chrishaiwe
    value: ''
  - key: userId_haiwechris94
    value: ''
`);

// ─── Diagnosis folder ─────────────────────────────────────────────────────────
write(path.join(BASE, 'Diagnosis', '.resources', 'definition.yaml'), `$kind: collection
name: Diagnosis
description: Run these requests first to diagnose the current state of the database.
order: 1000
`);

write(path.join(BASE, 'Diagnosis', '1. Login as Admin.request.yaml'), `$kind: http-request
name: '1. Login as Admin'
method: POST
url: '{{baseUrl}}/api/auth/login'
order: 1000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "email": "{{adminEmail}}",
      "password": "{{adminPassword}}"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      const res = pm.response.json();
      if (res.token) {
        pm.collectionVariables.set('adminToken', res.token);
        console.log('✅ Admin token saved:', res.token.substring(0, 30) + '...');
      } else {
        console.error('❌ Login failed:', JSON.stringify(res));
      }
`);

write(path.join(BASE, 'Diagnosis', '2. List All Users.request.yaml'), `$kind: http-request
name: '2. List All Users'
method: GET
url: '{{baseUrl}}/api/admin/users'
order: 2000
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      const res = pm.response.json();
      const users = Array.isArray(res) ? res : (res.users || []);
      console.log('Total users found:', users.length);

      const target1 = 'chrishaiwe@gmail.com';
      const target2 = 'haiwechris94@gmail.com';

      users.forEach(u => {
        if (u.email === target1) {
          pm.collectionVariables.set('userId_chrishaiwe', u._id);
          console.log('✅ Found chrishaiwe — ID:', u._id, '| Role:', u.role);
        }
        if (u.email === target2) {
          pm.collectionVariables.set('userId_haiwechris94', u._id);
          console.log('✅ Found haiwechris94 — ID:', u._id, '| Role:', u.role);
        }
      });

      pm.test('Response is 200', () => pm.response.to.have.status(200));
      pm.test('Users list returned', () => pm.expect(users.length).to.be.above(0));
`);

write(path.join(BASE, 'Diagnosis', '3. Check Gabon People Groups.request.yaml'), `$kind: http-request
name: '3. Check Gabon People Groups'
method: GET
url: '{{baseUrl}}/api/people-groups'
order: 3000
queryParams:
  - key: country
    value: Gabon
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      const res = pm.response.json();
      const groups = Array.isArray(res) ? res : (res.peopleGroups || res.data || []);
      console.log('Gabon people groups found:', groups.length);
      groups.forEach(g => console.log(' -', g.name || g.peopleGroupName, '| Status:', g.engagementStatus || g.status));

      pm.test('Response is 200', () => pm.response.to.have.status(200));
      pm.collectionVariables.set('gabonGroupCount', String(groups.length));
`);

// ─── Restore Admins folder ────────────────────────────────────────────────────
write(path.join(BASE, 'Restore Admins', '.resources', 'definition.yaml'), `$kind: collection
name: Restore Admins
description: |-
  Restore admin roles for the two primary admin accounts.
  Run "List All Users" first so the user IDs are stored in collection variables.
order: 2000
`);

write(path.join(BASE, 'Restore Admins', '4. Restore Admin - chrishaiwe.request.yaml'), `$kind: http-request
name: '4. Restore Admin - chrishaiwe@gmail.com'
method: PUT
url: '{{baseUrl}}/api/admin/users/{{userId_chrishaiwe}}/role'
order: 1000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "role": "admin"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      const res = pm.response.json();
      pm.test('Role updated to admin', () => {
        pm.expect(pm.response.code).to.be.oneOf([200, 201]);
      });
      console.log('chrishaiwe@gmail.com role update result:', JSON.stringify(res));
`);

write(path.join(BASE, 'Restore Admins', '5. Restore Admin - haiwechris94.request.yaml'), `$kind: http-request
name: '5. Restore Admin - haiwechris94@gmail.com'
method: PUT
url: '{{baseUrl}}/api/admin/users/{{userId_haiwechris94}}/role'
order: 2000
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    {
      "role": "admin"
    }
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      const res = pm.response.json();
      pm.test('Role updated to admin', () => {
        pm.expect(pm.response.code).to.be.oneOf([200, 201]);
      });
      console.log('haiwechris94@gmail.com role update result:', JSON.stringify(res));
`);

// ─── Restore Gabon People Groups folder ──────────────────────────────────────
write(path.join(BASE, 'Restore Gabon People Groups', '.resources', 'definition.yaml'), `$kind: collection
name: Restore Gabon People Groups
description: |-
  Re-seed the 10 primary Gabonese people groups.
  Each request creates one people group via POST /api/people-groups.
  Run after authenticating as admin.
order: 3000
`);

const gabonGroups = [
  {
    order: 1000,
    file: '6. Restore - Fang.request.yaml',
    name: '6. Restore People Group - Fang',
    body: {
      name: 'Fang',
      country: 'Gabon',
      population: 472000,
      language: 'Fang',
      religion: 'Christianity / Animism',
      engagementStatus: 'engaged',
      latitude: 0.4162,
      longitude: 12.3547,
      description: 'Largest ethnic group in Gabon, primarily in the north.',
    },
  },
  {
    order: 2000,
    file: '7. Restore - Bapounou.request.yaml',
    name: '7. Restore People Group - Bapounou',
    body: {
      name: 'Bapounou',
      country: 'Gabon',
      population: 158000,
      language: 'Punu',
      religion: 'Christianity / Animism',
      engagementStatus: 'engaged',
      latitude: -2.7,
      longitude: 11.8,
      description: 'Second largest group, located in southern Gabon.',
    },
  },
  {
    order: 3000,
    file: '8. Restore - Nzebi.request.yaml',
    name: '8. Restore People Group - Nzebi',
    body: {
      name: 'Nzebi',
      country: 'Gabon',
      population: 61000,
      language: 'Nzebi',
      religion: 'Christianity / Animism',
      engagementStatus: 'partial',
      latitude: -1.5,
      longitude: 13.5,
      description: 'Located in the Ngounié and Haut-Ogooué provinces.',
    },
  },
  {
    order: 4000,
    file: '9. Restore - Myene.request.yaml',
    name: '9. Restore People Group - Myene',
    body: {
      name: 'Myene',
      country: 'Gabon',
      population: 53000,
      language: 'Myene',
      religion: 'Christianity',
      engagementStatus: 'engaged',
      latitude: 0.39,
      longitude: 9.45,
      description: 'Coastal people group around the Libreville estuary.',
    },
  },
  {
    order: 5000,
    file: '10. Restore - Kota.request.yaml',
    name: '10. Restore People Group - Kota',
    body: {
      name: 'Kota',
      country: 'Gabon',
      population: 47000,
      language: 'Kota',
      religion: 'Animism / Christianity',
      engagementStatus: 'partial',
      latitude: 0.2,
      longitude: 14.1,
      description: 'Known for their distinctive reliquary figures (mbulu ngulu).',
    },
  },
  {
    order: 6000,
    file: '11. Restore - Teke.request.yaml',
    name: '11. Restore People Group - Teke',
    body: {
      name: 'Teke',
      country: 'Gabon',
      population: 40000,
      language: 'Teke',
      religion: 'Animism / Christianity',
      engagementStatus: 'partial',
      latitude: -1.0,
      longitude: 14.5,
      description: 'Located in the Haut-Ogooué province near the Congo border.',
    },
  },
  {
    order: 7000,
    file: '12. Restore - Mbede.request.yaml',
    name: '12. Restore People Group - Mbede',
    body: {
      name: 'Mbede',
      country: 'Gabon',
      population: 30000,
      language: 'Mbede',
      religion: 'Animism',
      engagementStatus: 'unreached',
      latitude: -0.5,
      longitude: 13.9,
      description: 'Smaller group in the Ogooué-Ivindo region.',
    },
  },
  {
    order: 8000,
    file: '13. Restore - Tsogo.request.yaml',
    name: '13. Restore People Group - Tsogo',
    body: {
      name: 'Tsogo',
      country: 'Gabon',
      population: 25000,
      language: 'Tsogo',
      religion: 'Animism / Bwiti',
      engagementStatus: 'unreached',
      latitude: -1.2,
      longitude: 11.9,
      description: 'Guardians of the Bwiti spiritual tradition in central Gabon.',
    },
  },
  {
    order: 9000,
    file: '14. Restore - Baka.request.yaml',
    name: '14. Restore People Group - Baka',
    body: {
      name: 'Baka',
      country: 'Gabon',
      population: 5000,
      language: 'Baka',
      religion: 'Animism',
      engagementStatus: 'unreached',
      latitude: 1.5,
      longitude: 12.8,
      description: 'Forest-dwelling pygmy people in northeastern Gabon.',
    },
  },
  {
    order: 10000,
    file: '15. Restore - Seki.request.yaml',
    name: '15. Restore People Group - Seki',
    body: {
      name: 'Seki',
      country: 'Gabon',
      population: 8000,
      language: 'Seki',
      religion: 'Animism / Christianity',
      engagementStatus: 'unreached',
      latitude: 1.1,
      longitude: 11.6,
      description: 'Located in the Woleu-Ntem province in northern Gabon.',
    },
  },
];

gabonGroups.forEach(({ order, file, name, body }) => {
  write(
    path.join(BASE, 'Restore Gabon People Groups', file),
    `$kind: http-request
name: '${name}'
method: POST
url: '{{baseUrl}}/api/people-groups'
order: ${order}
headers:
  - key: Content-Type
    value: application/json
body:
  type: json
  content: |-
    ${JSON.stringify(body, null, 4).split('\n').join('\n    ')}
scripts:
  - type: afterResponse
    language: text/javascript
    code: |-
      const res = pm.response.json();
      pm.test('People group created or already exists', () => {
        pm.expect(pm.response.code).to.be.oneOf([200, 201, 409]);
      });
      if (pm.response.code === 409) {
        console.log('ℹ️  ${body.name} already exists — skipping.');
      } else {
        console.log('✅ ${body.name} restored — ID:', res._id || res.id);
      }
`
  );
});

// ─── Update environment file ──────────────────────────────────────────────────
const envPath = path.join(
  __dirname, '..', 'postman', 'environments', 'Church Planting Map - Local.environment.yaml'
);

if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('adminPassword')) {
    // Append the new variable
    envContent = envContent.trimEnd() + `
  - key: adminPassword
    value: ''
    enabled: true
    type: default
`;
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('Updated: postman/environments/Church Planting Map - Local.environment.yaml (added adminPassword)');
  } else {
    console.log('ℹ️  adminPassword already exists in environment — skipping.');
  }
} else {
  console.warn('⚠️  Environment file not found:', envPath);
}

console.log('\n✅ All done! Collection created at:', BASE);
