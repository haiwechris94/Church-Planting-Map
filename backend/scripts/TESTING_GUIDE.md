# 🧪 Church Planting Map - Testing Guide

This guide provides comprehensive instructions for testing the village status coloring feature.

## 📋 Prerequisites

Before running tests, ensure:
1. MongoDB is running (`mongod`)
2. Backend server is running (from root: `npm run dev`)
3. Frontend is running (`cd frontend && npm start`)

**Note:** The backend code is in the root directory, not in a separate `backend` folder.

## 🔧 Test Scripts

### 1. Check Database State

**Script:** `backend/scripts/checkPeopleGroups.js`

**Purpose:** Verify people groups exist in the database with correct village assignments.

```bash
# Run from project root
node backend/scripts/checkPeopleGroups.js
```

**What to look for:**
- ✅ Total people groups count
- ✅ Each group has a `villageName` set
- ✅ Each group has an `engagementStatus` set (pioneer, midway, tipping-point, dmm)
- ✅ The expected groups exist: Toupouri, Moundang, Bana, Guiziga
- ❌ Groups without village names (need to be updated)

**Expected output:**
```
📊 TOTAL PEOPLE GROUPS: 5

📋 ALL PEOPLE GROUPS:

1. Toupouri
   📍 Village: Maroua
   📊 Status: pioneer
   📈 Level: I
```

---

### 2. Test Village Statuses API

**Script:** `backend/scripts/testVillageStatuses.js`

**Purpose:** Verify the `/api/villages/statuses` endpoint returns correct data.

```bash
# Run from project root
node backend/scripts/testVillageStatuses.js
```

**What to look for:**
- ✅ Status 200 OK
- ✅ Villages array with calculated statuses
- ✅ Each village has: villageName, status, totalPeoples, statusBreakdown
- ❌ Status 400 (endpoint configuration issue)
- ❌ Status 500 (server error - check backend logs)
- ❌ Empty villages array (no people groups with village names)

**Expected output:**
```
✅ SUCCESS!

📍 VILLAGES WITH CALCULATED STATUSES (5)

1. Maroua
   🔵 Status: PIONEER
   👥 Total People Groups: 1
   📊 Breakdown:
      - pioneer: 1 (100.0%)
```

---

### 3. List GeoJSON Village Names

**Script:** `backend/scripts/listGeoJSONVillages.js`

**Purpose:** Extract village names from GeoJSON to match with people group assignments.

```bash
# Run from project root
node backend/scripts/listGeoJSONVillages.js
```

**What to look for:**
- ✅ List of all village names in the GeoJSON file
- ✅ Matches for expected villages (Maroua, Kaele, Mokolo, etc.)
- ❌ No GeoJSON file found (check frontend/public/data/)
- ❌ No matches for your people group village names

**Use this to:**
- Find exact village names to use when creating people groups
- Verify spelling matches between database and GeoJSON

---

### 4. Seed Test People Groups

**Script:** `backend/scripts/seedTestPeopleGroups.js`

**Purpose:** Create test people groups with correct village names and status values.

```bash
# Run from project root
node backend/scripts/seedTestPeopleGroups.js

# To reset and recreate all test data:
node backend/scripts/seedTestPeopleGroups.js --reset
```

**What it creates:**
- Toupouri (Maroua) - pioneer status
- Moundang (Kaele) - midway status
- Guiziga (Mokolo) - tipping-point status
- Bana (Mora) - dmm status
- Fulani (Garoua) - midway status

---

### 5. Complete Flow Test

**Script:** `backend/scripts/testCompleteFlow.js`

**Purpose:** Test the entire flow from creating a people group to receiving Socket.IO updates.

```bash
# Run from project root
npm install socket.io-client  # If not already installed
node backend/scripts/testCompleteFlow.js
```

**What to look for:**
- ✅ Socket.IO connects successfully
- ✅ People group created (201 status)
- ✅ Village statuses updated
- ✅ Socket.IO events received
- ❌ Connection refused (backend not running)
- ❌ Socket.IO timeout (CORS or configuration issue)

---

## 🖥️ Manual Testing Procedure

### Step 1: Open Browser Developer Tools

1. Open the app in Chrome/Firefox
2. Press F12 to open Developer Tools
3. Go to the **Console** tab
4. Go to the **Network** tab

### Step 2: Navigate to Villages DMM Tab

1. Click on "Villages DMM" in the navigation
2. Watch the Network tab for:
   - `GET /api/villages/statuses` - Should return 200
   - WebSocket connection to backend

### Step 3: Check Console for Socket.IO

Look for these messages:
```
✅ Socket.IO connected
✅ Joined villages room
```

### Step 4: Add a People Group

1. Navigate to People Groups section
2. Click "Add People Group"
3. Fill in:
   - Name: Test Group
   - Village: (use a name from GeoJSON list)
   - Engagement Status: pioneer/midway/tipping-point/dmm
4. Save

### Step 5: Verify Updates

1. Check Console for:
   ```
   📡 Received villageStatusUpdate event
   ```
2. Check Network tab for new `/api/villages/statuses` call
3. Verify the village polygon color changed on the map

---

## 🔍 Troubleshooting

### Issue: No villages showing colors

**Possible causes:**
1. No people groups in database
2. People groups don't have `villageName` set
3. Village names don't match GeoJSON names

**Solution:**
```bash
# Check database
node backend/scripts/checkPeopleGroups.js

# Check GeoJSON names
node backend/scripts/listGeoJSONVillages.js

# Seed test data
node backend/scripts/seedTestPeopleGroups.js --reset
```

### Issue: API returns 400 Bad Request

**Possible causes:**
1. Route expecting parameters that aren't provided
2. Middleware validation failing

**Solution:**
- Check `routes/villages.js`
- Ensure `/statuses` route doesn't require `:id` parameter
- Check backend console for error details

### Issue: Socket.IO not connecting

**Possible causes:**
1. CORS configuration
2. Backend not running
3. Wrong port

**Solution:**
```javascript
// Check server.js for Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});
```

### Issue: Village names don't match

**Possible causes:**
1. Case sensitivity (Maroua vs MAROUA)
2. Spelling differences
3. Different naming conventions

**Solution:**
Implement case-insensitive matching in the frontend:
```javascript
const normalizedVillageName = villageName.toLowerCase().trim();
```

---

## 📊 Status Color Reference

| Status | Color | Hex Code | Description |
|--------|-------|----------|-------------|
| Pioneer | Blue | #3b82f6 | Initial engagement stage |
| Midway | Orange | #f97316 | Mid-journey progress |
| Tipping Point | Green | #22c55e | Near breakthrough |
| DMM | Red | #dc2626 | Disciple Making Movement |
| Unreached | Gray | #6b7280 | No engagement data |

---

## ✅ Test Checklist

- [ ] MongoDB is running
- [ ] Backend server starts without errors
- [ ] Frontend compiles without errors
- [ ] `checkPeopleGroups.js` shows people groups with village names
- [ ] `testVillageStatuses.js` returns 200 with village data
- [ ] `listGeoJSONVillages.js` shows village names
- [ ] Browser console shows Socket.IO connected
- [ ] Network tab shows successful API calls
- [ ] Village polygons display colors based on status
- [ ] Adding a people group updates polygon colors
- [ ] Legend displays correctly

---

## 🚀 Quick Test Commands

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Backend (from project root)
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm start

# Terminal 4: Run Tests (from project root)
node backend/scripts/checkPeopleGroups.js
node backend/scripts/testVillageStatuses.js
node backend/scripts/listGeoJSONVillages.js
node backend/scripts/seedTestPeopleGroups.js
node backend/scripts/testCompleteFlow.js
```

---

## 📝 Notes

- Village names must match between people groups and GeoJSON (case-insensitive matching is recommended)
- The status calculation uses threshold-based rules:
  - DMM: ≥30% of people groups have DMM status
  - Tipping Point: ≥40% have Tipping Point status
  - Midway: ≥50% have Midway status
  - Pioneer: ≥70% have Pioneer status
- Socket.IO events are emitted when people groups are created/updated/deleted
- The frontend should automatically refresh when receiving Socket.IO events
