# Population Data Integration - Implementation Summary

## Overview
This implementation downloads real population data from HumData.org and integrates it into the Church Planting Map application to provide demographic information for villages.

## Files Created

### 1. `scripts/downloadPopulationData.js`
Downloads CSV files from HumData.org containing Cameroon population statistics:
- **ADM0**: Country-level data (total population: ~29.4 million)
- **ADM1**: Region-level data (10 regions)
- **ADM2**: Department-level data (currently only 2 metropolitan areas: Douala and Yaoundé)

Features:
- Reads metadata files from `frontend/public/data/`
- Downloads CSV files to `backend/data/population/`
- Handles redirects and retries
- Creates a download manifest

### 2. `services/demographicService.js`
Service for population data lookup and village-to-department mapping:
- Loads and parses CSV population data
- Maps villages to departments using coordinates (via admin boundaries GeoJSON)
- Falls back to region-level data when department data isn't available
- Provides demographic information including:
  - Total population
  - Male/Female breakdown
  - Age demographics (children, youth, adults, elderly)

### 3. `scripts/integratePopulationData.js`
Integration script that:
- Downloads population data (optional)
- Updates villages in MongoDB with population estimates
- Uses region-level data as fallback when department data isn't available
- Provides detailed logging and statistics

### 4. API Endpoint: `GET /api/villages/:id/demographics`
Returns demographic information for a specific village:
```json
{
  "villageName": "Village Name",
  "villageId": "...",
  "mapped": true,
  "department": "Department Name",
  "region": "Region Name",
  "demographics": {
    "totalPopulation": 123456,
    "malePopulation": 60000,
    "femalePopulation": 63456,
    ...
  },
  "source": "coordinates"
}
```

## NPM Scripts Added

```bash
npm run population:download    # Download fresh data from HumData.org
npm run population:integrate   # Download and update villages
npm run population:update      # Update villages (use existing data)
npm run population:dry-run     # Preview changes without updating
```

## Data Sources

### HumData.org URLs
- ADM0 (Country): `https://data.humdata.org/.../copy-of-cmr_admpop_adm0_2025.csv`
- ADM1 (Regions): `https://data.humdata.org/.../copy-of-cmr_admpop_adm1_2025.csv`
- ADM2 (Departments): `https://data.humdata.org/.../copy-of-cmr_admpop_met_2025.csv`

### Downloaded Files Location
`backend/data/population/`
- `CMR_admpop_adm0_2025.csv` - Country level
- `CMR_admpop_adm1_2025.csv` - Region level (10 regions)
- `CMR_admpop2_2025.csv` - Department level (2 metro areas)
- `download-manifest.json` - Download metadata

## Population Data Summary (2025 Projections)

### Country Level (Cameroon)
- Total Population: 29,442,318
- Male: 14,474,871
- Female: 14,967,447

### Regions (ADM1)
| Region | Population |
|--------|------------|
| Far-North | 5,499,116 |
| Centre | 5,487,640 |
| Littoral | 4,498,867 |
| North | 3,485,916 |
| North-West | 2,428,174 |
| West | 2,232,838 |
| South-West | 2,098,489 |
| Adamawa | 1,541,773 |
| East | 1,283,771 |
| South | 885,734 |

## Village-to-Department Mapping

The service maps villages to departments using three methods (in order of priority):

1. **Existing Field**: If village has `departement` field set
2. **Coordinates**: Uses point-in-polygon with admin boundaries GeoJSON
3. **Region Fallback**: Uses region-level data if department can't be determined

## Population Estimation

Since the ADM2 data only contains 2 metropolitan areas, the system:
1. Maps villages to departments via coordinates
2. Falls back to region-level population data
3. Estimates village population by dividing region population by estimated number of villages

## Integration Results

Current database status:
- **Total villages**: 4
- **Already had population**: 3 (Lagdo: 300, Lagdo 2: 100, Bamsi: 150)
- **Could not map**: 1 (Village Riverside - no coordinates)
- **Success rate**: 75%

## Usage

### Run Full Integration
```bash
node scripts/integratePopulationData.js
```

### Preview Changes (Dry Run)
```bash
node scripts/integratePopulationData.js --dry-run --verbose
```

### Update Only (Use Existing Data)
```bash
node scripts/integratePopulationData.js --update
```

### Download Only
```bash
node scripts/integratePopulationData.js --download
```

## Notes

1. The ADM2 (department-level) data from HumData.org only contains 2 metropolitan areas (Douala and Yaoundé). For other departments, the system falls back to region-level data.

2. Population estimates for villages are rough approximations based on dividing regional population by estimated number of villages.

3. The admin boundaries GeoJSON file (`Admin123CMR fusionnées.geojson`) is used for point-in-polygon mapping to determine which department a village belongs to.

4. The demographic service caches data for 1 hour to improve performance.
