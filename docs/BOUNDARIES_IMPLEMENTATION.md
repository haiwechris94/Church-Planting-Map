# Implémentation des Frontières Administratives du Cameroun

## ✅ Ce qui a été fait

### 1. Création de l'API Boundaries (`routes/boundaries.js`)

Un nouveau fichier de routes a été créé avec les endpoints suivants :

#### Endpoints créés :
- **GET /api/boundaries** - Liste de tous les fichiers de frontières disponibles
- **GET /api/boundaries/level/:level** - Données GeoJSON complètes par niveau (1, 2, ou 3)
- **GET /api/boundaries/regions** - Liste simplifiée des régions (sans géométrie)
- **GET /api/boundaries/departments** - Liste simplifiée des départements (sans géométrie)
- **GET /api/boundaries/arrondissements** - Liste simplifiée des arrondissements (sans géométrie)
- **GET /api/boundaries/combined** - Données combinées (frontières + villages + voronoi)

### 2. Intégration dans le serveur (`server.js`)

- Ajout de l'import : `const boundariesRoutes = require('./routes/boundaries');`
- Montage de la route : `app.use('/api/boundaries', boundariesRoutes);`
- Ajout dans la documentation de l'API root : `boundaries: '/api/boundaries'`

### 3. Collection Postman mise à jour

Un nouveau dossier "Boundaries" a été ajouté à la collection Postman avec 8 requêtes :

1. **Get All Boundaries** - Liste des fichiers disponibles
2. **Get Regions (Level 1)** - Toutes les régions avec géométrie
3. **Get Departments (Level 2)** - Tous les départements avec géométrie
4. **Get Arrondissements (Level 3)** - Tous les arrondissements avec géométrie
5. **Get Regions List** - Liste simplifiée des régions
6. **Get Departments List** - Liste simplifiée des départements
7. **Get Arrondissements List** - Liste simplifiée des arrondissements
8. **Get Combined Data** - Données combinées avec villages et voronoi

### 4. Documentation créée (`docs/BOUNDARIES_API.md`)

Un guide complet a été créé incluant :
- Vue d'ensemble de l'API
- Description de tous les endpoints
- Exemples de réponses
- Cas d'utilisation
- Format GeoJSON
- Exemples d'intégration (React/Leaflet)
- Considérations de performance

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers :
1. `routes/boundaries.js` - Routes de l'API boundaries
2. `docs/BOUNDARIES_API.md` - Documentation complète

### Fichiers modifiés :
1. `server.js` - Ajout des routes boundaries
2. `postman/collections/Church Planting Map API.postman_collection.json` - Ajout du dossier Boundaries

## 🗺️ Données disponibles

Les fichiers GADM sont déjà présents dans `frontend/public/data/` :

- **gadm41_CMR_1.json** (188 KB) - 10 régions du Cameroun
- **gadm41_CMR_2.json** (412 KB) - 58 départements
- **gadm41_CMR_3.json** (685 KB) - 360+ arrondissements

## 🚀 Prochaines étapes pour tester

### 1. Démarrer le serveur

```bash
cd C:\Users\AFC\church-planting-map
npm start
```

Ou si vous utilisez nodemon :
```bash
npm run dev
```

### 2. Tester avec Postman

1. Ouvrir Postman
2. Aller dans la collection "Church Planting Map API"
3. Ouvrir le dossier "Boundaries"
4. Tester chaque requête :
   - Commencer par "Get All Boundaries" pour voir la liste
   - Tester "Get Regions (Level 1)" pour voir les données GeoJSON
   - Tester "Get Regions List" pour voir la version simplifiée
   - Tester "Get Combined Data" avec différents paramètres

### 3. Tester avec curl (une fois le serveur démarré)

```bash
# Liste des frontières disponibles
curl http://localhost:3000/api/boundaries

# Obtenir toutes les régions
curl http://localhost:3000/api/boundaries/level/1

# Liste simplifiée des régions
curl http://localhost:3000/api/boundaries/regions

# Données combinées avec villages
curl "http://localhost:3000/api/boundaries/combined?level=1&includeVillages=true"
```

### 4. Tester dans le navigateur

Une fois le serveur démarré, ouvrir :
- http://localhost:3000/api/boundaries
- http://localhost:3000/api/boundaries/regions
- http://localhost:3000/api/boundaries/level/1

## 💡 Cas d'utilisation

### 1. Afficher les frontières sur une carte

```javascript
// Récupérer et afficher les régions
fetch('http://localhost:3000/api/boundaries/level/1')
  .then(res => res.json())
  .then(data => {
    // data.data contient le GeoJSON
    L.geoJSON(data.data).addTo(map);
  });
```

### 2. Combiner frontières et villages

```javascript
// Récupérer frontières + villages en une seule requête
fetch('http://localhost:3000/api/boundaries/combined?level=1&includeVillages=true')
  .then(res => res.json())
  .then(data => {
    // Afficher les frontières
    L.geoJSON(data.boundaries, {
      style: { color: '#333', weight: 2, fillOpacity: 0.1 }
    }).addTo(map);
    
    // Afficher les villages
    L.geoJSON(data.villages, {
      pointToLayer: (feature, latlng) => 
        L.circleMarker(latlng, { radius: 5, color: 'red' })
    }).addTo(map);
  });
```

### 3. Filtrer les villages par région

```javascript
// Obtenir la liste des régions
const regions = await fetch('/api/boundaries/regions').then(r => r.json());

// Pour chaque région, compter les villages
regions.regions.forEach(region => {
  console.log(`${region.name}: ${region.id}`);
});
```

### 4. Analyser la couverture par département

```javascript
// Obtenir départements + villages + voronoi
fetch('/api/boundaries/combined?level=2&includeVillages=true&includeVoronoi=true')
  .then(res => res.json())
  .then(data => {
    // Analyser la couverture par département
    // Identifier les zones sans églises
    // Calculer les statistiques
  });
```

## 📊 Structure des données

### Niveaux administratifs du Cameroun :

**Niveau 1 - Régions (10):**
1. Adamaoua
2. Centre
3. Est
4. Extrême-Nord
5. Littoral
6. Nord
7. Nord-Ouest
8. Ouest
9. Sud
10. Sud-Ouest

**Niveau 2 - Départements (58)**
Chaque région est divisée en départements

**Niveau 3 - Arrondissements (360+)**
Chaque département est divisé en arrondissements

## 🔧 Dépannage

### Le serveur ne démarre pas
```bash
# Vérifier les dépendances
npm install

# Vérifier le fichier .env
# Assurez-vous que MONGODB_URI est défini
```

### Erreur "File not found"
- Vérifier que les fichiers GADM sont dans `frontend/public/data/`
- Vérifier les noms de fichiers : `gadm41_CMR_1.json`, `gadm41_CMR_2.json`, `gadm41_CMR_3.json`

### Erreur CORS
- Le serveur est configuré pour accepter les requêtes depuis `http://localhost:5173`
- Modifier `FRONTEND_URL` dans `.env` si nécessaire

## 📝 Notes importantes

1. **Taille des fichiers** : Les fichiers de niveau 3 (arrondissements) sont assez volumineux (685 KB). Utilisez les endpoints simplifiés quand vous n'avez pas besoin de la géométrie.

2. **Cache** : Considérez la mise en cache côté client car ces données ne changent pas fréquemment.

3. **Performance** : L'endpoint `/combined` peut être lent si vous incluez villages + voronoi + niveau 3. Utilisez-le judicieusement.

4. **Format GeoJSON** : Toutes les coordonnées sont au format [longitude, latitude] (standard GeoJSON).

## ✨ Fonctionnalités futures possibles

1. **Filtrage géographique** : Filtrer les villages par région/département/arrondissement
2. **Statistiques** : Calculer automatiquement le nombre de villages par division administrative
3. **Recherche** : Rechercher une région/département/arrondissement par nom
4. **Export** : Exporter les données combinées en différents formats (KML, Shapefile)
5. **Cache serveur** : Mettre en cache les fichiers GADM en mémoire pour de meilleures performances

## 📞 Support

Pour toute question ou problème :
1. Consulter la documentation : `docs/BOUNDARIES_API.md`
2. Tester avec Postman : Collection "Church Planting Map API" > Dossier "Boundaries"
3. Vérifier les logs du serveur pour les erreurs

---

**Date de création** : 28 décembre 2025
**Version de l'API** : 2.1.0
**Source des données** : GADM v4.1
