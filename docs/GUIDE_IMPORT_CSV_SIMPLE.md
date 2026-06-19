# 📋 Guide Simple : Comment Importer des Peuples via CSV

## 🎯 Réponse Rapide

**NON, il n'y a AUCUNE étape préalable !** 

L'import CSV crée **directement** les données dans MongoDB. Vous n'avez rien à préparer dans la base de données.

---

## 📖 Processus Complet en 3 Étapes

### Étape 1️⃣ : Préparer votre fichier CSV

Créez un fichier avec ces colonnes (délimiteur `;` ou `,`) :

```csv
name;villageName;population;numberOfChurches;churchGeneration;latitude;longitude;description
Massa;Yagoua;15000;120;8;10.3417;15.2372;Mouvement DMM établi
Fulani;Garoua;25000;0;0;9.3011;13.3964;Non atteint - nomade
```

**Colonnes obligatoires :**
- ✅ `name` - Nom du groupe de peuples
- ✅ `latitude` - Coordonnée GPS (ex: 10.3417)
- ✅ `longitude` - Coordonnée GPS (ex: 15.2372)

**Colonnes optionnelles :**
- `villageName` - Nom du village
- `population` - Nombre d'habitants
- `numberOfChurches` - Nombre d'églises
- `churchGeneration` - Génération d'églises (1-8)
- `description` - Notes/commentaires
- `region` - Région géographique

---

### Étape 2️⃣ : Lancer l'import

**Option A : Via l'interface web (frontend)**
1. Ouvrir l'application : http://localhost:5173
2. Aller dans "Data Management" ou "Gestion des données"
3. Cliquer sur l'onglet "Import"
4. Sélectionner votre fichier CSV
5. Vérifier l'aperçu
6. Cliquer sur "Import Data"

**Option B : Via l'API (backend)**
```bash
curl -X POST http://localhost:5000/api/import/people-groups \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -F "file=@Import CSV.csv"
```

---

### Étape 3️⃣ : Vérifier les résultats

L'API vous retourne un résumé :

```json
{
  "success": true,
  "message": "Import completed: 22 imported, 0 skipped",
  "summary": {
    "total": 22,
    "imported": 22,
    "skipped": 0,
    "errors": 0
  },
  "imported": [
    {"row": 1, "id": "6966f52289a8c6e3035e8299", "name": "Massa"},
    {"row": 2, "id": "6966f52289a8c6e3035e829c", "name": "Fulani"}
  ]
}
```

---

## 🔄 Que se passe-t-il en arrière-plan ?

### 1. **Détection automatique du délimiteur**
```javascript
const delimiter = firstLine.includes(';') ? ';' : ',';
```
Le backend détecte automatiquement si vous utilisez `;` ou `,`

### 2. **Parsing du CSV**
Chaque ligne du CSV est lue et transformée en objet JavaScript

### 3. **Validation des données**
- Vérification que `name` existe
- Vérification que `latitude` et `longitude` sont valides (-90 à 90, -180 à 180)
- Validation des coordonnées géographiques

### 4. **Calcul automatique du statut DMM**
Basé sur le nombre d'églises :
- **0 églises** → `NON_ATTEINT` (unreached)
- **1-33 églises** → `PIONEER` (engagement initial)
- **34-66 églises** → `MIDWAY` (discipleship actif)
- **67-99 églises** → `TIPPING_POINT` (proche du mouvement)
- **100+ églises** → `DMM` (mouvement établi)

### 5. **Création dans MongoDB**
Chaque ligne valide crée un nouveau document dans la collection `peoplegroups` :

```javascript
{
  _id: ObjectId("6966f52289a8c6e3035e8299"),
  name: "Massa",
  villageName: "Yagoua",
  population: 15000,
  numberOfChurches: 120,
  churchGeneration: 8,
  location: {
    type: "Point",
    coordinates: [15.2372, 10.3417]  // [longitude, latitude]
  },
  status: "dmm",  // Calculé automatiquement
  description: "Mouvement DMM établi",
  createdBy: ObjectId("..."),
  createdAt: ISODate("2026-01-14T01:45:00Z")
}
```

---

## ❓ Questions Fréquentes

### Q1 : Dois-je créer la base de données avant ?
**R : NON !** MongoDB crée automatiquement la collection si elle n'existe pas.

### Q2 : Dois-je créer les villages avant d'importer les peuples ?
**R : NON !** Le champ `villageName` est juste du texte. Vous pouvez lier les villages plus tard si nécessaire.

### Q3 : Que se passe-t-il si j'importe deux fois le même fichier ?
**R :** Cela créera des **doublons**. Chaque import crée de nouveaux documents. Il n'y a pas de vérification de duplication automatique.

### Q4 : Puis-je importer sans coordonnées GPS ?
**R : NON !** Les champs `latitude` et `longitude` sont **obligatoires**. Sans eux, la ligne sera ignorée.

### Q5 : Le délimiteur point-virgule (;) fonctionne-t-il ?
**R : OUI !** Le backend détecte automatiquement `;` ou `,`

### Q6 : Combien de lignes puis-je importer à la fois ?
**R :** Techniquement illimité, mais pour de meilleures performances, restez sous 1000 lignes par fichier.

### Q7 : Que faire si certaines lignes échouent ?
**R :** L'import continue et vous donne un rapport détaillé :
```json
{
  "imported": 20,
  "skipped": 2,
  "errors": [
    {"row": 5, "error": "Invalid coordinates"},
    {"row": 12, "error": "Name is required"}
  ]
}
```

---

## 🎯 Exemple Complet

### Fichier : `mes_peuples.csv`
```csv
name;villageName;population;numberOfChurches;churchGeneration;latitude;longitude;description
Massa;Yagoua;15000;120;8;10.3417;15.2372;Mouvement DMM établi avec 8 générations
Moundang;Léré;8000;75;6;9.6333;14.1833;Progression vers tipping point
Fulani;Garoua;25000;0;0;9.3011;13.3964;Non atteint - population nomade
```

### Commande d'import
```bash
# 1. S'authentifier
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Réponse : {"token": "eyJhbGc..."}

# 2. Importer le CSV
curl -X POST http://localhost:5000/api/import/people-groups \
  -H "Authorization: Bearer eyJhbGc..." \
  -F "file=@mes_peuples.csv"
```

### Résultat
```json
{
  "success": true,
  "message": "Import completed: 3 imported, 0 skipped",
  "summary": {
    "total": 3,
    "imported": 3,
    "skipped": 0,
    "errors": 0
  },
  "imported": [
    {"row": 1, "id": "abc123", "name": "Massa"},
    {"row": 2, "id": "def456", "name": "Moundang"},
    {"row": 3, "id": "ghi789", "name": "Fulani"}
  ]
}
```

### Vérification dans MongoDB
```bash
# Se connecter à MongoDB
mongosh

# Utiliser la base de données
use everywhere

# Compter les documents
db.peoplegroups.countDocuments()
# Résultat : 3

# Voir les données
db.peoplegroups.find().pretty()
```

---

## ✅ Checklist avant l'import

- [ ] Le serveur backend est démarré (`npm start`)
- [ ] MongoDB est en cours d'exécution
- [ ] Vous avez un compte utilisateur créé
- [ ] Vous avez un token d'authentification valide
- [ ] Votre fichier CSV a les colonnes obligatoires : `name`, `latitude`, `longitude`
- [ ] Les coordonnées GPS sont valides
- [ ] Le fichier est encodé en UTF-8

---

## 🚀 Résumé Ultra-Simple

1. **Créez votre CSV** avec au minimum : `name`, `latitude`, `longitude`
2. **Uploadez-le** via l'interface web ou l'API
3. **C'est tout !** Les données sont automatiquement dans MongoDB

**Aucune préparation de base de données nécessaire !** 🎉
