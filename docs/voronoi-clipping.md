# Voronoi Polygon Clipping for Cameroon

This document describes the solution for clipping Voronoi polygons to Cameroon's administrative boundaries.

## Overview

The Voronoi diagram generated from village points extends beyond Cameroon's borders. This solution clips those polygons to only show the portions within Cameroon, providing a cleaner visualization and more accurate area calculations.

## Files

### Scripts

| File | Description |
|------|-------------|
| `scripts/clipVoronoiToCameroon.js` | Main clipping script using Turf.js |
| `scripts/generateVoronoi.js` | Original Voronoi generation script |

### Data Files

| File | Description |
|------|-------------|
| `frontend/public/data/villages_voronoi.geojson` | Original Voronoi polygons (unclipped) |
| `frontend/public/data/villages_voronoi_clipped.geojson` | Clipped Voronoi polygons |
| `frontend/public/data/gadm41_CMR_1.json` | Cameroon administrative boundaries (Level 1 - Regions) |

### Components

| File | Description |
|------|-------------|
| `frontend/src/components/Map/VoronoiLayer.jsx` | React component for displaying Voronoi polygons |

## Usage

### Running the Clipping Script

```bash
# From project root
npm run voronoi:clip

# Or directly
node scripts/clipVoronoiToCameroon.js
```

**Note:** The script processes ~10,700 polygons and may take 15-30 minutes to complete.

### Using the VoronoiLayer Component

```jsx
import VoronoiLayer from './components/Map/VoronoiLayer'

// Default: Uses clipped version with fallback to original
<VoronoiLayer visible={true} />

// Explicitly use clipped version
<VoronoiLayer useClipped={true} visible={true} />

// Use original (unclipped) version
<VoronoiLayer useClipped={false} visible={true} />

// Custom URL
<VoronoiLayer url="/data/custom_voronoi.geojson" visible={true} />

// Custom styling
<VoronoiLayer 
  visible={true}
  style={{
    fillColor: '#22c55e',
    fillOpacity: 0.2,
    color: '#16a34a',
    weight: 1
  }}
/>
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | string | - | Custom URL for Voronoi GeoJSON |
| `useAPI` | boolean | `false` | Fetch from API instead of file |
| `useClipped` | boolean | `true` | Use clipped version (recommended) |
| `visible` | boolean | `true` | Show/hide the layer |
| `style` | object | `{}` | Custom Leaflet path styling |

## How It Works

### Clipping Algorithm

1. **Load Data**: Load Voronoi polygons and Cameroon regional boundaries
2. **Create Boundary**: Combine all 10 Cameroon regions into a MultiPolygon
3. **Bounding Box Filter**: Quick filter using bounding box intersection
4. **Clip Polygons**: Use `turf.intersect()` to clip each polygon against each region
5. **Merge Results**: Union clipped parts from different regions
6. **Calculate Area**: Recalculate area for clipped polygons
7. **Save Output**: Write clipped GeoJSON to file

### Performance Optimizations

- **Bounding Box Pre-filter**: Skip polygons that don't overlap with Cameroon
- **Region-by-Region Processing**: Clip against individual regions instead of merged boundary
- **Progress Logging**: Track processing progress for long-running operations

## Output Format

The clipped GeoJSON includes:

```json
{
  "type": "FeatureCollection",
  "name": "villages_voronoi_clipped",
  "metadata": {
    "description": "Voronoi polygons clipped to Cameroon national boundary",
    "source": "villages_voronoi.geojson",
    "boundary": "gadm41_CMR_1.json",
    "generatedAt": "2024-12-28T12:00:00.000Z",
    "originalCount": 10699,
    "clippedCount": 10500
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Village Name",
        "area": 123.45,
        "clipped": true
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

## Dependencies

The clipping script uses:

- **@turf/turf** (v7.3.1) - Geospatial analysis library
- **Node.js** - Runtime environment

These are already installed in the project.

## Troubleshooting

### Script Takes Too Long

The script processes ~10,700 polygons. Expected time: 15-30 minutes.

To run in background:
```bash
# Windows
start /B node scripts/clipVoronoiToCameroon.js > clip_output.log 2>&1

# Linux/Mac
nohup node scripts/clipVoronoiToCameroon.js > clip_output.log 2>&1 &
```

### Clipped File Not Found

If the clipped file doesn't exist, the VoronoiLayer component automatically falls back to the original file. Run the clipping script to generate it.

### Memory Issues

For very large datasets, consider:
1. Increasing Node.js memory: `node --max-old-space-size=4096 scripts/clipVoronoiToCameroon.js`
2. Processing in batches
3. Simplifying the boundary geometry

## Regenerating Clipped Data

If village data changes:

```bash
# 1. Regenerate Voronoi from database
npm run voronoi:generate

# 2. Clip to Cameroon boundaries
npm run voronoi:clip
```

## Technical Notes

### Coordinate Reference System

All files use WGS84 (EPSG:4326) / CRS84 coordinates.

### Area Calculation

Areas are calculated using `turf.area()` which accounts for Earth's curvature, providing accurate km² values.

### Boundary Source

Cameroon boundaries are from GADM (Global Administrative Areas) version 4.1, Level 1 (Regions).
