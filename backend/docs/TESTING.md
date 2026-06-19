# 🧪 Church Planting Map - Testing Guide

> **Version:** 2.3.0  
> **Last Updated:** January 2025

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Verification](#quick-verification)
3. [Feature Testing](#feature-testing)
4. [API Testing](#api-testing)
5. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### 1. Environment Setup
```bash
# Ensure MongoDB is running
mongod --dbpath /path/to/data

# Verify environment variables
cat .env
# Should contain:
# - MONGODB_URI
# - JWT_SECRET
# - PORT (default: 5000)
```

### 2. Start Services
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev
```

### 3. Create Test User
```bash
# Register via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Admin","email":"admin@test.com","password":"password123"}'

# Grant admin role
node scripts/grantAdminRole.js admin@test.com
```

---

## 🚀 Quick Verification

### Run All Verification Scripts
```bash
# Check database connection and collections
node backend/scripts/testVillageStatuses.js

# Check people groups data
node backend/scripts/checkPeopleGroups.js

# List GeoJSON villages
node backend/scripts/listGeoJSONVillages.js
```

### Health Check
```bash
# API health
curl http://localhost:5000/health

# Expected response:
# {
#   "status": "healthy",
#   "mongodb": "connected",
#   "socketConnections": 0
# }
```

---

## 🧪 Feature Testing

### 1. Authentication System

#### Test Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```
**Expected:** 201 Created with user object and token

#### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```
**Expected:** 200 OK with token

#### Test Protected Route
```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Expected:** 200 OK with user profile

---

### 2. Village Status System

#### Test Get All Village Statuses
```bash
curl http://localhost:5000/api/villages/statuses
```
**Expected Response:**
```json
{
  "villages": [
    {
      "villageName": "Village Name",
      "status": "pioneer|midway|tipping-point|dmm|unreached",
      "statusColor": "#hex",
      "totalPeoples": 5,
      "percentages": {
        "pioneer": 40,
        "midway": 30,
        "tippingPoint": 20,
        "dmm": 10
      }
    }
  ],
  "statistics": {
    "totalVillages": 100,
    "byStatus": { ... }
  }
}
```

#### Test Single Village Status
```bash
curl "http://localhost:5000/api/villages/statuses/VillageName"
```

#### Verify Status Calculation
| Scenario | Expected Status |
|----------|-----------------|
| 35% DMM, 30% TP, 20% MW, 15% P | DMM (≥30% DMM) |
| 20% DMM, 45% TP, 20% MW, 15% P | Tipping Point (≥40% TP) |
| 10% DMM, 30% TP, 55% MW, 5% P | Midway (≥50% MW) |
| 5% DMM, 10% TP, 10% MW, 75% P | Pioneer (≥70% P) |
| 10% DMM, 20% TP, 30% MW, 40% P | Unreached (no threshold) |

---

### 3. People Groups Management

#### Create People Group
```bash
curl -X POST http://localhost:5000/api/people-groups \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "villageName": "Existing Village Name",
    "engagementStatus": "pioneer",
    "engagementLevel": "I",
    "population": 1000,
    "numberOfChurches": 2
  }'
```
**Expected:** 201 Created

#### Get People Groups by Village
```bash
curl "http://localhost:5000/api/people-groups/by-village/VillageName"
```

#### Approve People Group (Admin/Supervisor)
```bash
curl -X POST http://localhost:5000/api/people-groups/ID/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
**Expected:** 200 OK with approved: true

---

### 4. Real-Time Updates (Socket.IO)

#### Test Socket Connection
1. Open browser console on frontend
2. Look for: `[Socket.IO] ✅ Socket CONNECTED`
3. Check socket ID is displayed

#### Test Village Status Update
1. Open Dashboard in browser
2. In another terminal, create/update a people group
3. Watch console for: `[Dashboard] 🏘️ Village status update received`
4. Dashboard should auto-refresh

#### Debug Socket Events
```javascript
// In browser console
const socket = io('http://localhost:5000');
socket.onAny((event, ...args) => {
  console.log('Event:', event, args);
});
```

---

### 5. CSV Import System

#### Download Template
```bash
curl http://localhost:5000/api/import/people-groups/template \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o template.csv
```

#### Validate CSV
```bash
curl -X POST http://localhost:5000/api/import/people-groups/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@your-data.csv"
```
**Expected Response:**
```json
{
  "valid": true,
  "totalRows": 10,
  "validRows": 8,
  "errors": [
    { "row": 3, "field": "villageName", "message": "Village not found" }
  ]
}
```

#### Import CSV
```bash
curl -X POST http://localhost:5000/api/import/people-groups \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@your-data.csv"
```

---

### 6. Map Features

#### Test Village Polygon Click
1. Navigate to GeoJSON Map View
2. Click on any village polygon
3. **Expected:** Popup shows village name, status, people groups count

#### Test Village Details Modal
1. Click "View Details" in village popup
2. **Expected:** Modal opens with:
   - Village information
   - List of people groups
   - Status breakdown chart

#### Test Map Resize
1. Open map view
2. Resize browser window
3. **Expected:** Map adjusts without gray areas

---

### 7. Dashboard

#### Test Statistics Display
1. Navigate to Dashboard
2. **Verify:**
   - People Groups count matches database
   - Villages count is correct
   - Churches total is sum of all people groups
   - Status breakdown percentages add to 100%

#### Test Real-Time Updates
1. Keep Dashboard open
2. In another tab, add a people group
3. **Expected:** Dashboard updates within 2 seconds

---

### 8. Role-Based Access

#### Test Admin Access
```bash
# Should succeed
curl -X POST http://localhost:5000/api/people-groups/ID/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Test Missionary Access (Should Fail)
```bash
# Should return 403 Forbidden
curl -X POST http://localhost:5000/api/people-groups/ID/approve \
  -H "Authorization: Bearer MISSIONARY_TOKEN"
```

#### Test Guest Access (Should Fail)
```bash
# Should return 403 Forbidden
curl -X POST http://localhost:5000/api/people-groups \
  -H "Authorization: Bearer GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

---

## 🔧 API Testing with Postman

### Import Collection
1. Open Postman
2. Import the collection from `postman/collections/Church Planting Map API.postman_collection.json`
3. Set environment variables:
   - `baseUrl`: http://localhost:5000
   - `token`: Your JWT token

### Test Sequence
1. **Auth** → Register → Login → Get Profile
2. **Villages** → Get All → Get Statuses → Get Single
3. **People Groups** → Create → Get → Update → Approve
4. **Import** → Download Template → Validate → Import

---

## ❌ Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```
Error: MongoNetworkError: connect ECONNREFUSED
```
**Solution:**
```bash
# Start MongoDB
mongod --dbpath /path/to/data

# Or check if running
ps aux | grep mongod
```

#### 2. Socket.IO Not Connecting
```
[Socket.IO] ❌ Socket CONNECTION ERROR
```
**Solutions:**
- Check CORS settings in server.js
- Verify frontend VITE_API_URL matches backend
- Check if backend is running on correct port

#### 3. Village Status Not Updating
**Check:**
1. People group has `approved: true`
2. `villageName` matches GeoJSON village exactly
3. Socket.IO is connected (check console)

#### 4. CSV Import Validation Errors
```
"Village not found: VillageName"
```
**Solution:**
```bash
# List valid village names
node backend/scripts/listGeoJSONVillages.js | grep -i "village"
```

#### 5. 403 Forbidden on Approve
**Check:**
- User has admin or supervisor role
- Token is valid and not expired
- User is authenticated

#### 6. Map Gray Areas After Resize
**Solution:**
- MapResizeHandler component should be included
- Call `map.invalidateSize()` after resize

---

## 📊 Performance Testing

### Load Test Villages API
```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:5000/api/villages

# Expected: < 500ms average response time
```

### Test Large Dataset
```bash
# Seed test data
node backend/scripts/seedTestPeopleGroups.js

# Verify performance
time curl http://localhost:5000/api/villages/statuses
```

---

## ✅ Test Checklist

### Before Deployment
- [ ] All API endpoints return expected responses
- [ ] Authentication works (register, login, protected routes)
- [ ] Role-based access is enforced
- [ ] Village status calculation is correct
- [ ] Socket.IO real-time updates work
- [ ] CSV import validates and imports correctly
- [ ] Dashboard displays accurate statistics
- [ ] Map renders without errors
- [ ] Village details modal works
- [ ] Approval workflow functions correctly

### After Deployment
- [ ] Health check endpoint responds
- [ ] MongoDB connection is stable
- [ ] Socket.IO connections are maintained
- [ ] No console errors in frontend
- [ ] Performance is acceptable (< 2s page load)

---

*Testing Guide for Church Planting Map Project* 🧪
