# Multi-Country Implementation Plan for Church Planting Map

## Overview

This document outlines the comprehensive implementation plan to extend the Church Planting Map application from Cameroon-only support to all Central African countries.

## Target Countries

| ISO2 | ISO3 | Country Name | French Name | Default Center | Default Zoom |
|------|------|--------------|-------------|----------------|--------------|
| CM | CMR | Cameroon | Cameroun | [7.3697, 12.3547] | 6 |
| TD | TCD | Chad | Tchad | [15.4542, 18.7322] | 5 |
| CF | CAF | Central African Republic | République centrafricaine | [6.6111, 20.9394] | 6 |
| CG | COG | Congo | Congo | [-0.2280, 15.8277] | 6 |
| CD | COD | Democratic Republic of the Congo | RD Congo | [-4.0383, 21.7587] | 5 |
| GA | GAB | Gabon | Gabon | [-0.8037, 11.6094] | 7 |
| GQ | GNQ | Equatorial Guinea | Guinée équatoriale | [1.6508, 10.2679] | 8 |
| ST | STP | São Tomé and Príncipe | Sao Tomé-et-Príncipe | [0.1864, 6.6131] | 10 |

## Current Architecture Analysis

### Backend Structure
- **Models**: Village.js, People.js, PeopleGroup.js - all have `country` field
- **Services**: 
  - `administrativeService.js` - handles GeoJSON loading per country
  - `villageStatusService.js` - calculates DMM status
  - `dmmStatusCalculator.js` - DMM status calculation logic
- **Config**: `countries.js` - already has all 54 African countries configured

### Frontend Structure
- **Config**: `countryConfig.js` - has 7 countries configured (missing CD, ST)
- **Components**: `CountryMultiSelect.jsx` - multi-select dropdown
- **Pages**: `GeoJSONMapView.jsx` - main map view

### DMM Status Logic (Preserved)
```
Status Thresholds (by % of people groups):
- DMM: ≥ 30% have DMM status → Green (#22c55e)
- Tipping Point: ≥ 40% have Tipping Point status → Orange (#f97316)
- Midway: ≥ 50% have Midway status → Blue (#3b82f6)
- Pioneer: ≥ 70% have Pioneer status → Yellow (#eab308)
- Unreached: ≥ 90% have Unreached status → Red (#ef4444)
- Pas d'information: No people groups → Gray (#9ca3af)
```

## Implementation Tasks

### 1. Database Schema Updates

#### 1.1 Countries Collection (New)
Create a dedicated countries collection for runtime configuration:

```javascript
// backend/models/Country.js
const countrySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // ISO2 code
  code3: { type: String, required: true }, // ISO3 code
  name: { type: String, required: true },
  nameFr: { type: String, required: true },
  defaultCenter: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  defaultZoom: { type: Number, required: true, default: 6 },
  bounds: {
    south: Number,
    west: Number,
    north: Number,
    east: Number
  },
  adminLevels: {
    1: { name: String, nameEn: String },
    2: { name: String, nameEn: String },
    3: { name: String, nameEn: String }
  },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  dataAvailable: {
    adminPolygons: { type: Boolean, default: false },
    villages: { type: Boolean, default: false },
    joshuaProject: { type: Boolean, default: false }
  }
}, { timestamps: true });
```

#### 1.2 Update Village Model
Already has `country` field - ensure index exists:
```javascript
villageSchema.index({ country: 1 });
villageSchema.index({ country: 1, region: 1 });
```

#### 1.3 Update PeopleGroup Model
Already has `country` field - ensure proper indexing:
```javascript
peopleGroupSchema.index({ country: 1 });
peopleGroupSchema.index({ country: 1, villageName: 1 });
```

### 2. Backend API Updates

#### 2.1 New Countries Endpoint
```javascript
// GET /api/countries
// Returns list of active countries with their configurations

// GET /api/countries/:code
// Returns single country configuration

// GET /api/countries/:code/stats
// Returns statistics for a country (villages, peoples, churches)
```

#### 2.2 Modified Villages Endpoint
```javascript
// GET /api/villages
// Query params:
// - country: ISO2 code (default: 'CM')
// - region: Region name
// - departement: Department name
// - arrondissement: Arrondissement name
// - status: DMM status filter
```

#### 2.3 Modified Villages-Map Endpoint
```javascript
// GET /api/villages/map
// Query params:
// - country: ISO2 code (default: 'CM')
// - region: Optional region filter
// - departement: Optional department filter
// - arrondissement: Optional arrondissement filter
// - includePolygons: boolean (default: true)
// - includePeoples: boolean (default: true)
// - includeJoshuaProject: boolean (default: false)

// Response:
{
  country: { code, name, center, zoom },
  adminPolygons: {
    regions: GeoJSON,
    departments: GeoJSON,
    arrondissements: GeoJSON
  },
  villages: [
    {
      _id, name, location, boundary,
      region, departement, arrondissement,
      status, statusColor,
      peopleGroups: [{ name, status, statusColor }]
    }
  ],
  statistics: {
    totalVillages,
    byStatus: { dmm, tippingPoint, midway, pioneer, unreached },
    totalPeopleGroups
  }
}
```

### 3. Data Loading Logic

#### 3.1 Country → Polygons Mapping
```
Country Code → Admin Polygons Files:
- CMR → Admin123CMR fusionnées.geojson (existing)
- TCD → Admin123TCD fusionnées.geojson (to create)
- CAF → Admin123CAF fusionnées.geojson (to create)
- COG → Admin123COG fusionnées.geojson (to create)
- COD → Admin123COD fusionnées.geojson (to create)
- GAB → Admin123GAB fusionnées.geojson (to create)
- GNQ → Admin123GNQ fusionnées.geojson (to create)
- STP → Admin123STP fusionnées.geojson (to create)

Fallback: GADM files (gadm41_{CODE}_{level}.json)
```

#### 3.2 Villages Loading
```
Country Code → Villages Files:
- CMR → villages.geojson (existing)
- Others → villages_{CODE}.geojson

Villages are also loaded from MongoDB Village collection
filtered by country field.
```

#### 3.3 People Groups Loading
```
Sources:
1. DMM Peoples: PeopleGroup collection filtered by country
2. Joshua Project: joshuaProjectService.getByCountry(code)

Both sources contribute to village status calculation.
```

### 4. Frontend Updates

#### 4.1 Update countryConfig.js
Add missing countries (CD, ST) and ensure all have proper configuration.

#### 4.2 Country Selector Component
Create a single-select country dropdown that:
- Shows all active countries
- Defaults to Cameroon
- Triggers map reload on change
- Updates URL query parameter

#### 4.3 Map View Updates
- Add country selector to map controls
- Auto-center map on country change
- Load appropriate admin polygons
- Filter villages by country
- Update statistics panel

### 5. Backward Compatibility

#### 5.1 Default Country
- All endpoints default to 'CM' (Cameroon) if no country specified
- Existing data without country field assumed to be Cameroon
- Migration script to set country='Cameroon' on existing records

#### 5.2 API Versioning
- Existing endpoints continue to work unchanged
- New country parameter is optional
- Response format remains compatible

### 6. Data Migration

#### 6.1 Set Default Country on Existing Data
```javascript
// Migration script
db.villages.updateMany(
  { country: { $exists: false } },
  { $set: { country: 'Cameroon' } }
);

db.peoples.updateMany(
  { country: { $exists: false } },
  { $set: { country: 'Cameroon' } }
);

db.peoplegroups.updateMany(
  { country: { $exists: false } },
  { $set: { country: 'Cameroon' } }
);
```

#### 6.2 Seed Countries Collection
```javascript
// Seed script for countries collection
const centralAfricanCountries = [
  { code: 'CM', code3: 'CMR', name: 'Cameroon', nameFr: 'Cameroun', isDefault: true, ... },
  { code: 'TD', code3: 'TCD', name: 'Chad', nameFr: 'Tchad', ... },
  // ... other countries
];
```

## File Changes Summary

### New Files
1. `backend/models/Country.js` - Country model
2. `backend/routes/countries.js` - Countries API routes
3. `backend/scripts/seedCountries.js` - Seed script
4. `backend/scripts/migrateCountryField.js` - Migration script
5. `frontend/src/components/CountrySelector.jsx` - Single country selector

### Modified Files
1. `backend/config/countries.js` - Add helper functions
2. `backend/routes/villages.js` - Add country filter
3. `backend/services/villageStatusService.js` - Add country parameter
4. `backend/services/administrativeService.js` - Already supports multi-country
5. `frontend/src/config/countryConfig.js` - Add CD, ST
6. `frontend/src/pages/GeoJSONMapView.jsx` - Add country selector
7. `frontend/src/services/api.js` - Add country parameter to calls

## Testing Checklist

- [ ] Cameroon data loads correctly (backward compatibility)
- [ ] Country selector changes map center and zoom
- [ ] Admin polygons load for each country
- [ ] Villages filter by country
- [ ] People groups filter by country
- [ ] DMM status calculation works per country
- [ ] Statistics update per country
- [ ] URL reflects selected country
- [ ] Default to Cameroon when no country specified
