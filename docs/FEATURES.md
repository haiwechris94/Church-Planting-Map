# 🗺️ Church Planting Map - Features Documentation

> **Version:** 2.3.0  
> **Last Updated:** January 2025  
> **Stack:** React 18.2 + Vite | Express.js + MongoDB | Socket.IO

---

## 📋 Table of Contents

1. [Core Features](#core-features)
2. [Village Management](#village-management)
3. [People Groups Management](#people-groups-management)
4. [Real-Time Updates](#real-time-updates)
5. [Role-Based Access Control](#role-based-access-control)
6. [CSV Import System](#csv-import-system)
7. [Dashboard & Analytics](#dashboard--analytics)
8. [Map Features](#map-features)
9. [API Endpoints](#api-endpoints)

---

## 🎯 Core Features

### 1. Interactive Map Visualization
- **Leaflet-based maps** with multiple layers
- **GeoJSON village polygons** with 10,671+ villages
- **Color-coded status indicators** based on DMM engagement
- **Voronoi diagrams** for coverage analysis
- **Clustering** for performance with large datasets

### 2. Multi-Language Support
- Full **French/English** internationalization
- 356+ translation keys
- Language toggle in navigation

### 3. Real-Time Collaboration
- **Socket.IO** integration for live updates
- Dashboard auto-refresh on data changes
- Map updates when people groups are added/modified

---

## 🏘️ Village Management

### Village Status Calculation

Villages are automatically assigned a status based on the people groups within them:

| Status | Threshold | Color | Description |
|--------|-----------|-------|-------------|
| **DMM** | ≥30% DMM | 🟢 Green (#22c55e) | Disciple Making Movement achieved |
| **Tipping Point** | ≥40% Tipping Point | 🟠 Orange (#f97316) | Near breakthrough |
| **Midway** | ≥50% Midway | 🔵 Blue (#3b82f6) | Significant progress |
| **Pioneer** | ≥70% Pioneer | 🟡 Yellow (#eab308) | Early stage engagement |
| **Unreached** | No threshold met | ⚪ Gray (#9ca3af) | No people groups or minimal engagement |

### Priority Order
Status is determined by checking thresholds in this order:
1. DMM (highest priority)
2. Tipping Point
3. Midway
4. Pioneer
5. Unreached (default)

### Village Details Modal
- Click on any village polygon to see:
  - Village name and region
  - Population statistics
  - List of people groups in the village
  - Status breakdown with percentages
  - Quick actions (view details, add people group)

---

## 👥 People Groups Management

### Engagement Status Levels

| Status | DMM Range | Description |
|--------|-----------|-------------|
| **Pioneer** | 1-15% | Initial engagement phase |
| **Midway** | 16-50% | Growing movement |
| **Tipping Point** | 51-75% | Near breakthrough |
| **DMM** | 76-100% | Full Disciple Making Movement |

### Engagement Levels (I-IV)
Additional granularity within each status:
- **Level I**: Beginning stage
- **Level II**: Developing
- **Level III**: Established
- **Level IV**: Multiplying

### People Group Fields
- Name, Description
- Village Name (linked to GeoJSON villages)
- Location (coordinates)
- Population
- Number of Churches
- Church Generation
- Engagement Status & Level
- Photos (multiple uploads)
- Approval Status

### Approval Workflow
1. Missionaries create people groups (pending approval)
2. Supervisors/Admins review and approve
3. Approved people groups appear on maps and statistics
4. Rejection with reason notification

---

## ⚡ Real-Time Updates

### Socket.IO Events

#### Server → Client Events
| Event | Description |
|-------|-------------|
| `village-status-updated` | Village status recalculated |
| `people-group-added` | New people group created |
| `people-group-updated` | People group modified |
| `village-created` | New village added |
| `village-updated` | Village modified |
| `activity-created` | New activity logged |

#### Client → Server Events
| Event | Description |
|-------|-------------|
| `join-region` | Subscribe to region updates |
| `leave-region` | Unsubscribe from region |
| `update-location` | Update user location |
| `viewport-change` | Map viewport changed |

### Dashboard Auto-Updates
The dashboard automatically refreshes when:
- People groups are added/updated/approved
- Village statuses change
- Activities are logged

---

## 🔐 Role-Based Access Control

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features |
| **Supervisor** | Approve content, manage organization |
| **Missionary** | Create/edit own content |
| **Guest** | View-only access |

### Permission Matrix

| Action | Admin | Supervisor | Missionary | Guest |
|--------|-------|------------|------------|-------|
| View maps | ✅ | ✅ | ✅ | ✅ |
| Create people groups | ✅ | ✅ | ✅ | ❌ |
| Edit own content | ✅ | ✅ | ✅ | ❌ |
| Edit any content | ✅ | ✅ | ❌ | ❌ |
| Approve content | ✅ | ✅ | ❌ | ❌ |
| Delete any content | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Export data | ✅ | ✅ | ✅ | ❌ |

### Granting Admin Role
```bash
node scripts/grantAdminRole.js <email>
```

---

## 📥 CSV Import System

### Import Process
1. Download template CSV
2. Fill in people group data
3. Upload and validate
4. Review validation results
5. Confirm import

### CSV Template Fields
| Field | Required | Description |
|-------|----------|-------------|
| name | ✅ | People group name |
| villageName | ✅ | Must match GeoJSON village |
| engagementStatus | ✅ | pioneer/midway/tipping-point/dmm |
| engagementLevel | ❌ | I/II/III/IV |
| population | ❌ | Numeric value |
| numberOfChurches | ❌ | Numeric value |
| churchGeneration | ❌ | Numeric value |
| latitude | ❌ | Decimal degrees |
| longitude | ❌ | Decimal degrees |
| description | ❌ | Text description |

### Validation Rules
- Village name must exist in GeoJSON file
- Engagement status must be valid
- Coordinates must be within valid ranges
- Duplicate detection by name + village

### Import Script
```bash
node scripts/importPeopleGroupsFromCSV.js <path-to-csv>
```

---

## 📊 Dashboard & Analytics

### Statistics Cards
- Total People Groups
- Total Villages
- Total Churches
- Total Activities

### DMM Engagement Status Cards
- Pioneer count with percentage
- Midway count with percentage
- Tipping Point count with percentage
- DMM count with percentage

### Charts
1. **Bar Chart**: People Groups vs Villages by Status
2. **Pie Chart**: People Groups distribution by status
3. **Village Status Summary**: Grid of status counts

### Recent Activities
- Latest 5 activities with timestamps
- Activity type and description
- User who performed the action

---

## 🗺️ Map Features

### Map Layers
1. **Base Map**: OpenStreetMap tiles
2. **Village Polygons**: GeoJSON boundaries
3. **People Group Markers**: Point locations
4. **Voronoi Diagrams**: Coverage zones

### Map Controls
- Zoom in/out
- Layer toggle
- Legend toggle
- Statistics panel toggle
- Fullscreen mode

### Village Popup
Click on a village to see:
- Village name
- Status with color indicator
- People groups count
- Status breakdown
- "View Details" button

### Voronoi Diagrams
- Generate coverage zones from village points
- Identify gaps in church planting coverage
- Filter by administrative boundaries
- Export as GeoJSON

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/register    - Register new user
POST /api/auth/login       - Login user
GET  /api/auth/profile     - Get current user
PUT  /api/auth/profile     - Update profile
```

### Villages
```
GET    /api/villages              - List all villages
GET    /api/villages/:id          - Get village by ID
POST   /api/villages              - Create village
PUT    /api/villages/:id          - Update village
DELETE /api/villages/:id          - Delete village
GET    /api/villages/statuses     - Get all village statuses
GET    /api/villages/statuses/:name - Get specific village status
GET    /api/villages/voronoi      - Generate Voronoi diagram
```

### People Groups
```
GET    /api/people-groups              - List all
GET    /api/people-groups/:id          - Get by ID
POST   /api/people-groups              - Create
PUT    /api/people-groups/:id          - Update
DELETE /api/people-groups/:id          - Delete
GET    /api/people-groups/villages     - Get unique villages
GET    /api/people-groups/by-village/:name - Get by village
POST   /api/people-groups/:id/approve  - Approve (admin/supervisor)
POST   /api/people-groups/:id/reject   - Reject (admin/supervisor)
GET    /api/people-groups/pending      - Get pending approval
```

### Import/Export
```
GET  /api/import/people-groups/template  - Download CSV template
POST /api/import/people-groups/validate  - Validate CSV
POST /api/import/people-groups           - Import CSV
GET  /api/export/people-groups           - Export to CSV
GET  /api/export/geojson                 - Export to GeoJSON
GET  /api/export/kml                     - Export to KML
GET  /api/export/excel                   - Export to Excel
```

### Statistics
```
GET /api/stats/dashboard    - Dashboard statistics
GET /api/stats/activities   - Activity statistics
```

---

## 🛠️ Utility Scripts

| Script | Description |
|--------|-------------|
| `scripts/grantAdminRole.js` | Grant admin role to user |
| `scripts/importPeopleGroupsFromCSV.js` | Import people groups from CSV |
| `scripts/migrateVillageNames.js` | Migrate village names to people groups |
| `scripts/generateVoronoi.js` | Generate Voronoi diagrams |
| `scripts/initDb.js` | Initialize database |

---

## 📝 Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/church-planting-map

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install
cd frontend && npm install

# Start backend
npm run dev

# Start frontend (new terminal)
cd frontend && npm run dev

# Access application
# Frontend: http://localhost:5173
# Backend API: http://localhost:5000
```

---

*Documentation generated for Church Planting Map Project* 🗺️⛪
