# Church Planting Map - Frontend

A React + Vite frontend application with Leaflet and OpenStreetMap integration for tracking church planting activities.

## Features

- 🗺️ **Interactive Maps**: Display villages and churches on OpenStreetMap using Leaflet
- 📍 **Village Management**: Track villages with status (unreached, in-progress, church-planted, multiplying)
- ⛪ **Church Management**: Manage churches with pastor info, member counts, and locations
- 📊 **Dashboard**: Overview statistics with charts and recent activities
- 🔐 **Authentication**: User login/registration with JWT tokens
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 18** - UI library
- **Vite 5** - Build tool and dev server
- **React Router 6** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Leaflet / React-Leaflet** - Interactive maps
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Recharts** - Charts and graphs
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on http://localhost:5000

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (if not exists):
   ```env
   VITE_API_URL=http://localhost:5000
   ```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will start at **http://localhost:8082**

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/
│   └── church-icon.svg          # App icon
├── src/
│   ├── components/
│   │   ├── Layout.jsx           # Main layout with sidebar
│   │   └── Map/                 # Map components
│   │       ├── ChurchMap.jsx    # Reusable map component
│   │       ├── MapMarker.jsx    # Custom marker component
│   │       ├── MapControls.jsx  # Map control buttons
│   │       └── MapLegend.jsx    # Map legend component
│   ├── context/
│   │   └── AuthContext.jsx      # Authentication context
│   ├── pages/
│   │   ├── Dashboard.jsx        # Dashboard with stats
│   │   ├── MapView.jsx          # Villages map view
│   │   ├── ChurchesMap.jsx      # Churches map view
│   │   ├── Villages.jsx         # Villages list
│   │   ├── VillageDetail.jsx    # Village details
│   │   ├── Churches.jsx         # Churches list
│   │   ├── ChurchDetail.jsx     # Church details
│   │   ├── Activities.jsx       # Activities list
│   │   ├── Profile.jsx          # User profile
│   │   ├── Login.jsx            # Login page
│   │   └── Register.jsx         # Registration page
│   ├── services/
│   │   └── api.js               # API client and endpoints
│   ├── App.jsx                  # Main app with routes
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles
├── index.html                   # HTML template
├── package.json                 # Dependencies
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
└── postcss.config.js            # PostCSS configuration
```


## Map Features

### Villages Map (`/map`)
- Display all villages with color-coded markers by status
- Add new villages by clicking on the map
- Filter villages by status and search
- Sidebar with village list
- Fly to village location on click
- Fit all markers in view

### Churches Map (`/churches-map`)
- Display all churches on the map
- Churches inherit location from associated villages if no direct coordinates
- Click markers to see church details
- Navigate to your current location
- Fit all churches in view

### Voronoi Map (`/voronoi-map`)
- **Voronoi Diagram**: Visualize church influence zones using Voronoi tessellation
- **Coverage Analysis**: Identify areas with coverage gaps
- **Statistics Panel**: View real-time statistics including:
  - Total cells and area coverage
  - Average, median, min, max cell areas
  - Coverage percentage
  - Gap severity distribution
- **Administrative Filters**: Filter by region, department, or commune
- **Export Options**: Export data as GeoJSON or CSV

### Status Colors
- 🔴 **Red**: Unreached
- 🟡 **Yellow**: In Progress / Engaged
- 🟢 **Green**: Church Planted / Established
- 🔵 **Blue**: Multiplying

## Component Usage Examples

### Using VoronoiMapContainer

```tsx
import { VoronoiMapContainer } from '@/components/Voronoi';

function MyPage() {
  const handleCellSelect = (cell) => {
    console.log('Selected cell:', cell);
  };

  return (
    <VoronoiMapContainer
      showControls={true}
      showStatistics={true}
      showGapsLayer={true}
      onCellSelect={handleCellSelect}
      className="h-screen"
    />
  );
}
```

### Using the API Client

```typescript
import { apiClient } from '@/services/api.client';
import { endpoints } from '@/config/api.config';

// Fetch villages
const response = await apiClient.get(endpoints.villages.base);

// Create a new village
await apiClient.post(endpoints.villages.base, {
  name: 'New Village',
  coordinates: [10.5, 5.2],
  status: 'unreached'
});
```

### Using Voronoi API Service

```typescript
import {
  fetchVoronoiData,
  fetchVoronoiStatistics,
  generateVoronoiDiagram
} from '@/services/voronoiApi';

// Fetch Voronoi data
const data = await fetchVoronoiData({ adminLevel1: 'Centre' });

// Get statistics
const stats = await fetchVoronoiStatistics();

// Generate new diagram
const diagram = await generateVoronoiDiagram({
  name: 'Churches 2024',
  sourceType: 'churches'
});
```

## API Integration

The frontend connects to the backend API at `VITE_API_URL`. Available endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Villages
- `GET /api/villages` - List all villages
- `GET /api/villages/:id` - Get village by ID
- `POST /api/villages` - Create village
- `PUT /api/villages/:id` - Update village
- `DELETE /api/villages/:id` - Delete village
- `GET /api/villages/voronoi` - Get Voronoi from villages
- `POST /api/villages/voronoi` - Generate Voronoi from custom points

### Churches
- `GET /api/churches` - List all churches
- `GET /api/churches/:id` - Get church by ID
- `POST /api/churches` - Create church
- `PUT /api/churches/:id` - Update church
- `DELETE /api/churches/:id` - Delete church

### Voronoi
- `GET /api/voronoi/diagrams` - List diagrams
- `GET /api/voronoi/data` - Get Voronoi GeoJSON
- `POST /api/voronoi/generate` - Generate new diagram
- `GET /api/voronoi/statistics` - Get statistics
- `GET /api/voronoi/gaps` - Get coverage gaps

### Statistics
- `GET /api/stats/dashboard` - Dashboard statistics

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 8082 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Map not displaying
1. Ensure Leaflet CSS is imported in `main.jsx` and `index.html`
2. Check that the map container has a defined height
3. Verify the Leaflet marker icons are loading correctly

### API connection issues
1. Verify the backend is running on port 5000
2. Check `VITE_API_URL` in `.env` file
3. Ensure CORS is configured on the backend
4. Check browser console for network errors
5. Verify the Vite proxy is working (development only)

### Voronoi not loading
1. Check that `VITE_ENABLE_VORONOI=true` in `.env`
2. Verify the backend Voronoi endpoints are working
3. Check browser console for API errors
4. Ensure there are villages/churches in the database

### Authentication issues
1. Clear localStorage and try logging in again
2. Check that the JWT token is being sent in request headers
3. Verify the token hasn't expired
4. Check the backend logs for authentication errors

### TypeScript errors
1. Run `npm install` to ensure all types are installed
2. Check that `@types/leaflet` is installed
3. Verify path aliases are configured in `vite.config.js`

## Development Tips

### Adding a new API endpoint

1. Add the endpoint to `src/config/api.config.ts`:
   ```typescript
   export const endpoints = {
     // ...existing endpoints
     newFeature: {
       base: '/api/new-feature',
       byId: (id: string) => `/api/new-feature/${id}`,
     },
   };
   ```

2. Create a service file in `src/services/`:
   ```typescript
   import { apiClient } from './api.client';
   import { endpoints } from '@/config/api.config';
   
   export const fetchNewFeature = async () => {
     const response = await apiClient.get(endpoints.newFeature.base);
     return response.data;
   };
   ```

### Adding a new page

1. Create the page component in `src/pages/`
2. Add the route in `src/App.jsx`
3. Add navigation link in `src/components/Layout.jsx`

## License

MIT