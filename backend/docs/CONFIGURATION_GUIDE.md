# Church Planting Map - Configuration Complete

## 📋 Vue d'ensemble

Ce projet fournit une configuration complète pour une application de cartographie d'implantation d'églises au Cameroun. Il utilise les données GeoJSON pour afficher les limites administratives, les villages, et les zones d'influence (diagrammes de Voronoi).

## 🗂️ Structure des Fichiers Créés

```
frontend/
├── public/
│   └── data/
│       ├── Admin123CMR fusionnées.geojson      # Limites administratives
│       ├── villages.geojson                     # Villages (points)
│       ├── Villages découpés.geojson            # Villages (polygones)
│       ├── villages_voronoi.geojson             # Voronoi OSM
│       └── voronoi.geojson                      # Voronoi personnalisé
│
├── src/
│   ├── config/
│   │   ├── index.ts                             # Export centralisé
│   │   ├── mapLayers.config.ts                  # Configuration des couches
│   │   ├── mapStyles.config.ts                  # Configuration des styles
│   │   ├── mapFilters.config.ts                 # Configuration des filtres
│   │   └── README.md                            # Documentation
│   │
│   ├── types/
│   │   └── index.ts                             # Types TypeScript
│   │
│   ├── utils/
│   │   └── geoJsonUtils.ts                      # Utilitaires GeoJSON
│   │
│   └── components/
│       └── ChurchPlantingMap.tsx                # Composant de carte
```

## 🚀 Démarrage Rapide

### 1. Installation des dépendances

```bash
cd frontend
npm install leaflet react-leaflet @types/leaflet
```

### 2. Utilisation du composant

```tsx
import React from 'react';
import { ChurchPlantingMap } from '@/components/ChurchPlantingMap';

function App() {
  return (
    <div className="App">
      <ChurchPlantingMap />
    </div>
  );
}

export default App;
```

### 3. Configuration de l'environnement

Créez un fichier `.env` :

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_MAP_CENTER_LAT=6.0
REACT_APP_MAP_CENTER_LNG=12.3547
REACT_APP_MAP_ZOOM=7
```

## 📊 Données Disponibles

### 1. Limites Administratives (`Admin123CMR fusionnées.geojson`)
- **Type** : MultiPolygon
- **Niveaux** : Régions (1), Divisions (2), Subdivisions (3)
- **Propriétés** :
  - `NAME_1`, `NAME_2`, `NAME_3` : Noms
  - `GID_1`, `GID_2`, `GID_3` : Identifiants
  - `TYPE_1`, `TYPE_2`, `TYPE_3` : Types administratifs

### 2. Villages - Points (`villages.geojson`)
- **Type** : Point
- **Propriétés** :
  - `name` : Nom du village
  - `osm_id` : Identifiant OpenStreetMap
  - `place` : "village"

### 3. Villages - Polygones (`Villages découpés.geojson`)
- **Type** : Polygon
- **Propriétés** :
  - `name` : Nom du village
  - `osm_id` : Identifiant OpenStreetMap
  - `fid` : Identifiant de feature

### 4. Voronoi OSM (`villages_voronoi.geojson`)
- **Type** : Polygon
- **Propriétés** :
  - `name` : Nom du village
  - `osm_id` : Identifiant OpenStreetMap

### 5. Voronoi Personnalisé (`voronoi.geojson`)
- **Type** : Polygon
- **Propriétés** :
  - `village_id` : Identifiant personnalisé
  - `village_name` : Nom du village
  - `center` : Coordonnées du centre
  - `area` : Superficie en km²

## 🎨 Configuration des Couches

### Couches Disponibles

1. **Limites Administratives** (`admin-boundaries`)
   - Couleur : Bleu (#3388ff)
   - Opacité : 0.1
   - Visible par défaut : Oui

2. **Villages - Points** (`villages-points`)
   - Couleur : Rouge (#ff6b6b)
   - Rayon : 6px
   - Visible par défaut : Oui

3. **Villages - Polygones** (`villages-polygons`)
   - Couleur : Vert (#51cf66)
   - Opacité : 0.3
   - Visible par défaut : Non

4. **Voronoi OSM** (`voronoi-osm`)
   - Couleur : Violet (#845ef7)
   - Opacité : 0.2
   - Visible par défaut : Non

5. **Voronoi Personnalisé** (`voronoi-custom`)
   - Couleur : Jaune (#ffd43b)
   - Opacité : 0.25
   - Visible par défaut : Non

### Personnalisation

Pour modifier les couches, éditez `frontend/src/config/mapLayers.config.ts` :

```typescript
{
  id: 'ma-couche',
  name: 'Ma Couche',
  dataPath: '/data/mon-fichier.geojson',
  type: 'polygon',
  visible: true,
  zIndex: 10,
  style: {
    fillColor: '#ff0000',
    fillOpacity: 0.5,
    strokeColor: '#000000',
    strokeWidth: 2,
  },
  properties: {
    nameField: 'name',
    idField: 'id',
  },
}
```

## 🔍 Filtres et Recherche

### Filtres Prédéfinis

1. **Filtres Administratifs**
   - Par région
   - Par division
   - Par subdivision

2. **Filtres de Villages**
   - Par nom
   - Avec église
   - Sans église

3. **Filtres par Aire**
   - Petite aire (< 1000 km²)
   - Aire moyenne (1000-5000 km²)
   - Grande aire (> 5000 km²)

### Utilisation

```typescript
import { applyFilter, villageFilters } from '@/config/mapFilters.config';

// Activer un filtre
villageFilters.filters[0].active = true;
villageFilters.filters[0].value = 'Yaoundé';

// Appliquer le filtre
const filtered = applyFilter(data, villageFilters.filters[0]);
```

## 🛠️ Utilitaires

### Charger des Données

```typescript
import { loadGeoJSON, loadAllData } from '@/utils/geoJsonUtils';

// Charger un fichier
const data = await loadGeoJSON('/data/villages.geojson');

// Charger toutes les données
const allData = await loadAllData();
```

### Calculer des Distances

```typescript
import { calculateDistance } from '@/utils/geoJsonUtils';

const distance = calculateDistance(
  [13.665, 9.050],  // Point 1
  [13.655, 9.058]   // Point 2
);
console.log(`Distance: ${distance.toFixed(2)} km`);
```

### Trouver les Plus Proches

```typescript
import { findNearestFeatures } from '@/utils/geoJsonUtils';

const nearest = findNearestFeatures(
  collection,
  [13.665, 9.050],  // Point de référence
  5                  // Nombre de résultats
);
```

### Exporter des Données

```typescript
import { exportToFile } from '@/utils/geoJsonUtils';

// Exporter en GeoJSON
exportToFile(collection, 'villages', 'geojson');

// Exporter en CSV
exportToFile(collection, 'villages', 'csv');
```

## 📈 Statistiques

### Calculer des Statistiques

```typescript
import { getFieldStatistics } from '@/config/mapFilters.config';

const stats = getFieldStatistics(data, 'area');
console.log(stats);
// { min: 100, max: 10000, avg: 2500, sum: 50000, count: 20 }
```

### Obtenir des Valeurs Uniques

```typescript
import { getUniqueValues } from '@/config/mapFilters.config';

const regions = getUniqueValues(data, 'NAME_1');
console.log(regions);
// ['Adamaoua', 'Centre', 'Est', ...]
```

## 🎯 Cas d'Usage

### 1. Afficher les Villages sans Église

```typescript
import { predefinedQueries } from '@/config/mapFilters.config';

const query = predefinedQueries.villagesWithoutChurch;
// Appliquer la requête aux données
```

### 2. Analyser les Grandes Zones Non Couvertes

```typescript
const query = predefinedQueries.largeUncoveredAreas;
// Zones > 5000 km² sans église
```

### 3. Résumé par Région

```typescript
const query = predefinedQueries.regionSummary;
// Statistiques groupées par région
```

## 🔧 Configuration Avancée

### Performance

Éditez `frontend/src/config/index.ts` :

```typescript
export const performanceConfig = {
  maxFeatures: 10000,
  simplifyTolerance: 0.001,
  clusterRadius: 50,
  clusterMaxZoom: 15,
};
```

### Cache

```typescript
export const cacheConfig = {
  enabled: true,
  maxAge: 3600000,  // 1 heure
  maxSize: 50 * 1024 * 1024,  // 50 MB
};
```

## 📱 Interface Utilisateur

### Thème

```typescript
export const uiConfig = {
  theme: 'light',  // 'light' | 'dark'
  language: 'fr',  // 'fr' | 'en'
  sidebarPosition: 'left',  // 'left' | 'right'
};
```

## 🐛 Débogage

### Vérifier le Cache

```typescript
import { getCacheSize, getCacheKeys } from '@/utils/geoJsonUtils';

console.log('Taille du cache:', getCacheSize());
console.log('Clés du cache:', getCacheKeys());
```

### Vider le Cache

```typescript
import { clearCache } from '@/utils/geoJsonUtils';

clearCache();
```

## 📚 Ressources

- [Documentation Leaflet](https://leafletjs.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [GeoJSON Specification](https://geojson.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)

## 🤝 Contribution

Pour contribuer au projet :

1. Fork le repository
2. Créez une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Committez vos changements (`git commit -am 'Ajout de ma fonctionnalité'`)
4. Push vers la branche (`git push origin feature/ma-fonctionnalite`)
5. Créez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 📧 Contact

Pour toute question, contactez l'équipe de développement.
