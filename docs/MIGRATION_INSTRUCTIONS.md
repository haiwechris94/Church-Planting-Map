# Village Name Migration Instructions

## Overview

The village status calculation system has been enhanced with a **spatial fallback** mechanism. This means village colors will now update correctly even if the migration script hasn't been run yet.

## How It Works

### Two-Phase Status Calculation

1. **Phase 1 (Fast)**: Query people groups by `villageName` field
   - Requires migration script to be run
   - Very fast queries using indexed field

2. **Phase 2 (Spatial Fallback)**: Query people groups by coordinates
   - Works without migration
   - Uses MongoDB's `$geoWithin` to find people groups inside village polygons
   - Slightly slower but fully functional

## Running the Migration Script

For optimal performance, run the migration script to populate the `villageName` field:

```bash
# Preview changes (dry run)
node scripts/migrateVillageNames.js --dry-run

# Run the migration
node scripts/migrateVillageNames.js

# Force update all (even if villageName already exists)
node scripts/migrateVillageNames.js --force

# Verbose output
node scripts/migrateVillageNames.js --verbose
```

### What the Migration Does

1. Reads all people groups from the database
2. For each people group with coordinates:
   - First tries to find which village polygon contains those coordinates
   - Falls back to finding the nearest village if no polygon match
3. Updates the `villageName` field on each people group

### Prerequisites

- MongoDB must be running
- The `villages_voronoi.geojson` file must exist in `frontend/public/data/`
- The `villages.geojson` file should exist for nearest-village fallback

## Troubleshooting

### Villages Not Changing Colors

If villages remain gray despite having people groups:

1. **Check if people groups are approved**:
   ```javascript
   // In MongoDB shell
   db.peoplegroups.find({ approved: true }).count()
   ```

2. **Check if villages have boundary polygons**:
   ```javascript
   db.villages.find({ 'boundary.coordinates': { $exists: true } }).count()
   ```

3. **Check server logs** for detailed status calculation info:
   ```
   [VillageStatusService] ═══════════════════════════════════════════════════════
   [VillageStatusService] Starting village status calculation...
   [VillageStatusService] Phase 1: Found X unique village names from people groups
   ```

4. **Run the migration script** if you see:
   ```
   [VillageStatusService] ⚠️  No villageName data found - using SPATIAL FALLBACK
   ```

### Dashboard Not Updating

The Dashboard now listens to Socket.IO events for real-time updates. If it's not updating:

1. **Check Socket.IO connection** in browser console:
   ```
   [Socket.IO] ✅ Socket CONNECTED
   ```

2. **Check for event reception**:
   ```
   [Dashboard] 📊 People group update received: added
   [Dashboard] 🏘️ Village status update received: VillageName
   ```

3. **Verify backend is emitting events** in server logs:
   ```
   [Socket.IO] Emitting people-group-added event
   [Socket.IO] Emitting village-status-updated event
   ```

## API Response Changes

The `/api/villages/statuses` endpoint now includes additional metadata:

```json
{
  "villages": [...],
  "statistics": {
    "totalVillages": 100,
    "villagesWithPeopleGroups": 45,
    "usedSpatialFallback": true,
    ...
  },
  "_meta": {
    "usedSpatialFallback": true,
    "migrationRequired": true,
    "migrationCommand": "node scripts/migrateVillageNames.js"
  }
}
```

## Performance Considerations

| Method | Speed | Requirements |
|--------|-------|--------------|
| villageName query | Fast (~50ms) | Migration script run |
| Spatial fallback | Slower (~500ms) | Villages with boundary polygons |

For production environments with many villages, running the migration script is recommended.
