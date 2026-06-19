# Guide d'Importation CSV - Church Planting Map API

## Vue d'ensemble

Ce guide explique comment importer des données de groupes de personnes (people groups) via des fichiers CSV dans l'API Church Planting Map. Le système calcule automatiquement le statut DMM et le niveau en fonction des données fournies.

**Fichier de référence :** `Import CSV.csv` (utilise des point-virgules `;` comme délimiteur)

**Note importante :** Le système détecte automatiquement le délimiteur utilisé (virgule `,` ou point-virgule `;`). Le fichier "Import CSV.csv" utilise des point-virgules.

---

## Format CSV Requis

### Colonnes Obligatoires

| Colonne | Type | Description |
|---------|------|-------------|
| `name` | String | Nom du groupe de personnes (unique) |
| `villageName` | String | Nom du village |
| `population` | Number | Population totale du groupe |
| `numberOfChurches` | Number | Nombre d'églises plantées |
| `churchGenerations` | Number | Nombre de générations d'églises |
| `latitude` | Number | Coordonnée latitude (format décimal) |
| `longitude` | Number | Coordonnée longitude (format décimal) |

### Colonnes Optionnelles

| Colonne | Type | Description |
|---------|------|-------------|
| `region` | String | Région géographique |
| `notes` | String | Notes ou commentaires additionnels |

### Exemple de Format

**Avec délimiteur virgule (,) :**
```csv
name,villageName,population,numberOfChurches,churchGenerations,latitude,longitude,region,notes
Peuple Alpha,Village Nord,5000,15,2,12.345,-1.234,Nord,Statut PIONEER - Niveau I
Peuple Beta,Village Sud,3000,0,0,11.111,-2.222,Sud,NON_ATTEINT - Aucune église
```

**Avec délimiteur point-virgule (;) - Format utilisé par "Import CSV.csv" :**
```csv
name;villageName;population;numberOfChurches;churchGenerations;latitude;longitude;region;notes
Peuple Alpha;Village Nord;5000;15;2;12.345;-1.234;Nord;Statut PIONEER - Niveau I
Peuple Beta;Village Sud;3000;0;0;11.111;-2.222;Sud;NON_ATTEINT - Aucune église
```

---

## Règles de Calcul Automatique

### 1. Calcul du Statut DMM

Le statut DMM est calculé automatiquement selon les critères suivants :

#### **NON_ATTEINT** (Non atteint)
- `numberOfChurches = 0`
- Aucune église n'a été plantée dans ce groupe

#### **PIONEER** (Pionnier)
- `numberOfChurches > 0`
- `churchGenerations < 3`
- Des églises existent mais le mouvement n'est pas encore établi

#### **MIDWAY** (Mi-chemin)
- `churchGenerations >= 3`
- `churchGenerations < 5`
- Le mouvement commence à se développer

#### **TIPPING_POINT** (Point de bascule)
- `churchGenerations >= 5`
- `churchGenerations < 7`
- Le mouvement atteint un point critique de croissance

#### **DMM** (Disciple Making Movement)
- `churchGenerations >= 7`
- Mouvement de multiplication de disciples pleinement établi

### 2. Calcul du Niveau (I, II, III, IV)

Le niveau est calculé en fonction du ratio églises/population :

```
ratio = (numberOfChurches / population) * 100
```

#### **Niveau I**
- `ratio < 0.5%`
- Très faible pénétration

#### **Niveau II**
- `0.5% <= ratio < 1.0%`
- Pénétration modérée

#### **Niveau III**
- `1.0% <= ratio < 1.5%`
- Bonne pénétration

#### **Niveau IV**
- `ratio >= 1.5%`
- Excellente pénétration

---

## Utilisation des Endpoints

L'API fournit 3 endpoints pour gérer l'importation CSV :

### 1. GET /api/people-groups/import/template

**Description :** Télécharge un fichier CSV template vide avec les en-têtes corrects.

**Utilisation :**
```bash
curl -X GET "http://localhost:3000/api/people-groups/import/template" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o template.csv
```

**Réponse :**
- Fichier CSV avec les colonnes : `name,villageName,population,numberOfChurches,churchGenerations,latitude,longitude,region,notes`

---

### 2. POST /api/people-groups/import/validate

**Description :** Valide un fichier CSV sans l'importer. Retourne les erreurs et un aperçu des données.

**Utilisation :**
```bash
curl -X POST "http://localhost:3000/api/people-groups/import/validate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@Import CSV.csv"
```

**Réponse Succès :**
```json
{
  "valid": true,
  "rowCount": 7,
  "preview": [
    {
      "name": "Peuple Alpha",
      "villageName": "Village Nord",
      "population": 5000,
      "numberOfChurches": 15,
      "churchGenerations": 2,
      "latitude": 12.345,
      "longitude": -1.234,
      "region": "Nord",
      "notes": "Statut PIONEER - Niveau I",
      "calculatedStatus": "PIONEER",
      "calculatedLevel": "I"
    }
  ],
  "errors": []
}
```

**Réponse avec Erreurs :**
```json
{
  "valid": false,
  "rowCount": 5,
  "errors": [
    {
      "row": 2,
      "field": "population",
      "message": "Population doit être un nombre positif"
    },
    {
      "row": 3,
      "field": "latitude",
      "message": "Latitude doit être entre -90 et 90"
    }
  ]
}
```

---

### 3. POST /api/people-groups/import

**Description :** Importe les données du fichier CSV dans la base de données.

**Utilisation :**
```bash
curl -X POST "http://localhost:3000/api/people-groups/import" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@Import CSV.csv"
```

**Réponse Succès :**
```json
{
  "success": true,
  "imported": 7,
  "failed": 0,
  "details": [
    {
      "name": "Peuple Alpha",
      "status": "created",
      "dmmStatus": "PIONEER",
      "level": "I"
    },
    {
      "name": "Peuple Beta",
      "status": "created",
      "dmmStatus": "NON_ATTEINT",
      "level": "I"
    }
  ]
}
```

**Réponse avec Erreurs Partielles :**
```json
{
  "success": false,
  "imported": 5,
  "failed": 2,
  "details": [
    {
      "name": "Peuple Alpha",
      "status": "created",
      "dmmStatus": "PIONEER",
      "level": "I"
    },
    {
      "name": "Peuple Invalide",
      "status": "failed",
      "error": "Population invalide"
    }
  ]
}
```

---

## Gestion des Erreurs

### Erreurs de Validation Communes

#### 1. Colonnes Manquantes
```json
{
  "error": "Colonnes requises manquantes: name, population"
}
```
**Solution :** Vérifiez que toutes les colonnes obligatoires sont présentes dans le CSV.

#### 2. Données Invalides
```json
{
  "row": 3,
  "field": "numberOfChurches",
  "message": "Doit être un nombre entier positif ou zéro"
}
```
**Solution :** Corrigez la valeur à la ligne indiquée.

#### 3. Coordonnées Invalides
```json
{
  "row": 5,
  "field": "latitude",
  "message": "Latitude doit être entre -90 et 90"
}
```
**Solution :** Vérifiez les coordonnées GPS (latitude: -90 à 90, longitude: -180 à 180).

#### 4. Nom Dupliqué
```json
{
  "name": "Peuple Alpha",
  "status": "failed",
  "error": "Un groupe avec ce nom existe déjà"
}
```
**Solution :** Utilisez des noms uniques pour chaque groupe de personnes.

### Erreurs d'Authentification

```json
{
  "error": "Token JWT invalide ou expiré"
}
```
**Solution :** Connectez-vous à nouveau pour obtenir un nouveau token.

---

## Workflow Complet d'Importation

### Étape 1 : Télécharger le Template
```bash
curl -X GET "http://localhost:3000/api/people-groups/import/template" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o mon-import.csv
```

### Étape 2 : Remplir le Fichier CSV
Ouvrez `mon-import.csv` dans Excel ou un éditeur de texte et ajoutez vos données.

### Étape 3 : Valider les Données
```bash
curl -X POST "http://localhost:3000/api/people-groups/import/validate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@mon-import.csv"
```

### Étape 4 : Corriger les Erreurs (si nécessaire)
Si la validation retourne des erreurs, corrigez-les dans le fichier CSV.

### Étape 5 : Importer les Données
```bash
curl -X POST "http://localhost:3000/api/people-groups/import" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@mon-import.csv"
```

---

## Exemples de Données par Statut DMM

**Note :** Les exemples ci-dessous utilisent le format avec point-virgule (;) comme dans "Import CSV.csv"

### NON_ATTEINT
```csv
Peuple Non Atteint;Village Isolé;2000;0;0;10.123;-2.456;Nord;Aucune présence chrétienne
```
- 0 églises → Statut: NON_ATTEINT
- 0/2000 = 0% → Niveau: I

### PIONEER
```csv
Peuple Pionnier;Village Nouveau;5000;15;2;11.234;-3.567;Sud;Premières églises plantées
```
- 15 églises, 2 générations → Statut: PIONEER
- 15/5000 = 0.3% → Niveau: I

### MIDWAY
```csv
Peuple Mi-Chemin;Village Croissance;4500;50;4;12.345;-4.678;Est;Mouvement en développement
```
- 50 églises, 4 générations → Statut: MIDWAY
- 50/4500 = 1.11% → Niveau: III

### TIPPING_POINT
```csv
Peuple Bascule;Village Expansion;6000;85;6;13.456;-5.789;Ouest;Point critique atteint
```
- 85 églises, 6 générations → Statut: TIPPING_POINT
- 85/6000 = 1.42% → Niveau: III

### DMM
```csv
Peuple DMM;Village Multiplication;8000;120;8;14.567;-6.890;Centre;Mouvement établi
```
- 120 églises, 8 générations → Statut: DMM
- 120/8000 = 1.5% → Niveau: IV

---

## Conseils et Bonnes Pratiques

### 1. Préparation des Données
- ✅ Utilisez des noms uniques pour chaque groupe
- ✅ Vérifiez les coordonnées GPS avec Google Maps
- ✅ Assurez-vous que les nombres sont bien formatés (pas de virgules, utilisez des points pour les décimales)
- ✅ Évitez les caractères spéciaux dans les noms

### 2. Validation Avant Import
- ✅ Toujours valider avec `/validate` avant d'importer
- ✅ Corrigez toutes les erreurs signalées
- ✅ Vérifiez l'aperçu des statuts et niveaux calculés

### 3. Gestion des Gros Fichiers
- ✅ Pour plus de 100 lignes, divisez en plusieurs fichiers
- ✅ Importez par région ou par statut DMM
- ✅ Gardez une copie de sauvegarde de vos fichiers CSV

### 4. Encodage et Délimiteurs
- ✅ Utilisez l'encodage UTF-8 pour les caractères accentués
- ✅ Évitez les sauts de ligne dans les champs (surtout dans `notes`)
- ✅ Le système détecte automatiquement le délimiteur (virgule ou point-virgule)
- ✅ "Import CSV.csv" utilise des point-virgules (;) comme délimiteur

---

## Dépannage

### Problème : "Fichier CSV vide ou invalide"
**Cause :** Le fichier n'est pas au format CSV ou est corrompu.
**Solution :** Vérifiez que le fichier a l'extension `.csv` et contient des données.

### Problème : "Colonnes non reconnues"
**Cause :** Les en-têtes de colonnes ne correspondent pas exactement.
**Solution :** Utilisez le template fourni par `/import/template` ou référez-vous au fichier "Import CSV.csv".

### Problème : "Erreur d'encodage"
**Cause :** Caractères spéciaux mal encodés.
**Solution :** Sauvegardez le fichier en UTF-8.

### Problème : "Délimiteur non reconnu"
**Cause :** Le fichier utilise un délimiteur non standard.
**Solution :** Utilisez soit des virgules (,) soit des point-virgules (;). Le système détecte automatiquement ces deux formats. "Import CSV.csv" utilise des point-virgules.

### Problème : "Token expiré"
**Cause :** Le JWT a dépassé sa durée de validité.
**Solution :** Reconnectez-vous avec `/auth/login` pour obtenir un nouveau token.

---

## Support et Contact

Pour toute question ou problème :
- Consultez la documentation API complète
- Vérifiez les logs du serveur pour plus de détails
- Contactez l'administrateur système

---

**Version du Guide :** 1.0  
**Dernière Mise à Jour :** 2024