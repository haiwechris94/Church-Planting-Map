# Voronoi Diagram Feature

## Overview
The Voronoi diagram feature displays polygons around each village, showing the area of influence for each village. Each polygon represents the region that is closer to that village than to any other village.

## Files Created

### Backend
- **`routes/voronoi.js`** - API routes for generating Voronoi diagrams
  - `GET /api/voronoi` - Generate Voronoi from all villages in database
  - `POST /api/voronoi/custom` - Generate Voronoi from custom points

### Frontend
- **`frontend/src/components/Map/VoronoiLayer.jsx`** - React component to display Voronoi polygons on the map
- **`frontend/src/services/voronoiService.js`** - Service to fetch Voronoi data from API

### Scripts
- **`scripts/generateVoronoi.js`** - Script to generate static voronoi.geojson file

### Data
- **`frontend/public/data/voronoi.geojson`** - Pre-generated Voronoi diagram (static file)

## Usage

### Display Voronoi on Map

The Voronoi layer has been integrated into `GeoJSONMapView.jsx`:

```jsx
<VoronoiLayer
  url="/data/voronoi.geojson"
  visible={showVoronoi}
  style={{
    fillColor: '#3b82f6',
    fillOpacity: 0.1,
    color: '#2563eb',
    weight: 2,
  }}
/>
```

### Toggle Voronoi Display

A button has been added to the map controls to toggle the Voronoi layer:
- Blue button in the top-right corner
- Click to show/hide Voronoi polygons

### Generate Static Voronoi File

To regenerate the voronoi.geojson file from current villages:

```bash
node scripts/generateVoronoi.js
```

This will:
1. Connect to MongoDB
2. Fetch all villages with location data
3. Calculate Voronoi diagram using d3-delaunay
4. Save to `frontend/public/data/voronoi.geojson`

### Use API Endpoint

To load Voronoi dynamically from the API:

```jsx
<VoronoiLayer
  useAPI={true}
  visible={showVoronoi}
/>
```

Or make a direct API call:

```javascript
// Get Voronoi from all villages
const response = await fetch('http://localhost:3000/api/voronoi');
const data = await response.json();

// Generate custom Voronoi
const response = await fetch('http://localhost:3000/api/voronoi/custom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    points: [[13.5, 9.0], [13.6, 9.1], [13.7, 9.2]],
    bounds: [13.0, 8.5, 14.0, 9.5] // optional
  })
});
```

## Features

### Interactive Polygons
- **Hover Effect**: Polygons highlight when you hover over them
- **Popups**: Click on a polygon to see:
  - Village name
  - Area in km²
  - Center coordinates

### Styling
The Voronoi layer uses semi-transparent blue polygons by default:
- Fill: Light blue (#3b82f6) with 10% opacity
- Border: Darker blue (#2563eb) with 2px width
- Hover: Increases opacity to 30%

### Performance
- Uses d3-delaunay for fast Voronoi calculation
- Static file option for better performance
- API option for real-time updates

## Dependencies

### Backend
- `d3-delaunay` - Voronoi diagram calculation

### Frontend
- `leaflet` - Map rendering
- `react-leaflet` - React bindings for Leaflet

## Configuration

### Update Voronoi Style

Edit the style prop in `GeoJSONMapView.jsx`:

```jsx
<VoronoiLayer
  url="/data/voronoi.geojson"
  visible={showVoronoi}
  style={{
    fillColor: '#ff0000',    // Change color
    fillOpacity: 0.2,        // Change opacity
    color: '#990000',        // Change border color
    weight: 3,               // Change border width
  }}
/>
```

### Change Data Source

Switch between static file and API:

```jsx
// Use static file (faster, no server needed)
<VoronoiLayer url="/data/voronoi.geojson" visible={showVoronoi} />

// Use API (real-time, always up-to-date)
<VoronoiLayer useAPI={true} visible={showVoronoi} />
```

## Troubleshooting

### Voronoi not showing
1. Check if voronoi.geojson exists: `frontend/public/data/voronoi.geojson`
2. Run generation script: `node scripts/generateVoronoi.js`
3. Check browser console for errors
4. Verify villages have location data in database

### API endpoint not working
1. Ensure server is running: `npm start`
2. Check MongoDB connection
3. Verify d3-delaunay is installed: `npm install d3-delaunay`
4. Check server logs for errors

### Polygons look wrong
1. Verify village coordinates are correct (longitude, latitude)
2. Check bounds calculation in the script
3. Ensure at least 3 villages exist for Voronoi calculation

## Future Enhancements

Potential improvements:
- Color polygons by village status or people group
- Add area statistics to sidebar
- Filter Voronoi by region or organization
- Export Voronoi as separate GeoJSON/KML
- Calculate population density per polygon
- Show nearest neighbors for each village
