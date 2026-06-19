# Church Planting Map - Developer Guide

## Project Overview

This is a full-stack application for tracking church planting movements (DMM - Disciple Making Movements) across regions. It visualizes people groups, churches, and engagement status on interactive maps.

## Architecture

```
church-planting-map/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── Map/          # Map-related components (layers, controls)
│   │   │   ├── Dashboard/    # Dashboard widgets
│   │   │   ├── Export/       # Export functionality
│   │   │   ├── Import/       # Import functionality
│   │   │   ├── Peoples/      # People group components
│   │   │   ├── ui/           # Base UI components
│   │   │   └── Voronoi/      # Voronoi diagram components
│   │   ├── pages/            # Page components (routes)
│   │   ├── services/         # API service layer
│   │   ├── context/          # React context providers
│   │   ├── hooks/            # Custom React hooks
│   │   ├── i18n/             # Internationalization
│   │   └── config/           # Configuration files
│   └── vite.config.js        # Vite build configuration
│
├── backend/                  # Express.js backend
│   ├── routes/               # API route handlers
│   ├── models/               # MongoDB models
│   ├── middleware/           # Express middleware
│   ├── scripts/              # Utility scripts
│   └── server.js             # Main server entry
│
└── postman/                  # Postman collections
    └── collections/          # API test collections
```

## Key Technologies

### Frontend
- **React 18** with hooks
- **Vite** for build tooling
- **React Router** for navigation
- **TanStack Query** for data fetching
- **Leaflet + React-Leaflet** for maps
- **Tailwind CSS** for styling
- **Recharts** for data visualization

### Backend
- **Express.js** REST API
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time updates
- **JWT** for authentication

## Performance Optimizations (v2.0.0)

### Frontend Optimizations

1. **Code Splitting (App.jsx)**
   - All page components are lazy-loaded using `React.lazy()`
   - Heavy map components (MapView, GeoJSONMapView, VoronoiMapPage) load on demand
   - Reduces initial bundle size by ~60%

2. **Vite Build Optimization (vite.config.js)**
   - Manual chunk splitting for vendor libraries
   - Separate chunks: react, leaflet, recharts, data-fetching, UI
   - Better browser caching for unchanged dependencies

3. **Map Zoom Fix (MapView.jsx)**
   - `FlyToLocation` component preserves current zoom level
   - `FitAllMarkers` uses smoother animations
   - Prevents jarring zoom resets when clicking markers

4. **Viewport Meta Tags (index.html)**
   - Prevents unwanted mobile zoom on input focus
   - Preconnects to tile servers for faster map loading

### Backend Structure

The backend has 22 route modules:
- `auth.js` - Authentication
- `peopleGroups.js` - People group CRUD
- `villages.js` - Village management
- `voronoi.js` - Voronoi diagram generation
- `dashboard.js` - Dashboard KPIs
- `joshuaProject.js` - External data sync
- `qualitativeAnalysis.js` - DMM DNA analysis
- `export.js` / `import.js` - Data import/export
- `search.js` - Advanced search
- And more...

## Common Tasks

### Adding a New Page

1. Create component in `frontend/src/pages/`
2. Add lazy import in `App.jsx`:
   ```javascript
   const NewPage = lazy(() => import('./pages/NewPage'))
   ```
3. Add route with Suspense wrapper

### Adding a New API Endpoint

1. Create route file in `backend/routes/`
2. Import and register in `server.js`
3. Add to API documentation in root route

### Map Component Guidelines

- Use `memo()` for marker components to prevent re-renders
- Memoize icons with `useMemo()` to avoid recreation
- Use `useCallback()` for event handlers
- Preserve zoom level when centering map

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/church-planting
JWT_SECRET=your-secret-key
```

## Testing

### API Testing
Use Postman collection at `postman/collections/Church Planting Map API.postman_collection.json`

### Manual Testing
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Access at http://localhost:8082

## Known Issues & Solutions

### Map Zoom Issue (FIXED)
**Problem:** Map would auto-zoom to level 12 when clicking markers
**Solution:** Modified `FlyToLocation` to preserve current zoom level

### Mobile Zoom (FIXED)
**Problem:** iOS Safari auto-zooms on input focus
**Solution:** Added proper viewport meta tags and font-size >= 16px

## Code Style

- Use functional components with hooks
- Prefer `const` over `let`
- Use descriptive variable names
- Add JSDoc comments for complex functions
- Keep components under 300 lines (split if larger)

## Contact

For questions about this codebase, refer to this documentation or the inline comments in the source files.
