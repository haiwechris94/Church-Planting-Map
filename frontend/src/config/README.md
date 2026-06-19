# Configuration de la Carte - Church Planting Map

Ce dossier contient toutes les configurations nécessaires pour l'application de cartographie d'implantation d'églises au Cameroun.

## 📁 Structure des Fichiers

### `mapLayers.config.ts`
Configuration des couches de données GeoJSON disponibles dans l'application.

**Contenu :**
- **Couches administratives** : Régions, Divisions, Subdivisions du Cameroun
- **Couches de villages** : Points et polygones des villages
- **Couches Voronoi** : Diagrammes de Voronoi pour l'analyse territoriale
- **Groupes de couches** : Organisation logique des couches
- **Configuration par défaut** : Centre de carte, zoom, couches visibles

**Utilisation :**
```typescript
import { allLayers, getLayerById, layerGroups } from '@/config/mapLayers.config';

// Obtenir toutes les couches
const layers = allLayers;

// Obtenir une couche spécifique
const villageLayer = getLayerById('villages-points');

// Obtenir les couches d'un groupe
const adminLayers = getLayersByGroup('administrative');
```

### `mapStyles.config.ts`
Configuration des styles visuels pour les différentes couches et éléments de la carte.

**Contenu :**
- **Palettes de couleurs** : Pour les niveaux administratifs, villages, Voronoi
- **Styles de base** : Pour points, polygones, multipolygones
- **Styles d'interaction** : Hover, sélection, désactivation
- **Configuration des popups et tooltips**
- **Styles de clusters**
- **Icônes personnalisées**
- **Fonctions utilitaires** : Couleurs par densité, opacité par zoom, etc.

**Utilisation :**
```typescript
import { mapStyles, getDensityColor, getOpacityByZoom } from '@/config/mapStyles.config';

// Obtenir les couleurs administratives
const regionColor = mapStyles.adminColors.level1.fill;

// Obtenir une couleur basée sur la densité
const color = getDensityColor(75);

// Obtenir l'opacité basée sur le zoom
const opacity = getOpacityByZoom(10);
```

### `mapFilters.config.ts`
Configuration des filtres et requêtes pour interroger les données géographiques.

**Contenu :**
- **Filtres administratifs** : Par région, division, subdivision
- **Filtres de villages** : Par nom, présence d'église
- **Filtres par aire** : Par superficie des zones Voronoi
- **Requêtes prédéfinies** : Villages sans église, grandes zones non couvertes, etc.
- **Configuration de recherche**
- **Configuration d'export**
- **Fonctions utilitaires** : Application de filtres, statistiques

**Utilisation :**
```typescript
import { 
  applyFilter, 
  applyFilterGroup, 
  getUniqueValues,
  predefinedQueries 
} from '@/config/mapFilters.config';

// Appliquer un filtre
const filtered = applyFilter(data, filter);

// Obtenir les valeurs uniques d'un champ
const regions = getUniqueValues(data, 'NAME_1');

// Utiliser une requête prédéfinie
const query = predefinedQueries.villagesWithoutChurch;
```

### `api.config.ts`
Configuration centralisée pour l'API backend.

**Contenu :**
- URL de base de l'API
- Configuration des timeouts
- Configuration des retries
- Endpoints de l'API
- Configuration de gestion des erreurs
- Feature flags

**Utilisation :**
```typescript
import { apiConfig, endpoints, timeoutConfig, featureFlags } from '@/config/api.config';

// Obtenir l'URL de base
const baseUrl = apiConfig.baseUrl;

// Obtenir un endpoint
const villagesUrl = endpoints.villages.base;
const villageById = endpoints.villages.byId('123');

// Vérifier les feature flags
if (featureFlags.voronoi) {
  // Activer la fonctionnalité Voronoi
}

// Configuration des timeouts
const timeout = timeoutConfig.default; // 30000ms
const longTimeout = timeoutConfig.voronoiGeneration; // 120000ms
```

### `index.ts`
Point d'entrée centralisé pour toutes les configurations.

**Contenu :**
- Configuration complète de l'application
- Configuration des données GeoJSON
- Configuration de l'API
- Configuration des fonctionnalités
- Configuration de l'interface utilisateur
- Configuration des performances
- Configuration du cache
- Configuration des notifications

**Utilisation :**
```typescript
import config from '@/config';

// Accéder à la configuration de la carte
const mapConfig = config.app.map;

// Accéder aux chemins des données
const dataPath = config.data.paths.villagesPoints;

// Accéder à la configuration de l'API
const apiUrl = config.api.baseUrl;
```

## 🗺️ Fichiers de Données GeoJSON

Les fichiers de données sont situés dans `frontend/public/data/` :

### 1. `Admin123CMR fusionnées.geojson`
- **Type** : MultiPolygon
- **Contenu** : Limites administratives du Cameroun (niveaux 1, 2, 3)
- **Propriétés clés** :
  - `NAME_1`, `NAME_2`, `NAME_3` : Noms des régions/divisions/subdivisions
  - `GID_1`, `GID_2`, `GID_3` : Identifiants géographiques
  - `TYPE_1`, `TYPE_2`, `TYPE_3` : Types administratifs
  - `COUNTRY` : "Cameroon"

### 2. `villages.geojson`
- **Type** : Point
- **Contenu** : Emplacements des villages
- **Propriétés clés** :
  - `name` : Nom du village
  - `osm_id` : Identifiant OpenStreetMap
  - `place` : "village"
  - `other_tags` : Métadonnées supplémentaires

### 3. `Villages découpés.geojson`
- **Type** : Polygon
- **Contenu** : Limites territoriales des villages
- **Propriétés clés** :
  - `name` : Nom du village
  - `osm_id` : Identifiant OpenStreetMap
  - `fid` : Identifiant de feature
  - `place` : "village"

### 4. `villages_voronoi.geojson`
- **Type** : Polygon
- **Contenu** : Diagrammes de Voronoi générés à partir des villages OSM
- **Propriétés clés** :
  - `name` : Nom du village
  - `osm_id` : Identifiant OpenStreetMap
  - `xy_coordinate_resolution` : Résolution des coordonnées

### 5. `voronoi.geojson`
- **Type** : Polygon
- **Contenu** : Diagrammes de Voronoi personnalisés avec calculs
- **Propriétés clés** :
  - `village_id` : Identifiant personnalisé
  - `village_name` : Nom du village
  - `center` : Coordonnées du centre [lng, lat]
  - `area` : Superficie en km²

## 🎨 Personnalisation

### Modifier les Couleurs

Éditez `mapStyles.config.ts` :

```typescript
export const adminColors = {
  level1: {
    fill: '#VOTRE_COULEUR',
    stroke: '#VOTRE_COULEUR',
    hover: '#VOTRE_COULEUR',
  },
};
```

### Ajouter une Nouvelle Couche

Éditez `mapLayers.config.ts` :

```typescript
export const customLayers: LayerConfig[] = [
  {
    id: 'ma-nouvelle-couche',
    name: 'Ma Nouvelle Couche',
    description: 'Description de la couche',
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
  },
];
```

### Ajouter un Nouveau Filtre

Éditez `mapFilters.config.ts` :

```typescript
export const customFilters: FilterGroup = {
  id: 'custom',
  name: 'Filtres Personnalisés',
  description: 'Mes filtres personnalisés',
  operator: 'AND',
  filters: [
    {
      id: 'mon-filtre',
      name: 'Mon Filtre',
      type: 'custom',
      field: 'monChamp',
      operator: 'equals',
      value: 'maValeur',
      active: false,
    },
  ],
};
```

## 🔧 Configuration de l'Environnement

Créez un fichier `.env` à la racine du projet frontend :

```env
# URL de l'API backend
REACT_APP_API_URL=http://localhost:3000

# Autres configurations
REACT_APP_MAP_CENTER_LAT=6.0
REACT_APP_MAP_CENTER_LNG=12.3547
REACT_APP_MAP_ZOOM=7
```

## 📊 Niveaux Administratifs du Cameroun

### Niveau 1 : Régions
- Adamaoua
- Centre
- Est
- Extrême-Nord
- Littoral
- Nord
- Nord-Ouest
- Ouest
- Sud
- Sud-Ouest

### Niveau 2 : Divisions
Chaque région est divisée en plusieurs divisions.

### Niveau 3 : Subdivisions
Chaque division est divisée en plusieurs subdivisions (arrondissements).

## 🚀 Utilisation dans les Composants

### Exemple : Afficher une Carte avec Couches

```typescript
import React from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { allLayers, defaultMapConfig } from '@/config';

function MyMap() {
  return (
    <MapContainer
      center={defaultMapConfig.center}
      zoom={defaultMapConfig.zoom}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {allLayers.map((layer) => (
        layer.visible && (
          <GeoJSON
            key={layer.id}
            data={layer.dataPath}
            style={layer.style}
          />
        )
      ))}
    </MapContainer>
  );
}
```

### Exemple : Appliquer des Filtres

```typescript
import { applyFilterGroup, villageFilters } from '@/config';

function filterVillages(villages: any[]) {
  // Activer le filtre "sans église"
  villageFilters.filters[2].active = true;
  
  // Appliquer les filtres
  const filtered = applyFilterGroup(villages, villageFilters);
  
  return filtered;
}
```

## 📝 Notes Importantes

1. **Système de Coordonnées** : Toutes les données utilisent WGS84 (EPSG:4326)
2. **Format des Fichiers** : GeoJSON avec encodage UTF-8
3. **Performance** : Les fichiers volumineux peuvent nécessiter une simplification
4. **Cache** : Les données GeoJSON sont mises en cache pour améliorer les performances

## 🔗 Ressources

- [Documentation Leaflet](https://leafletjs.com/)
- [Spécification GeoJSON](https://geojson.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [GADM (Global Administrative Areas)](https://gadm.org/)

## 📧 Support

Pour toute question ou problème, veuillez contacter l'équipe de développement.
