# OSM Village Extraction - Backend Documentation

## Overview

This module provides functionality to extract villages from OpenStreetMap (OSM) PBF files for Central African countries. It supports batch processing, progress tracking, and integration with the existing Village model.

## Supported Countries (Central Africa)

| Code | Country | French Name |
|------|---------|-------------|
| CM | Cameroon | Cameroun |
| CF | Central African Republic | République centrafricaine |
| TD | Chad | Tchad |
| CG | Republic of the Congo | République du Congo |
| CD | Democratic Republic of the Congo | RDC |
| GQ | Equatorial Guinea | Guinée équatoriale |
| GA | Gabon | Gabon |
| ST | São Tomé and Príncipe | São Tomé-et-Príncipe |
| AO | Angola | Angola |
| BI | Burundi | Burundi |
| RW | Rwanda | Rwanda |

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

New dependencies added:
- `osm-pbf-parser` - For parsing OSM.pbf files
- `through2` - For streaming data processing

### 2. Verify OSM.pbf File

Ensure the OSM.pbf file is located at:
```
frontend/public/data/africa-251226.osm.pbf
```

### 3. (Optional) Add Country Boundary Files

For more accurate filtering, add GeoJSON boundary files to:
```
frontend/public/data/boundaries/
```

File naming convention:
- `CM.geojson` - Cameroon boundary
- `CF.geojson` - Central African Republic boundary
- etc.

## API Endpoints

### 1. Get Supported Countries
```http
GET /api/osm/countries
```

Returns list of supported countries with village counts.

**Response:**
```json
{
  "region": "Central Africa",
  "totalCountries": 11,
  "totalOsmVillages": 12345,
  "countries": [
    {
      "code": "CM",
      "name": "Cameroon",
      "nameFr": "Cameroun",
      "bbox": [8.4, 1.6, 16.2, 13.1],
      "villageCount": 1234
    }
  ]
}
```

### 2. Extract Villages for Single Country
```http
POST /api/osm/extract-villages/:countryCode
Authorization: Bearer <token>
```

**Parameters:**
- `countryCode` - ISO 3166-1 alpha-2 code (e.g., CM, CF, CD)

**Body (optional):**
```json
{
  "placeTypes": ["village", "hamlet", "town", "city"],
  "minPopulation": 0
}
```

**Response:**
```json
{
  "message": "Extraction job started for Cameroon",
  "job": {
    "jobId": "osm-CM-1234567890",
    "countryCode": "CM",
    "countryName": "Cameroon",
    "status": "pending"
  },
  "statusUrl": "/api/osm/status/osm-CM-1234567890"
}
```

### 3. Extract All Central African Countries
```http
POST /api/osm/extract-all-africa
Authorization: Bearer <token>
```

Starts a batch job to extract villages for all 11 Central African countries.

**Response:**
```json
{
  "message": "Batch extraction job started",
  "job": {
    "jobId": "osm-ALL-AFRICA-1234567890",
    "jobType": "all-africa",
    "totalCountries": 11
  }
}
```

### 4. Get Job Status
```http
GET /api/osm/status/:jobId
```

**Response:**
```json
{
  "job": {
    "jobId": "osm-CM-1234567890",
    "status": "processing",
    "progress": {
      "current": 500,
      "total": 1000,
      "percentage": 50,
      "currentCountry": "Cameroon"
    },
    "results": {
      "totalVillagesExtracted": 500,
      "totalVillagesSaved": 450,
      "duplicatesSkipped": 50
    }
  },
  "queue": {
    "isProcessing": true,
    "queueLength": 2
  }
}
```

### 5. Delete OSM Villages by Country
```http
DELETE /api/osm/villages/:countryCode
Authorization: Bearer <token>
```

Deletes all OSM-sourced villages for a specific country.

**Response:**
```json
{
  "message": "Successfully deleted OSM villages for Cameroon",
  "result": {
    "countryCode": "CM",
    "countryName": "Cameroon",
    "deletedCount": 1234
  }
}
```

### 6. Get Extraction Jobs
```http
GET /api/osm/jobs?limit=10&status=completed
```

### 7. Cancel Job
```http
POST /api/osm/jobs/:jobId/cancel
Authorization: Bearer <token>
```

### 8. Get Statistics
```http
GET /api/osm/stats?countryCode=CM
```

## Command Line Usage

### List Supported Countries
```bash
npm run osm:extract -- --list
```

### Extract for Single Country
```bash
npm run osm:extract -- --country CM
npm run osm:extract -- --country CM --verbose
npm run osm:extract -- --country CM --dry-run
```

### Extract All Countries
```bash
npm run osm:extract -- --all
npm run osm:extract -- --all --dry-run
```

## Data Model

### Village Model Updates

The Village model has been extended with OSM-specific fields:

```javascript
{
  // ... existing fields ...
  
  // Data source tracking
  source: {
    type: String,
    enum: ['manual', 'osm', 'import', 'geojson'],
    default: 'manual'
  },
  
  // OSM-specific data
  osmData: {
    osmId: Number,           // OSM node ID
    placeType: String,       // village, hamlet, town, city
    countryCode: String,     // ISO country code
    tags: {
      place: String,
      name: String,
      nameFr: String,
      nameEn: String,
      population: String,
      adminLevel: String
    },
    importedAt: Date
  }
}
```

### OsmJob Model

Tracks extraction jobs:

```javascript
{
  jobId: String,              // Unique job identifier
  jobType: String,            // 'single-country' or 'all-africa'
  countryCode: String,        // Target country or 'ALL'
  countryName: String,
  status: String,             // pending, processing, completed, failed, cancelled
  progress: {
    current: Number,
    total: Number,
    percentage: Number,
    currentCountry: String,
    processedCountries: Array
  },
  results: {
    totalVillagesExtracted: Number,
    totalVillagesSaved: Number,
    duplicatesSkipped: Number,
    errors: Array
  },
  startedAt: Date,
  completedAt: Date,
  createdBy: ObjectId
}
```

## Architecture

### Files Created

```
backend/
├── models/
│   └── OsmJob.js              # Job tracking model
├── services/
│   ├── osmService.js          # OSM parsing and extraction
│   └── jobQueueService.js     # Job queue management
├── controllers/
│   └── osmController.js       # API endpoint handlers
├── routes/
│   └── osm.js                 # Route definitions
└── scripts/
    └── extractOsmVillages.js  # CLI extraction tool
```

### Files Modified

- `backend/models/Village.js` - Added source and osmData fields
- `backend/server.js` - Registered OSM routes
- `backend/package.json` - Added dependencies

## Error Handling

The system handles various error scenarios:

1. **Invalid country code** - Returns 400 with list of valid codes
2. **Job already running** - Returns 409 with existing job info
3. **OSM.pbf file not found** - Returns 500 with file path
4. **Database errors** - Logged and tracked in job results

## Performance Considerations

1. **Streaming** - Uses streaming to handle large PBF files
2. **Batch processing** - Processes countries sequentially to avoid memory issues
3. **Progress tracking** - Real-time progress updates via job status
4. **Duplicate detection** - Skips existing villages by OSM ID or coordinates

## Troubleshooting

### OSM.pbf file not found
```
Error: OSM.pbf file not found at: /path/to/africa-251226.osm.pbf
```
Solution: Verify the file exists at `frontend/public/data/africa-251226.osm.pbf`

### osm-pbf-parser not available
```
[OsmService] osm-pbf-parser not available, using fallback method
```
Solution: Run `npm install osm-pbf-parser through2`

### MongoDB connection error
```
❌ MongoDB connection failed
```
Solution: Check MONGODB_URI in .env file

## Future Improvements

1. Add Redis/Bull for production job queue
2. Implement WebSocket progress updates
3. Add support for more African regions
4. Implement incremental updates from OSM
5. Add data validation and quality checks
