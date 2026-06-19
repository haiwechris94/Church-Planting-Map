# Database Population Guide

This guide explains how to populate village data in the Church Planting Map database.

## Overview

The application uses MongoDB to store village and people group data. Villages can be populated from:
1. GeoJSON files (polygon boundaries)
2. CSV imports
3. Manual entry through the UI

## Village Data Structure

### MongoDB Village Schema

```javascript
{
  name: String,           // Village name (required)
  country: String,        // Country name
  countryCode: String,    // ISO country code (CM, TD, CG, etc.)
  region: String,         // Admin level 1 (Region/Province)
  departement: String,    // Admin level 2 (Department)
  arrondissement: String, // Admin level 3 (Arrondissement/District)
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  boundary: {
    type: 'Polygon',
    coordinates: [[[lng, lat], [lng, lat], ...]]
  },
  population: Number,
  status: String,         // Calculated DMM status
  osmData: {              // OpenStreetMap metadata
    osmId: String,
    countryCode: String,
    adminLevel: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Importing Village Polygons

### Method 1: GeoJSON Files

Village polygons are stored in `frontend/public/data/` directory:

| Country | File | Description |
|---------|------|-------------|
| Cameroon | `villages.geojson` | Point data for villages |
| Cameroon | `Villages découpés.geojson` | Polygon boundaries |
| Chad | `VChad_polygons.geojson` | Village polygons |
| Congo Brazzaville | `VCongoBrazza_Polygons.geojson` | Village polygons |
| CAF | `VCAF_Polygons.geojson` | Village polygons |
| Gabon | `VGabon_Polygons.geojson` | Village polygons |

### GeoJSON Feature Properties

Each village feature should have these properties:
```json
{
  "type": "Feature",
  "properties": {
    "name": "Village Name",
    "NAME": "Village Name (alternative)",
    "admin1": "Region Name",
    "admin2": "Department Name",
    "admin3": "Arrondissement Name",
    "country": "Cameroon",
    "population": 5000
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], ...]]
  }
}
```

### Method 2: Import Script

Use the provided import script to bulk import villages:

```bash
cd backend
node scripts/importVillages.js --file ../frontend/public/data/villages.geojson --country CM
```

Options:
- `--file`: Path to GeoJSON file
- `--country`: ISO country code
- `--dry-run`: Preview without saving
- `--update`: Update existing villages

### Method 3: API Import

POST to `/api/villages/import`:

```javascript
const response = await fetch('/api/villages/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    villages: [
      {
        name: "Village Name",
        country: "Cameroon",
        countryCode: "CM",
        region: "Centre",
        location: {
          type: "Point",
          coordinates: [11.5, 3.8]
        }
      }
    ]
  })
});
```

## Importing People Groups

### CSV Template

Download country-specific templates from the Data Management page or use the API:

```
GET /api/import/people-groups/template/:country
```

Available countries:
- `cameroun`
- `congo-brazzaville`
- `congo-rdc`
- `centrafrique`
- `tchad`
- `gabon`
- `guinee-equatoriale`

### CSV Format

```csv
name;villageName;latitude;longitude;population;numberOfChurches;churchGeneration;region;department;arrondissement;description
Peuple Bamiléké;Bafoussam;5.4737;10.4179;50000;120;4;Ouest;Mifi;Bafoussam 1er;Engagement actif
```

### Import via UI

1. Go to Data Management page
2. Download the appropriate country template
3. Fill in your data
4. Upload the CSV file
5. Review the preview
6. Click "Import Data"

## Village Status Calculation

Village status is automatically calculated based on people groups:

| Status | Threshold | Color |
|--------|-----------|-------|
| DMM | ≥30% DMM peoples | Green |
| Tipping Point | ≥40% Tipping Point peoples | Orange |
| Midway | ≥50% Midway peoples | Blue |
| Pioneer | ≥70% Pioneer peoples | Yellow |
| Unreached | ≥90% Unreached peoples | Red |
| Pas d'information | No people groups | Gray |

## Scripts Available

### Migration Scripts

```bash
# Migrate village names to people groups
node scripts/migrateVillageNames.js

# Recalculate all village statuses
node scripts/recalculateVillageStatuses.js

# Import villages from GeoJSON
node scripts/importVillages.js --file <path> --country <code>
```

### Data Validation

```bash
# Validate village data integrity
node scripts/validateVillages.js

# Check for duplicate villages
node scripts/findDuplicateVillages.js
```

## Troubleshooting

### Village Not Found Error

If you see "Le village 'X' n'existe pas dans la base de données":

1. Check if the village exists in the GeoJSON files
2. Verify the village name spelling matches exactly
3. The system checks all country GeoJSON files, not just Cameroon

### Status Not Updating

If village status doesn't update after adding people groups:

1. Wait 500ms for the database to update
2. Refresh the map layer
3. Check browser console for errors
4. Verify the people group has `approved: true`

### Performance Issues

For large datasets:

1. Use pagination when fetching villages
2. Enable viewport-based loading (zoom level 10-18)
3. Use the simplified polygon endpoints for map display

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/villages` | GET | List all villages |
| `/api/villages/statuses` | GET | Get village status calculations |
| `/api/villages/:id` | GET | Get single village |
| `/api/villages/import` | POST | Bulk import villages |
| `/api/import/people-groups/template/:country` | GET | Download CSV template |

## Contact

For questions about database population, refer to the AGENTS.md file or contact the development team.
