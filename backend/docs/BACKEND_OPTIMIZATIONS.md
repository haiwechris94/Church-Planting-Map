# Backend Optimizations Guide

This document describes the performance optimizations implemented in the Church Planting Map API (v2.1.0).

## Table of Contents

1. [MongoDB Indexes](#mongodb-indexes)
2. [Express Middleware](#express-middleware)
3. [GeoJSON Polygon Simplification](#geojson-polygon-simplification)
4. [Clustering Modes](#clustering-modes)
5. [API Usage Examples](#api-usage-examples)
6. [Performance Metrics](#performance-metrics)

---

## MongoDB Indexes

### Location: `backend/models/PeopleGroup.js`

The PeopleGroup model includes optimized indexes for common query patterns:

### Single-Field Indexes
```javascript
// Geospatial index (required for $near, $geoWithin)
peopleGroupSchema.index({ location: '2dsphere' });

// Common filter fields
peopleGroupSchema.index({ status: 1 });
peopleGroupSchema.index({ countryCode: 1 });
peopleGroupSchema.index({ country: 1 });
peopleGroupSchema.index({ approved: 1 });
peopleGroupSchema.index({ source: 1 });
peopleGroupSchema.index({ engagementStatus: 1 });
```

### Compound Indexes
```javascript
// Country + status (most common filter combination)
peopleGroupSchema.index({ countryCode: 1, status: 1 });
peopleGroupSchema.index({ country: 1, status: 1 });

// Approved + status (dashboard queries)
peopleGroupSchema.index({ approved: 1, status: 1 });

// Pagination indexes (sort + filter)
peopleGroupSchema.index({ approved: 1, createdAt: -1 });
peopleGroupSchema.index({ countryCode: 1, createdAt: -1 });
```

### Text Index
```javascript
// Full-text search on name field
peopleGroupSchema.index({ name: 'text' }, { 
  name: 'name_text_search',
  default_language: 'english',
  weights: { name: 10 }
});
```

### Running Index Creation Script
```bash
cd backend
npm run db:indexes
```

---

## Express Middleware

### Location: `backend/middleware/optimization.js`

### Middleware Stack (in order)

1. **Security Headers** - Adds X-Frame-Options, X-Content-Type-Options, etc.
2. **CORS** - Cross-origin request handling
3. **Compression** - Gzip responses (60-80% size reduction)
4. **Request Timeout** - 30 second timeout for all requests
5. **Rate Limiting** - 100 req/min (production), 500 req/min (development)
6. **Body Parsing** - JSON with 10MB limit
7. **Query Protection** - Prevents unbounded queries
8. **Request Logging** - Development-only request logging

### Configuration in server.js
```javascript
// Compression - reduces bandwidth by 60-80%
app.use(compressionMiddleware({ threshold: 1024, level: 6 }));

// Rate limiting - protects against abuse
app.use(rateLimitMiddleware({
  windowMs: 60000,  // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 500
}));

// Query protection - prevents full database scans
app.use(queryProtectionMiddleware({
  protectedRoutes: ['/api/people-groups', '/api/villages', '/api/churches'],
  maxLimit: 500
}));
```

---

## GeoJSON Polygon Simplification

### How It Works

The API uses the Douglas-Peucker algorithm (via @turf/simplify) to reduce polygon complexity:

```javascript
// Simplification reduces coordinate points while preserving shape
Original polygon: 5,000 points → Simplified: 500 points (90% reduction)
```

### Tolerance Values

| Zoom Level | Tolerance | Use Case | Reduction |
|------------|-----------|----------|-----------|
| 1-5 | 0.1 | World/continent view | ~90% |
| 6-8 | 0.05 | Country view | ~80% |
| 9-10 | 0.01 | Region view | ~60% |
| 11-12 | 0.005 | City view | ~40% |
| 13-14 | 0.001 | Neighborhood view | ~20% |
| 15+ | 0.0005 | Street view | ~10% |

### API Parameters

```
GET /api/people-groups?includeGeometry=true&tolerance=0.01
GET /api/people-groups?includeGeometry=true&zoomLevel=8
```

---

## Clustering Modes

### Mode: `points` (Minimal Data)

Returns only essential fields for marker clustering. ~200 bytes per record.

```
GET /api/people-groups?mode=points
```

**Response fields:**
- `_id`
- `name`
- `location` (coordinates)
- `status`
- `statusColor`
- `country`
- `countryCode`

### Mode: `polygon` (Simplified Geometry)

Returns simplified polygons based on zoom level. ~2-10KB per record.

```
GET /api/people-groups?mode=polygon&zoomLevel=8
```

**Response fields:**
- All standard fields
- `polygon` (simplified based on zoomLevel)

### Mode: `full` (Complete Data)

Returns all data including full polygon geometry. Default mode for backward compatibility.

```
GET /api/people-groups?mode=full&includeGeometry=true
```

---

## API Usage Examples

### 1. Get Points for Map Clustering (Fastest)
```bash
curl "http://localhost:3000/api/people-groups?mode=points&countryCode=CM"
```

**Response:**
```json
{
  "data": [
    {
      "_id": "...",
      "name": "Bamileke",
      "location": { "type": "Point", "coordinates": [10.5, 5.5] },
      "status": "pioneer",
      "country": "Cameroon"
    }
  ],
  "meta": {
    "mode": "points",
    "count": 150
  }
}
```

### 2. Get Simplified Polygons for Region View
```bash
curl "http://localhost:3000/api/people-groups?mode=polygon&zoomLevel=8&countryCode=CM"
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "mode": "polygon",
    "zoomLevel": 8,
    "simplification": {
      "applied": true,
      "tolerance": 0.05,
      "totalPointsBefore": 50000,
      "totalPointsAfter": 10000,
      "reductionPercent": 80
    }
  }
}
```

### 3. Get Full Data with Manual Simplification
```bash
curl "http://localhost:3000/api/people-groups?includeGeometry=true&tolerance=0.01"
```

### 4. Filter by Viewport Bounds
```bash
curl "http://localhost:3000/api/people-groups?bounds=2.0,8.0,13.0,16.0&mode=points"
```

---

## Performance Metrics

### Expected Response Times

| Query Type | Records | Response Time |
|------------|---------|---------------|
| Points mode (no geometry) | 500 | 50-100ms |
| Polygon mode (simplified) | 500 | 100-200ms |
| Full mode (with geometry) | 500 | 200-500ms |
| Full mode (no geometry) | 500 | 50-100ms |

### Payload Size Comparison

| Mode | Per Record | 500 Records |
|------|------------|-------------|
| Points | ~200 bytes | ~100 KB |
| Polygon (zoom 8) | ~2 KB | ~1 MB |
| Full (no geometry) | ~1 KB | ~500 KB |
| Full (with geometry) | ~10-50 KB | ~5-25 MB |

### Index Performance

With proper indexes:
- Country filter: <10ms
- Status filter: <10ms
- Country + Status: <10ms
- Text search: <50ms
- Geospatial query: <100ms

Without indexes:
- Full collection scan: 500-2000ms

---

## Troubleshooting

### Check Index Status
```bash
cd backend
npm run db:indexes
```

### Monitor Query Performance
Enable MongoDB profiling:
```javascript
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(10)
```

### Common Issues

1. **Slow queries**: Check if indexes exist with `db.peoplegroups.getIndexes()`
2. **Large payloads**: Use `mode=points` or reduce `limit`
3. **Rate limiting**: Increase `max` in development or use API key
4. **Timeout errors**: Reduce query scope or add filters

---

## Files Modified

- `backend/models/PeopleGroup.js` - Enhanced indexes
- `backend/middleware/optimization.js` - New middleware file
- `backend/server.js` - Middleware integration
- `backend/routes/peopleGroups.js` - Clustering modes & simplification
- `backend/scripts/createIndexes.js` - Index creation script
- `backend/package.json` - Added `db:indexes` script
