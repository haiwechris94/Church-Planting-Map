# Cameroon Administrative Boundaries API

## Overview

The Boundaries API provides access to Cameroon's administrative boundary data from GADM (Global Administrative Areas) v4.1. This data includes three levels of administrative divisions:

- **Level 1**: Regions (10 regions)
- **Level 2**: Departments (58 departments)
- **Level 3**: Arrondissements (360+ arrondissements)

## Data Source

All boundary data comes from [GADM](https://gadm.org) - Global Administrative Areas, which provides high-quality administrative boundary data for all countries.

## File Locations

The boundary files are stored in:
```
frontend/public/data/
├── gadm41_CMR_1.json  (Regions - 188 KB)
├── gadm41_CMR_2.json  (Departments - 412 KB)
└── gadm41_CMR_3.json  (Arrondissements - 685 KB)
```

## API Endpoints

### 1. Get All Available Boundaries

**Endpoint:** `GET /api/boundaries`

**Description:** Returns a list of all available boundary files with metadata.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "boundaries": [
    {
      "level": 1,
      "name": "Regions",
      "filename": "gadm41_CMR_1.json",
      "url": "/api/boundaries/level/1"
    },
    {
      "level": 2,
      "name": "Departments",
      "filename": "gadm41_CMR_2.json",
      "url": "/api/boundaries/level/2"
    },
    {
      "level": 3,
      "name": "Arrondissements",
      "filename": "gadm41_CMR_3.json",
      "url": "/api/boundaries/level/3"
    }
  ]
}
```

### 2. Get Boundary Data by Level

**Endpoint:** `GET /api/boundaries/level/:level`

**Parameters:**
- `level` (required): Administrative level (1, 2, or 3)

**Examples:**
```bash
# Get all regions
GET /api/boundaries/level/1

# Get all departments
GET /api/boundaries/level/2

# Get all arrondissements
GET /api/boundaries/level/3
```

**Response:**
```json
{
  "success": true,
  "level": 1,
  "levelName": "Regions",
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "GID_1": "CMR.1_1",
          "NAME_1": "Adamaoua",
          "TYPE_1": "Région",
          "ENGTYPE_1": "Region"
        },
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": [...]
        }
      }
    ]
  }
}
```

### 3. Get Regions List (Simplified)

**Endpoint:** `GET /api/boundaries/regions`

**Description:** Returns a simplified list of all regions without geometry data (smaller response size).

**Response:**
```json
{
  "success": true,
  "count": 10,
  "regions": [
    {
      "id": "CMR.1_1",
      "name": "Adamaoua",
      "type": "Région",
      "engType": "Region",
      "hasc": "CM.AD",
      "iso": "CM-AD"
    }
  ]
}
```

### 4. Get Departments List (Simplified)

**Endpoint:** `GET /api/boundaries/departments`

**Description:** Returns a simplified list of all departments without geometry data.

**Response:**
```json
{
  "success": true,
  "count": 58,
  "departments": [
    {
      "id": "CMR.1.1_1",
      "name": "Djerem",
      "region": "Adamaoua",
      "regionId": "CMR.1_1",
      "type": "Département",
      "engType": "Department"
    }
  ]
}
```

### 5. Get Arrondissements List (Simplified)

**Endpoint:** `GET /api/boundaries/arrondissements`

**Description:** Returns a simplified list of all arrondissements without geometry data.

**Response:**
```json
{
  "success": true,
  "count": 360,
  "arrondissements": [
    {
      "id": "CMR.1.1.1_1",
      "name": "Tibati",
      "department": "Djerem",
      "departmentId": "CMR.1.1_1",
      "region": "Adamaoua",
      "regionId": "CMR.1_1",
      "type": "Arrondissement",
      "engType": "District"
    }
  ]
}
```

### 6. Get Combined Data

**Endpoint:** `GET /api/boundaries/combined`

**Description:** Get combined data including boundaries, villages, and Voronoi diagrams in a single response.

**Query Parameters:**
- `level` (required): Administrative level (1, 2, or 3)
- `includeVillages` (optional): Include villages GeoJSON data (default: false)
- `includeVoronoi` (optional): Include Voronoi diagram data (default: false)

**Examples:**
```bash
# Get regions with villages
GET /api/boundaries/combined?level=1&includeVillages=true

# Get departments with villages and Voronoi
GET /api/boundaries/combined?level=2&includeVillages=true&includeVoronoi=true

# Get arrondissements only
GET /api/boundaries/combined?level=3
```

**Response:**
```json
{
  "success": true,
  "level": 1,
  "levelName": "Regions",
  "boundaries": { /* GeoJSON FeatureCollection */ },
  "villages": { /* GeoJSON FeatureCollection (if requested) */ },
  "voronoi": { /* GeoJSON FeatureCollection (if requested) */ }
}
```

## Cameroon Administrative Divisions

### Level 1: Regions (10)

1. **Adamaoua** (Adamawa)
2. **Centre** (Center)
3. **Est** (East)
4. **Extrême-Nord** (Far North)
5. **Littoral** (Littoral)
6. **Nord** (North)
7. **Nord-Ouest** (Northwest)
8. **Ouest** (West)
9. **Sud** (South)
10. **Sud-Ouest** (Southwest)

### Level 2: Departments (58)

Each region is divided into departments. For example:
- **Adamaoua**: Djerem, Faro-et-Déo, Mayo-Banyo, Mbéré, Vina
- **Centre**: Haute-Sanaga, Lekié, Mbam-et-Inoubou, Mbam-et-Kim, Méfou-et-Afamba, etc.

### Level 3: Arrondissements (360+)

Each department is further divided into arrondissements (sub-districts).

## Use Cases

### 1. Display Boundaries on a Map

```javascript
// Fetch regions and display on map
fetch('http://localhost:3000/api/boundaries/level/1')
  .then(response => response.json())
  .then(data => {
    const geojson = data.data;
    // Add to your map (Leaflet, Mapbox, etc.)
    L.geoJSON(geojson).addTo(map);
  });
```

### 2. Combine with Village Data

```javascript
// Get regions with villages
fetch('http://localhost:3000/api/boundaries/combined?level=1&includeVillages=true')
  .then(response => response.json())
  .then(data => {
    // Display boundaries
    L.geoJSON(data.boundaries, {
      style: { color: '#333', weight: 2, fillOpacity: 0.1 }
    }).addTo(map);
    
    // Display villages
    L.geoJSON(data.villages, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, { radius: 5, color: 'red' });
      }
    }).addTo(map);
  });
```

### 3. Filter Villages by Region

```javascript
// Get all regions
const regions = await fetch('/api/boundaries/regions').then(r => r.json());

// Get villages
const villages = await fetch('/api/villages').then(r => r.json());

// Filter villages by region using point-in-polygon
regions.regions.forEach(region => {
  const villagesInRegion = villages.filter(village => {
    // Use turf.js or similar for point-in-polygon check
    return turf.booleanPointInPolygon(
      village.geometry.coordinates,
      region.geometry
    );
  });
  console.log(`${region.name}: ${villagesInRegion.length} villages`);
});
```

### 4. Analyze Coverage by Administrative Division

```javascript
// Get departments with villages and Voronoi
fetch('/api/boundaries/combined?level=2&includeVillages=true&includeVoronoi=true')
  .then(response => response.json())
  .then(data => {
    // Analyze which departments have church coverage
    // Calculate coverage percentage per department
    // Identify gaps in church planting efforts
  });
```

## GeoJSON Format

All boundary data is returned in standard GeoJSON format:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "GID_1": "CMR.1_1",
        "GID_0": "CMR",
        "COUNTRY": "Cameroon",
        "NAME_1": "Adamaoua",
        "TYPE_1": "Région",
        "ENGTYPE_1": "Region"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [[[...]]]
      }
    }
  ]
}
```

### Property Fields

**Level 1 (Regions):**
- `GID_1`: Unique identifier
- `NAME_1`: Region name
- `TYPE_1`: Type in French
- `ENGTYPE_1`: Type in English
- `HASC_1`: Hierarchical administrative subdivision codes
- `ISO_1`: ISO code

**Level 2 (Departments):**
- `GID_2`: Unique identifier
- `NAME_2`: Department name
- `NAME_1`: Parent region name
- `GID_1`: Parent region ID
- `TYPE_2`: Type in French
- `ENGTYPE_2`: Type in English

**Level 3 (Arrondissements):**
- `GID_3`: Unique identifier
- `NAME_3`: Arrondissement name
- `NAME_2`: Parent department name
- `GID_2`: Parent department ID
- `NAME_1`: Parent region name
- `GID_1`: Parent region ID
- `TYPE_3`: Type in French
- `ENGTYPE_3`: Type in English

## Error Handling

### Invalid Level

```json
{
  "success": false,
  "error": "Invalid level",
  "message": "Level must be 1 (Regions), 2 (Departments), or 3 (Arrondissements)"
}
```

### File Not Found

```json
{
  "success": false,
  "error": "File not found",
  "message": "Boundary file for level 1 not found"
}
```

## Performance Considerations

1. **File Sizes:**
   - Level 1 (Regions): ~188 KB
   - Level 2 (Departments): ~412 KB
   - Level 3 (Arrondissements): ~685 KB

2. **Caching:** Consider implementing client-side caching for boundary data as it doesn't change frequently.

3. **Simplified Endpoints:** Use `/regions`, `/departments`, or `/arrondissements` endpoints when you only need names and IDs (much smaller response).

4. **Combined Endpoint:** Use the `/combined` endpoint to reduce multiple API calls when you need boundaries + villages + Voronoi.

## Testing with Postman

The Postman collection includes a "Boundaries" folder with all endpoints pre-configured:

1. Open the Church Planting Map API collection
2. Navigate to the "Boundaries" folder
3. Test each endpoint:
   - Get All Boundaries
   - Get Regions (Level 1)
   - Get Departments (Level 2)
   - Get Arrondissements (Level 3)
   - Get Regions List
   - Get Departments List
   - Get Arrondissements List
   - Get Combined Data

## Integration Examples

### React/Leaflet Example

```jsx
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';

function BoundariesMap() {
  const [boundaries, setBoundaries] = useState(null);
  const [villages, setVillages] = useState(null);

  useEffect(() => {
    // Fetch combined data
    fetch('http://localhost:3000/api/boundaries/combined?level=1&includeVillages=true')
      .then(res => res.json())
      .then(data => {
        setBoundaries(data.boundaries);
        setVillages(data.villages);
      });
  }, []);

  return (
    <MapContainer center={[6.0, 12.0]} zoom={6}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {boundaries && (
        <GeoJSON 
          data={boundaries} 
          style={{ color: '#333', weight: 2, fillOpacity: 0.1 }}
        />
      )}
      {villages && (
        <GeoJSON 
          data={villages}
          pointToLayer={(feature, latlng) => 
            L.circleMarker(latlng, { radius: 5, color: 'red' })
          }
        />
      )}
    </MapContainer>
  );
}
```

## License

The GADM data is freely available for academic and non-commercial use. For commercial use, please refer to the [GADM license](https://gadm.org/license.html).

## Support

For issues or questions about the Boundaries API, please contact the development team or open an issue in the project repository.
