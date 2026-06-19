# Intégration Joshua Project - Frontend React + Backend Express

Ce document explique comment afficher les peuples non atteints de Joshua Project sur votre carte Leaflet.

## 📋 Vue d'ensemble

Vous disposez maintenant de :

1. **Route Backend** : `GET /api/joshua-project/unreached/:countryCode`
2. **Composant React** : `JoshuaProjectLayer.jsx`
3. **Exemple d'utilisation** : `JoshuaProjectLayerExample.jsx`
4. **Requête Postman** : "Get Unreached Groups from Backend"

---

## 🔧 Backend - Route API

### Fichier modifié
`backend/routes/joshuaProject.js`

### Nouvelle route ajoutée
```javascript
GET /api/joshua-project/unreached/:countryCode
```

### Paramètres
- `countryCode` : Code pays ISO à 2 lettres (ex: `CM` pour Cameroun)

### Exemple de requête
```bash
curl http://localhost:5000/api/joshua-project/unreached/CM
```

### Réponse JSON
```json
{
  "success": true,
  "countryCode": "CM",
  "count": 42,
  "data": [
    {
      "name": "Fulani, Adamawa",
      "latitude": 7.3697,
      "longitude": 12.3547,
      "status": "unreached",
      "source": "Joshua Project",
      "population": 150000,
      "language": "Fulfulde, Adamawa"
    }
  ]
}
```

### Champs retournés
| Champ | Type | Description |
|-------|------|-------------|
| `name` | string | Nom du peuple |
| `latitude` | number | Latitude (coordonnée Y) |
| `longitude` | number | Longitude (coordonnée X) |
| `status` | string | Statut (toujours "unreached") |
| `source` | string | Source des données ("Joshua Project") |
| `population` | number | Population estimée |
| `language` | string | Langue principale |

---

## ⚛️ Frontend - Composant React

### Fichiers créés

#### 1. `frontend/src/components/Map/JoshuaProjectLayer.jsx`
Composant principal qui affiche les peuples non atteints sur la carte.

**Props :**
- `countryCode` (string) : Code pays (défaut: 'CM')
- `showLayer` (boolean) : Afficher/masquer la couche (défaut: true)
- `filterStatus` (string) : Filtre par statut (défaut: 'unreached')

**Caractéristiques :**
- ✅ Récupère automatiquement les données depuis le backend
- ✅ Affiche des points rouges (CircleMarker) de 4px de rayon
- ✅ Tooltip au survol avec nom, statut, population et langue
- ✅ Gestion des erreurs et états de chargement
- ✅ Optimisé pour ne pas masquer les autres couches

#### 2. `frontend/src/components/Map/JoshuaProjectLayerExample.jsx`
Exemple complet d'utilisation avec contrôles UI.

---

## 🚀 Utilisation

### Option 1 : Intégration simple dans une carte existante

```jsx
import JoshuaProjectLayer from './components/Map/JoshuaProjectLayer';
import { useState } from 'react';

function MyMap() {
  const [showJP, setShowJP] = useState(true);

  return (
    <MapContainer center={[7.3697, 12.3547]} zoom={6}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* Vos autres couches ici */}
      
      {/* Couche Joshua Project */}
      <JoshuaProjectLayer 
        countryCode="CM" 
        showLayer={showJP}
        filterStatus="unreached"
      />
    </MapContainer>
  );
}
```

### Option 2 : Avec contrôles UI

Voir le fichier `JoshuaProjectLayerExample.jsx` pour un exemple complet avec :
- Toggle pour afficher/masquer
- Sélecteur de pays
- Légende

---

## 🎨 Personnalisation

### Modifier l'apparence des points

Dans `JoshuaProjectLayer.jsx`, ligne ~90 :

```jsx
<CircleMarker
  radius={4}  // Taille du point (changez ici)
  pathOptions={{
    color: '#dc2626',      // Couleur du contour
    fillColor: '#ef4444',  // Couleur de remplissage
    fillOpacity: 0.8,      // Opacité (0-1)
    weight: 1,             // Épaisseur du contour
  }}
/>
```

### Exemples de personnalisation

**Points plus petits et discrets :**
```jsx
radius={3}
fillOpacity={0.5}
```

**Points plus visibles :**
```jsx
radius={6}
fillOpacity={1}
weight={2}
```

### Modifier le contenu du tooltip

Dans `JoshuaProjectLayer.jsx`, ligne ~100 :

```jsx
<Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
  <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
    <strong>{group.name}</strong>
    <br />
    {/* Ajoutez vos propres champs ici */}
  </div>
</Tooltip>
```

---

## 🧪 Test avec Postman

### Collection : Church Planting Map API
### Dossier : Joshua Project Integration
### Requête : "Get Unreached Groups from Backend"

**URL :**
```
GET {{baseUrl}}/api/joshua-project/unreached/{{jpCountryCode}}
```

**Variables de collection :**
- `baseUrl` : `http://localhost:5000`
- `jpCountryCode` : `CM` (ou autre code pays)

**Tests automatiques inclus :**
- ✅ Status code 200
- ✅ Structure de réponse correcte
- ✅ Champs requis présents
- ✅ Statut = "unreached"

---

## 📊 Pays africains supportés

Changez simplement le `countryCode` pour afficher les données d'un autre pays :

| Pays | Code | Pays | Code |
|------|------|------|------|
| Cameroun | CM | Burkina Faso | BF |
| Niger | NE | Tchad | TD |
| Mali | ML | Nigeria | NG |
| Côte d'Ivoire | CI | Sénégal | SN |
| ... | ... | ... | ... |

*(52 pays africains au total)*

---

## 🔄 Workflow complet

### 1. Synchroniser les données (une fois)
```bash
# Via Postman : Collection "Sync JP Africa" > "Sync Country"
# Ou via curl :
curl -X POST http://localhost:5000/api/joshua-project/sync/CM
```

### 2. Récupérer les données dans le frontend
```javascript
// Automatique via le composant JoshuaProjectLayer
// Ou manuellement :
fetch('http://localhost:5000/api/joshua-project/unreached/CM')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 3. Afficher sur la carte
```jsx
<JoshuaProjectLayer countryCode="CM" showLayer={true} />
```

---

## 🐛 Dépannage

### Problème : Aucun point n'apparaît sur la carte

**Solutions :**
1. Vérifiez que les données sont synchronisées :
   ```bash
   curl http://localhost:5000/api/joshua-project/status
   ```

2. Vérifiez la console du navigateur pour les erreurs

3. Vérifiez que le backend est démarré sur le port 5000

4. Testez la route avec Postman

### Problème : Erreur CORS

**Solution :** Vérifiez que le backend autorise les requêtes depuis `http://localhost:8082` (ou votre port frontend).

Dans `backend/server.js`, vérifiez la configuration CORS :
```javascript
app.use(cors({
  origin: 'http://localhost:8082',
  credentials: true
}));
```

### Problème : Les points sont trop petits/grands

**Solution :** Ajustez la propriété `radius` dans `JoshuaProjectLayer.jsx` (voir section Personnalisation).

---

## 📝 Notes importantes

1. **Performance** : Le composant charge les données une seule fois au montage. Pour recharger, changez le `countryCode` ou remontez le composant.

2. **Données manquantes** : Certains peuples peuvent ne pas avoir de coordonnées précises. Le backend utilise alors le centroïde du pays.

3. **Filtrage** : Par défaut, seuls les peuples avec `status: 'unreached'` sont affichés. Modifiez la requête backend pour inclure d'autres statuts.

4. **Mise à jour** : Les données Joshua Project sont mises à jour périodiquement. Relancez la synchronisation pour obtenir les dernières données.

---

## 🎯 Prochaines étapes

- [ ] Ajouter un filtre par langue
- [ ] Ajouter un filtre par population
- [ ] Créer des clusters pour les zones denses
- [ ] Ajouter des statistiques en temps réel
- [ ] Exporter les données en CSV

---

## 📚 Ressources

- [Documentation Leaflet](https://leafletjs.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [Joshua Project API](https://joshuaproject.net/api)
- [GeoJSON Specification](https://geojson.org/)

---

## ✅ Checklist de déploiement

Avant de déployer en production :

- [ ] Tester avec plusieurs pays
- [ ] Vérifier les performances avec beaucoup de points
- [ ] Tester sur mobile
- [ ] Vérifier l'accessibilité (contraste des couleurs)
- [ ] Documenter pour l'équipe
- [ ] Configurer les variables d'environnement
- [ ] Tester la gestion des erreurs

---

**Créé le :** 19 janvier 2026  
**Auteur :** Postman AI Agent  
**Version :** 1.0
