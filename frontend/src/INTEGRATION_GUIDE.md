# Integration Guide: Country Selector, Top Navbar, and Mini-Map

This guide explains how to integrate the three new features into the Church Planting Map application.

## Overview

Three major features have been implemented:

1. **Country Selector** - Global country selection with URL sync and localStorage persistence
2. **Top Navigation Bar** - Horizontal navbar replacing the vertical sidebar
3. **Mini-Map** - Overview map showing current viewport within country bounds

## Files Created

### Frontend

```
frontend/src/
├── context/
│   └── CountryContext.jsx          # Global country state management
├── components/
│   ├── CountrySelector.jsx         # Country dropdown component
│   ├── TopNavbar.jsx               # Horizontal navigation bar
│   ├── Layout.jsx                  # Updated layout (no sidebar)
│   └── Map/
│       ├── MiniMap.jsx             # Mini-map component
│       ├── MapLayout.jsx           # Map page layout wrapper
│       └── index.js                # Map components export
├── config/
│   └── countryConfig.js            # Country configuration data
├── hooks/
│   └── useCountryMap.js            # Country-aware map hooks
├── utils/
│   └── countryUtils.js             # Country utility functions
└── main.jsx                        # Updated with CountryProvider
```

### Backend

```
backend/
├── routes/
│   ├── countries.js                # GET /api/countries endpoints
│   └── adminPolygons.js            # GET /api/admin-polygons endpoints
├── middleware/
│   └── countryFilter.js            # Country filtering middleware
└── server.js                       # Updated with new routes
```

## Integration Steps

### 1. CountryProvider is Already Integrated

The `CountryProvider` has been added to `main.jsx`. It wraps the entire app and provides:

- `selectedCountry` - Current country code (e.g., 'CM')
- `setSelectedCountry(code)` - Function to change country
- `countryBounds` - Bounding box for map fitting
- `countryCenter` - Center coordinates
- `countryZoom` - Default zoom level

### 2. Using Country Context in Components

```jsx
import { useCountry } from '../context/CountryContext'

const MyComponent = () => {
  const { 
    selectedCountry, 
    setSelectedCountry, 
    countryBounds,
    countryCenter,
    countryZoom 
  } = useCountry()
  
  // Use country data...
}
```

### 3. Filtering API Calls by Country

Add `?country=XX` to your API calls:

```jsx
import { useCountry } from '../context/CountryContext'
import { useQuery } from '@tanstack/react-query'

const MyComponent = () => {
  const { selectedCountry } = useCountry()
  
  const { data } = useQuery({
    queryKey: ['villages', selectedCountry],
    queryFn: () => api.get(`/api/villages?country=${selectedCountry}`),
  })
}
```

### 4. Using the Mini-Map in Map Pages

Option A: Use MapLayout wrapper:

```jsx
import MapLayout from '../components/Map/MapLayout'

const MapPage = () => {
  return (
    <MapLayout showMiniMap={true}>
      {/* Your map layers here */}
      <Marker position={[7.3697, 12.3547]} />
    </MapLayout>
  )
}
```

Option B: Add MiniMap to existing MapContainer:

```jsx
import { useRef } from 'react'
import { MapContainer } from 'react-leaflet'
import MiniMap from '../components/Map/MiniMap'

const MapPage = () => {
  const mapRef = useRef(null)
  
  return (
    <div className="relative">
      <MapContainer ref={mapRef} ...>
        {/* Map content */}
      </MapContainer>
      <MiniMap mainMapRef={mapRef} />
    </div>
  )
}
```

### 5. Using Country-Aware Map Hook

```jsx
import { useCountryMap } from '../hooks/useCountryMap'

const MapPage = () => {
  const mapRef = useRef(null)
  
  const { 
    fitToCountry, 
    centerOnCountry,
    isWithinCountry 
  } = useCountryMap(mapRef, {
    autoFit: true,
    onCountryChange: (country) => {
      console.log('Country changed to:', country)
    }
  })
  
  return (
    <MapContainer ref={mapRef} ...>
      {/* Map content */}
    </MapContainer>
  )
}
```

### 6. Backend: Adding Country Filter to Routes

Use the country filter middleware:

```javascript
const { countryFilterMiddleware, getCountryFilter } = require('../middleware/countryFilter');

// Option 1: Use middleware
router.get('/', countryFilterMiddleware(), async (req, res) => {
  const query = { ...req.countryFilter };
  const results = await Model.find(query);
  res.json(results);
});

// Option 2: Manual filter
router.get('/', async (req, res) => {
  const { country } = req.query;
  const filter = getCountryFilter(country);
  const results = await Model.find(filter);
  res.json(results);
});
```

## URL Synchronization

The country is automatically synced to the URL:

- `http://localhost:8082/map?country=CM` - Cameroon
- `http://localhost:8082/map?country=TD` - Chad
- `http://localhost:8082/dashboard?country=CF` - Central African Republic

When a user shares a URL, the recipient will see the same country selected.

## localStorage Persistence

The selected country is saved to localStorage under the key `selectedCountry`. When the user returns, their last selection is restored.

## Supported Countries

| Code | Name (FR) | Name (EN) |
|------|-----------|-----------|
| CM | Cameroun | Cameroon |
| TD | Tchad | Chad |
| CF | République centrafricaine | Central African Republic |
| CG | Congo | Republic of the Congo |
| CD | RD Congo | Democratic Republic of the Congo |
| GA | Gabon | Gabon |
| GQ | Guinée équatoriale | Equatorial Guinea |
| ST | Sao Tomé-et-Príncipe | São Tomé and Príncipe |

## API Endpoints

### Countries

- `GET /api/countries` - List all countries
- `GET /api/countries/:code` - Get country details
- `GET /api/countries/:code/bounds` - Get country bounds

### Admin Polygons

- `GET /api/admin-polygons?country=CM` - Get polygons for country
- `GET /api/admin-polygons/country/:code/geojson` - Get GeoJSON

### Filtered Endpoints

All existing endpoints now support `?country=XX`:

- `GET /api/villages?country=CM`
- `GET /api/people-groups?country=CM`
- `GET /api/churches?country=CM`
- `GET /api/stats?country=CM`
- `GET /api/dashboard?country=CM`

## Styling

CSS classes have been added to `index.css`:

- `.animate-fade-in` - Fade in animation
- `.animate-scale-in` - Scale in animation
- `.animate-slide-down` - Slide down animation
- `.shadow-soft` - Soft shadow
- `.shadow-soft-lg` - Large soft shadow
- `.map-full-height` - Full height map container

## Testing

1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to http://localhost:8082
4. Test country selector in navbar
5. Verify URL updates when changing country
6. Verify data reloads when country changes
7. Test mini-map on map pages

## Troubleshooting

### Country not changing
- Check browser console for errors
- Verify CountryProvider is wrapping the app
- Check that useCountry hook is imported correctly

### Mini-map not showing
- Ensure mapRef is passed correctly
- Check that country has valid bounds
- Verify Leaflet CSS is imported

### API not filtering by country
- Check that country parameter is in URL
- Verify backend route uses countryFilter middleware
- Check MongoDB query includes country field
