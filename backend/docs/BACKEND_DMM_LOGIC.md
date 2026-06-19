# Guide d'Implémentation Backend - Logique DMM

## Table des Matières

1. [Introduction](#introduction)
2. [Calcul du Statut DMM](#calcul-du-statut-dmm)
3. [Calcul du Niveau DMM](#calcul-du-niveau-dmm)
4. [Intégration dans l'Endpoint d'Import CSV](#intégration-dans-lendpoint-dimport-csv)
5. [Règles de Validation](#règles-de-validation)
6. [Gestion des Erreurs](#gestion-des-erreurs)
7. [Gestion des Transactions](#gestion-des-transactions)
8. [Tests Unitaires](#tests-unitaires)
9. [Cas Limites et Dépannage](#cas-limites-et-dépannage)

---

## Introduction

Ce document décrit la logique métier pour le calcul des statuts et niveaux DMM (Disciple Making Movements) dans l'application Church Planting Map. Ces calculs sont essentiels pour évaluer la progression de l'évangélisation des groupes de population.

### Modèle de Données PeopleGroup

```javascript
// models/PeopleGroup.js
const peopleGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  population: { type: Number, required: true },
  language: { type: String, required: true },
  religion: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  country: { type: String, required: true },
  region: { type: String },
  
  // Champs DMM calculés
  dmmStatus: {
    type: String,
    enum: ['unreached', 'formative', 'established', 'multiplying'],
    default: 'unreached'
  },
  dmmLevel: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  
  // Métriques d'entrée pour les calculs
  hasEngagement: { type: Boolean, default: false },
  hasChurch: { type: Boolean, default: false },
  churchCount: { type: Number, default: 0 },
  believerCount: { type: Number, default: 0 },
  hasLeadership: { type: Boolean, default: false },
  isMultiplying: { type: Boolean, default: false },
  hasMovement: { type: Boolean, default: false },
  
  // Métadonnées
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  importedFrom: { type: String }, // Source du fichier CSV
  importBatchId: { type: String } // ID du lot d'import
});
```

---

## Calcul du Statut DMM

### Définition des Statuts

| Statut | Description | Critères |
|--------|-------------|----------|
| `unreached` | Non atteint | Aucun engagement missionnaire |
| `formative` | En formation | Engagement actif, église en développement |
| `established` | Établi | Église établie avec leadership local |
| `multiplying` | En multiplication | Mouvement de multiplication actif |

### Fonction computeDmmStatus

```javascript
// utils/dmmCalculations.js

/**
 * Calcule le statut DMM d'un groupe de population
 * @param {Object} data - Données du groupe de population
 * @param {boolean} data.hasEngagement - Présence d'engagement missionnaire
 * @param {boolean} data.hasChurch - Présence d'une église
 * @param {number} data.churchCount - Nombre d'églises
 * @param {boolean} data.hasLeadership - Présence de leadership local
 * @param {boolean} data.isMultiplying - En cours de multiplication
 * @param {boolean} data.hasMovement - Mouvement établi
 * @returns {string} Statut DMM: 'unreached' | 'formative' | 'established' | 'multiplying'
 */
function computeDmmStatus(data) {
  // Validation des entrées
  if (!data || typeof data !== 'object') {
    return 'unreached';
  }

  const {
    hasEngagement = false,
    hasChurch = false,
    churchCount = 0,
    hasLeadership = false,
    isMultiplying = false,
    hasMovement = false
  } = data;

  // Logique de calcul hiérarchique (du plus avancé au moins avancé)
  
  // Niveau 4: Multiplication - Mouvement actif avec multiplication
  if (hasMovement && isMultiplying && churchCount >= 4) {
    return 'multiplying';
  }

  // Niveau 3: Établi - Église avec leadership local
  if (hasChurch && hasLeadership && churchCount >= 1) {
    return 'established';
  }

  // Niveau 2: Formatif - Engagement actif avec début d'église
  if (hasEngagement && (hasChurch || churchCount > 0)) {
    return 'formative';
  }

  // Niveau 1: Formatif basique - Seulement engagement
  if (hasEngagement) {
    return 'formative';
  }

  // Niveau 0: Non atteint - Aucun critère rempli
  return 'unreached';
}

/**
 * Version alternative avec scoring pondéré
 * @param {Object} data - Données du groupe de population
 * @returns {Object} Statut et score détaillé
 */
function computeDmmStatusWithScore(data) {
  const scores = {
    engagement: data.hasEngagement ? 1 : 0,
    church: data.hasChurch ? 2 : 0,
    churchCount: Math.min(data.churchCount || 0, 10) * 0.5,
    leadership: data.hasLeadership ? 3 : 0,
    multiplying: data.isMultiplying ? 4 : 0,
    movement: data.hasMovement ? 5 : 0
  };

  const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);

  let status;
  if (totalScore >= 12) {
    status = 'multiplying';
  } else if (totalScore >= 6) {
    status = 'established';
  } else if (totalScore >= 1) {
    status = 'formative';
  } else {
    status = 'unreached';
  }

  return {
    status,
    totalScore,
    breakdown: scores
  };
}

module.exports = {
  computeDmmStatus,
  computeDmmStatusWithScore
};
```

### Exemples d'Utilisation

```javascript
// Exemple 1: Groupe non atteint
const unreachedGroup = {
  hasEngagement: false,
  hasChurch: false,
  churchCount: 0,
  hasLeadership: false,
  isMultiplying: false,
  hasMovement: false
};
console.log(computeDmmStatus(unreachedGroup)); // 'unreached'

// Exemple 2: Groupe en formation
const formativeGroup = {
  hasEngagement: true,
  hasChurch: false,
  churchCount: 0,
  hasLeadership: false,
  isMultiplying: false,
  hasMovement: false
};
console.log(computeDmmStatus(formativeGroup)); // 'formative'

// Exemple 3: Groupe établi
const establishedGroup = {
  hasEngagement: true,
  hasChurch: true,
  churchCount: 2,
  hasLeadership: true,
  isMultiplying: false,
  hasMovement: false
};
console.log(computeDmmStatus(establishedGroup)); // 'established'

// Exemple 4: Groupe en multiplication
const multiplyingGroup = {
  hasEngagement: true,
  hasChurch: true,
  churchCount: 5,
  hasLeadership: true,
  isMultiplying: true,
  hasMovement: true
};
console.log(computeDmmStatus(multiplyingGroup)); // 'multiplying'
```

---

## Calcul du Niveau DMM

### Définition des Niveaux

| Niveau | Description | Critères Détaillés |
|--------|-------------|-------------------|
| 0 | Aucun progrès | Aucune activité missionnaire |
| 1 | Engagement initial | Premier contact, sensibilisation |
| 2 | Formation active | Groupes de découverte, études bibliques |
| 3 | Église naissante | Première église plantée |
| 4 | Église établie | Leadership local, autonomie |
| 5 | Mouvement | Multiplication, 4+ générations |

### Fonction computeDmmLevel

```javascript
// utils/dmmCalculations.js

/**
 * Calcule le niveau DMM (0-5) d'un groupe de population
 * @param {Object} data - Données du groupe de population
 * @param {boolean} data.hasEngagement - Présence d'engagement missionnaire
 * @param {boolean} data.hasChurch - Présence d'une église
 * @param {number} data.churchCount - Nombre d'églises
 * @param {number} data.believerCount - Nombre de croyants
 * @param {boolean} data.hasLeadership - Présence de leadership local
 * @param {boolean} data.isMultiplying - En cours de multiplication
 * @param {boolean} data.hasMovement - Mouvement établi
 * @param {number} data.population - Population totale du groupe
 * @returns {number} Niveau DMM de 0 à 5
 */
function computeDmmLevel(data) {
  // Validation des entrées
  if (!data || typeof data !== 'object') {
    return 0;
  }

  const {
    hasEngagement = false,
    hasChurch = false,
    churchCount = 0,
    believerCount = 0,
    hasLeadership = false,
    isMultiplying = false,
    hasMovement = false,
    population = 0
  } = data;

  // Calcul du ratio croyants/population (si applicable)
  const believerRatio = population > 0 ? believerCount / population : 0;

  // Niveau 5: Mouvement établi
  // Critères: Mouvement actif + multiplication + 4+ églises + ratio significatif
  if (
    hasMovement &&
    isMultiplying &&
    churchCount >= 4 &&
    believerRatio >= 0.02 // Au moins 2% de la population
  ) {
    return 5;
  }

  // Niveau 4: Église établie avec multiplication
  // Critères: Leadership + multiplication active + plusieurs églises
  if (
    hasLeadership &&
    isMultiplying &&
    churchCount >= 2
  ) {
    return 4;
  }

  // Niveau 3: Église établie
  // Critères: Église avec leadership local
  if (
    hasChurch &&
    hasLeadership &&
    churchCount >= 1
  ) {
    return 3;
  }

  // Niveau 2: Formation active
  // Critères: Engagement + début d'église ou croyants significatifs
  if (
    hasEngagement &&
    (hasChurch || believerCount >= 10)
  ) {
    return 2;
  }

  // Niveau 1: Engagement initial
  // Critères: Présence d'engagement missionnaire
  if (hasEngagement) {
    return 1;
  }

  // Niveau 0: Aucun progrès
  return 0;
}

/**
 * Calcule le niveau DMM avec détails et recommandations
 * @param {Object} data - Données du groupe de population
 * @returns {Object} Niveau, détails et prochaines étapes
 */
function computeDmmLevelDetailed(data) {
  const level = computeDmmLevel(data);
  
  const levelDescriptions = {
    0: {
      name: 'Non atteint',
      description: 'Aucune activité missionnaire en cours',
      nextSteps: [
        'Identifier des ouvriers potentiels',
        'Rechercher des points d\'entrée culturels',
        'Développer des ressources dans la langue locale'
      ],
      color: '#dc3545' // Rouge
    },
    1: {
      name: 'Engagement initial',
      description: 'Premier contact établi avec le groupe',
      nextSteps: [
        'Former des groupes de découverte',
        'Identifier des personnes de paix',
        'Commencer des études bibliques'
      ],
      color: '#fd7e14' // Orange
    },
    2: {
      name: 'Formation active',
      description: 'Groupes de découverte et études bibliques en cours',
      nextSteps: [
        'Former les premiers croyants',
        'Préparer le baptême',
        'Identifier des leaders potentiels'
      ],
      color: '#ffc107' // Jaune
    },
    3: {
      name: 'Église naissante',
      description: 'Première église plantée',
      nextSteps: [
        'Former le leadership local',
        'Développer l\'autonomie financière',
        'Encourager la vision de multiplication'
      ],
      color: '#20c997' // Turquoise
    },
    4: {
      name: 'Église établie',
      description: 'Leadership local en place, multiplication en cours',
      nextSteps: [
        'Soutenir la multiplication',
        'Former des formateurs',
        'Documenter les meilleures pratiques'
      ],
      color: '#28a745' // Vert
    },
    5: {
      name: 'Mouvement',
      description: 'Mouvement de multiplication actif (4+ générations)',
      nextSteps: [
        'Maintenir la vision',
        'Partager le modèle avec d\'autres régions',
        'Continuer la formation des leaders'
      ],
      color: '#007bff' // Bleu
    }
  };

  return {
    level,
    ...levelDescriptions[level],
    metrics: {
      hasEngagement: data.hasEngagement || false,
      hasChurch: data.hasChurch || false,
      churchCount: data.churchCount || 0,
      believerCount: data.believerCount || 0,
      hasLeadership: data.hasLeadership || false,
      isMultiplying: data.isMultiplying || false,
      hasMovement: data.hasMovement || false
    }
  };
}

module.exports = {
  computeDmmStatus,
  computeDmmStatusWithScore,
  computeDmmLevel,
  computeDmmLevelDetailed
};
```

### Exemples d'Utilisation

```javascript
const { computeDmmLevel, computeDmmLevelDetailed } = require('./utils/dmmCalculations');

// Exemple avec différents niveaux
const testCases = [
  // Niveau 0
  { hasEngagement: false, hasChurch: false, churchCount: 0 },
  // Niveau 1
  { hasEngagement: true, hasChurch: false, churchCount: 0 },
  // Niveau 2
  { hasEngagement: true, hasChurch: true, churchCount: 1, believerCount: 15 },
  // Niveau 3
  { hasEngagement: true, hasChurch: true, churchCount: 1, hasLeadership: true },
  // Niveau 4
  { hasEngagement: true, hasChurch: true, churchCount: 3, hasLeadership: true, isMultiplying: true },
  // Niveau 5
  { hasEngagement: true, hasChurch: true, churchCount: 5, hasLeadership: true, isMultiplying: true, hasMovement: true, believerCount: 500, population: 10000 }
];

testCases.forEach((testCase, index) => {
  console.log(`Test ${index}: Niveau ${computeDmmLevel(testCase)}`);
});

// Exemple avec détails
const detailedResult = computeDmmLevelDetailed({
  hasEngagement: true,
  hasChurch: true,
  churchCount: 2,
  hasLeadership: true,
  isMultiplying: false,
  population: 5000,
  believerCount: 50
});

console.log(detailedResult);
// {
//   level: 3,
//   name: 'Église naissante',
//   description: 'Première église plantée',
//   nextSteps: [...],
//   color: '#20c997',
//   metrics: {...}
// }
```

---

## Intégration dans l'Endpoint d'Import CSV

### Structure du Fichier CSV Attendu

```csv
name,population,language,religion,latitude,longitude,country,region,hasEngagement,hasChurch,churchCount,believerCount,hasLeadership,isMultiplying,hasMovement
"Groupe A",50000,"Français","Islam",14.6937,-17.4441,"Sénégal","Dakar",true,false,0,5,false,false,false
"Groupe B",25000,"Wolof","Animisme",14.7645,-17.3660,"Sénégal","Thiès",true,true,2,150,true,false,false
"Groupe C",100000,"Peul","Islam",13.4549,-16.5790,"Sénégal","Ziguinchor",false,false,0,0,false,false,false
```

### Endpoint d'Import Complet

```javascript
// routes/peopleGroups.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PeopleGroup = require('../models/PeopleGroup');
const { computeDmmStatus, computeDmmLevel } = require('../utils/dmmCalculations');
const { validatePeopleGroupRow, ValidationError } = require('../utils/validation');

// Configuration Multer pour l'upload de fichiers
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers CSV sont acceptés'), false);
    }
  }
});

/**
 * POST /api/people-groups/import
 * Importe des groupes de population depuis un fichier CSV
 */
router.post('/import', upload.single('file'), async (req, res) => {
  const session = await mongoose.startSession();
  const batchId = uuidv4();
  const results = {
    success: [],
    errors: [],
    warnings: [],
    summary: {
      total: 0,
      imported: 0,
      failed: 0,
      skipped: 0
    }
  };

  try {
    // Vérification du fichier
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni',
        code: 'NO_FILE'
      });
    }

    // Parsing du CSV
    const rows = await parseCSV(req.file.buffer);
    results.summary.total = rows.length;

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Le fichier CSV est vide',
        code: 'EMPTY_FILE'
      });
    }

    // Limite de sécurité
    if (rows.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Le fichier contient trop de lignes (max: 10000)',
        code: 'TOO_MANY_ROWS'
      });
    }

    // Démarrage de la transaction
    session.startTransaction();

    // Traitement par lots (batch processing)
    const BATCH_SIZE = 100;
    const batches = chunkArray(rows, BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const documentsToInsert = [];

      for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
        const globalIndex = batchIndex * BATCH_SIZE + rowIndex;
        const row = batch[rowIndex];

        try {
          // Validation de la ligne
          const validationResult = validatePeopleGroupRow(row, globalIndex + 1);
          
          if (!validationResult.isValid) {
            results.errors.push({
              row: globalIndex + 1,
              data: row,
              errors: validationResult.errors
            });
            results.summary.failed++;
            continue;
          }

          // Ajout des avertissements
          if (validationResult.warnings.length > 0) {
            results.warnings.push({
              row: globalIndex + 1,
              warnings: validationResult.warnings
            });
          }

          // Transformation des données
          const transformedData = transformRowData(row);

          // Calcul automatique du statut et niveau DMM
          transformedData.dmmStatus = computeDmmStatus(transformedData);
          transformedData.dmmLevel = computeDmmLevel(transformedData);

          // Métadonnées d'import
          transformedData.importedFrom = req.file.originalname;
          transformedData.importBatchId = batchId;
          transformedData.updatedAt = new Date();

          // Vérification des doublons
          const existingGroup = await PeopleGroup.findOne({
            name: transformedData.name,
            country: transformedData.country
          }).session(session);

          if (existingGroup) {
            // Mise à jour si existant
            if (req.body.updateExisting === 'true') {
              await PeopleGroup.updateOne(
                { _id: existingGroup._id },
                { $set: transformedData },
                { session }
              );
              results.success.push({
                row: globalIndex + 1,
                action: 'updated',
                id: existingGroup._id,
                name: transformedData.name,
                dmmStatus: transformedData.dmmStatus,
                dmmLevel: transformedData.dmmLevel
              });
              results.summary.imported++;
            } else {
              results.warnings.push({
                row: globalIndex + 1,
                message: `Groupe "${transformedData.name}" existe déjà - ignoré`,
                existingId: existingGroup._id
              });
              results.summary.skipped++;
            }
          } else {
            // Nouveau document à insérer
            documentsToInsert.push(transformedData);
          }

        } catch (rowError) {
          results.errors.push({
            row: globalIndex + 1,
            data: row,
            errors: [rowError.message]
          });
          results.summary.failed++;
        }
      }

      // Insertion en masse des nouveaux documents
      if (documentsToInsert.length > 0) {
        const insertedDocs = await PeopleGroup.insertMany(documentsToInsert, {
          session,
          ordered: false // Continue même si certains échouent
        });

        insertedDocs.forEach((doc, idx) => {
          results.success.push({
            row: batchIndex * BATCH_SIZE + idx + 1,
            action: 'created',
            id: doc._id,
            name: doc.name,
            dmmStatus: doc.dmmStatus,
            dmmLevel: doc.dmmLevel
          });
          results.summary.imported++;
        });
      }
    }

    // Validation de la transaction
    await session.commitTransaction();

    // Réponse de succès
    res.status(200).json({
      success: true,
      message: `Import terminé: ${results.summary.imported} groupes importés`,
      batchId,
      summary: results.summary,
      details: {
        success: results.success.slice(0, 100), // Limiter la réponse
        errors: results.errors,
        warnings: results.warnings
      }
    });

  } catch (error) {
    // Annulation de la transaction en cas d'erreur
    await session.abortTransaction();

    console.error('Erreur lors de l\'import CSV:', error);

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'import',
      message: error.message,
      code: 'IMPORT_ERROR',
      batchId
    });

  } finally {
    session.endSession();
  }
});

/**
 * Parse le contenu CSV en tableau d'objets
 * @param {Buffer} buffer - Contenu du fichier
 * @returns {Promise<Array>} Tableau des lignes parsées
 */
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase(),
        mapValues: ({ value }) => value.trim()
      }))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });
}

/**
 * Transforme une ligne CSV en objet PeopleGroup
 * @param {Object} row - Ligne CSV parsée
 * @returns {Object} Données transformées
 */
function transformRowData(row) {
  return {
    name: row.name,
    population: parseInt(row.population, 10) || 0,
    language: row.language,
    religion: row.religion || 'Unknown',
    latitude: parseFloat(row.latitude) || 0,
    longitude: parseFloat(row.longitude) || 0,
    country: row.country,
    region: row.region || '',
    
    // Conversion des booléens
    hasEngagement: parseBoolean(row.hasengagement || row.has_engagement),
    hasChurch: parseBoolean(row.haschurch || row.has_church),
    churchCount: parseInt(row.churchcount || row.church_count, 10) || 0,
    believerCount: parseInt(row.believercount || row.believer_count, 10) || 0,
    hasLeadership: parseBoolean(row.hasleadership || row.has_leadership),
    isMultiplying: parseBoolean(row.ismultiplying || row.is_multiplying),
    hasMovement: parseBoolean(row.hasmovement || row.has_movement)
  };
}

/**
 * Convertit une valeur en booléen
 * @param {any} value - Valeur à convertir
 * @returns {boolean}
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return ['true', '1', 'yes', 'oui', 'y', 'o'].includes(lower);
  }
  return Boolean(value);
}

/**
 * Divise un tableau en sous-tableaux de taille fixe
 * @param {Array} array - Tableau à diviser
 * @param {number} size - Taille des sous-tableaux
 * @returns {Array<Array>}
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

module.exports = router;
```

---

## Règles de Validation

### Module de Validation Complet

```javascript
// utils/validation.js

/**
 * Classe d'erreur de validation personnalisée
 */
class ValidationError extends Error {
  constructor(message, field, value) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Règles de validation pour chaque champ
 */
const validationRules = {
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200,
    message: 'Le nom est requis et doit contenir entre 1 et 200 caractères'
  },
  population: {
    required: true,
    type: 'number',
    min: 0,
    max: 1000000000,
    message: 'La population doit être un nombre positif'
  },
  language: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100,
    message: 'La langue est requise'
  },
  latitude: {
    required: true,
    type: 'number',
    min: -90,
    max: 90,
    message: 'La latitude doit être entre -90 et 90'
  },
  longitude: {
    required: true,
    type: 'number',
    min: -180,
    max: 180,
    message: 'La longitude doit être entre -180 et 180'
  },
  country: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100,
    message: 'Le pays est requis'
  },
  churchCount: {
    required: false,
    type: 'number',
    min: 0,
    max: 100000,
    message: 'Le nombre d\'églises doit être positif'
  },
  believerCount: {
    required: false,
    type: 'number',
    min: 0,
    message: 'Le nombre de croyants doit être positif'
  }
};

/**
 * Valide une ligne de données CSV
 * @param {Object} row - Ligne de données
 * @param {number} rowNumber - Numéro de ligne pour les messages d'erreur
 * @returns {Object} Résultat de validation
 */
function validatePeopleGroupRow(row, rowNumber) {
  const errors = [];
  const warnings = [];

  // Validation des champs requis
  for (const [field, rules] of Object.entries(validationRules)) {
    const value = row[field.toLowerCase()] || row[field];

    // Vérification champ requis
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: `Ligne ${rowNumber}: ${rules.message}`,
        code: 'REQUIRED_FIELD'
      });
      continue;
    }

    // Skip si non requis et vide
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Validation du type
    if (rules.type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        errors.push({
          field,
          message: `Ligne ${rowNumber}: "${field}" doit être un nombre valide`,
          value,
          code: 'INVALID_TYPE'
        });
        continue;
      }

      // Validation min/max
      if (rules.min !== undefined && numValue < rules.min) {
        errors.push({
          field,
          message: `Ligne ${rowNumber}: "${field}" doit être >= ${rules.min}`,
          value: numValue,
          code: 'MIN_VALUE'
        });
      }
      if (rules.max !== undefined && numValue > rules.max) {
        errors.push({
          field,
          message: `Ligne ${rowNumber}: "${field}" doit être <= ${rules.max}`,
          value: numValue,
          code: 'MAX_VALUE'
        });
      }
    }

    // Validation de longueur pour les chaînes
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field,
          message: `Ligne ${rowNumber}: "${field}" trop court (min: ${rules.minLength})`,
          value,
          code: 'MIN_LENGTH'
        });
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field,
          message: `Ligne ${rowNumber}: "${field}" trop long (max: ${rules.maxLength})`,
          value,
          code: 'MAX_LENGTH'
        });
      }
    }
  }

  // Validations croisées
  const churchCount = parseInt(row.churchcount || row.church_count || 0, 10);
  const hasChurch = parseBoolean(row.haschurch || row.has_church);
  const believerCount = parseInt(row.believercount || row.believer_count || 0, 10);
  const population = parseInt(row.population || 0, 10);

  // Avertissement: hasChurch mais churchCount = 0
  if (hasChurch && churchCount === 0) {
    warnings.push({
      field: 'churchCount',
      message: `Ligne ${rowNumber}: hasChurch est vrai mais churchCount est 0`,
      code: 'INCONSISTENT_DATA'
    });
  }

  // Avertissement: believerCount > population
  if (believerCount > population && population > 0) {
    warnings.push({
      field: 'believerCount',
      message: `Ligne ${rowNumber}: believerCount (${believerCount}) > population (${population})`,
      code: 'BELIEVER_EXCEEDS_POPULATION'
    });
  }

  // Avertissement: coordonnées à (0, 0)
  const lat = parseFloat(row.latitude);
  const lng = parseFloat(row.longitude);
  if (lat === 0 && lng === 0) {
    warnings.push({
      field: 'coordinates',
      message: `Ligne ${rowNumber}: Coordonnées à (0, 0) - vérifier si intentionnel`,
      code: 'ZERO_COORDINATES'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide les données DMM pour cohérence
 * @param {Object} data - Données DMM
 * @returns {Object} Résultat de validation
 */
function validateDmmData(data) {
  const errors = [];
  const warnings = [];

  // Règle: isMultiplying nécessite hasChurch
  if (data.isMultiplying && !data.hasChurch) {
    errors.push({
      field: 'isMultiplying',
      message: 'isMultiplying ne peut être vrai sans hasChurch',
      code: 'INVALID_DMM_STATE'
    });
  }

  // Règle: hasMovement nécessite isMultiplying
  if (data.hasMovement && !data.isMultiplying) {
    errors.push({
      field: 'hasMovement',
      message: 'hasMovement ne peut être vrai sans isMultiplying',
      code: 'INVALID_DMM_STATE'
    });
  }

  // Règle: hasLeadership nécessite hasChurch
  if (data.hasLeadership && !data.hasChurch) {
    warnings.push({
      field: 'hasLeadership',
      message: 'hasLeadership est vrai mais hasChurch est faux - vérifier',
      code: 'SUSPICIOUS_DMM_STATE'
    });
  }

  // Règle: churchCount > 0 devrait avoir hasChurch = true
  if (data.churchCount > 0 && !data.hasChurch) {
    warnings.push({
      field: 'hasChurch',
      message: `churchCount est ${data.churchCount} mais hasChurch est faux`,
      code: 'INCONSISTENT_CHURCH_DATA'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Convertit une valeur en booléen
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return ['true', '1', 'yes', 'oui', 'y', 'o'].includes(lower);
  }
  return Boolean(value);
}

module.exports = {
  ValidationError,
  validationRules,
  validatePeopleGroupRow,
  validateDmmData,
  parseBoolean
};
```

---

## Gestion des Erreurs

### Middleware de Gestion d'Erreurs

```javascript
// middleware/errorHandler.js

/**
 * Types d'erreurs personnalisées
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} non trouvé`, 404, 'NOT_FOUND');
  }
}

class DuplicateError extends AppError {
  constructor(field, value) {
    super(`Un enregistrement avec ${field}="${value}" existe déjà`, 409, 'DUPLICATE');
    this.field = field;
    this.value = value;
  }
}

class ImportError extends AppError {
  constructor(message, details = {}) {
    super(message, 422, 'IMPORT_ERROR');
    this.details = details;
  }
}

/**
 * Middleware de gestion d'erreurs global
 */
function errorHandler(err, req, res, next) {
  // Log de l'erreur
  console.error('Error:', {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Erreur Mongoose de validation
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));

    return res.status(400).json({
      success: false,
      error: 'Erreur de validation',
      code: 'MONGOOSE_VALIDATION',
      errors
    });
  }

  // Erreur Mongoose de duplication
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: `Duplication: ${field} existe déjà`,
      code: 'DUPLICATE_KEY',
      field,
      value: err.keyValue[field]
    });
  }

  // Erreur Mongoose de cast (ID invalide)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Format invalide pour ${err.path}`,
      code: 'INVALID_FORMAT',
      field: err.path,
      value: err.value
    });
  }

  // Erreur Multer (upload de fichier)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'Fichier trop volumineux',
      code: 'FILE_TOO_LARGE',
      maxSize: '10MB'
    });
  }

  // Erreurs opérationnelles (nos erreurs personnalisées)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.errors && { errors: err.errors }),
      ...(err.details && { details: err.details })
    });
  }

  // Erreur inattendue (bug)
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        message: err.message,
        stack: err.stack
      }
    })
  });
}

/**
 * Wrapper async pour les routes
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  DuplicateError,
  ImportError,
  errorHandler,
  asyncHandler
};
```

### Utilisation dans les Routes

```javascript
// routes/peopleGroups.js
const { asyncHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');

router.get('/:id', asyncHandler(async (req, res) => {
  const group = await PeopleGroup.findById(req.params.id);
  
  if (!group) {
    throw new NotFoundError('Groupe de population');
  }
  
  res.json({ success: true, data: group });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { errors, warnings } = validatePeopleGroupRow(req.body, 1);
  
  if (errors.length > 0) {
    throw new ValidationError('Données invalides', errors);
  }
  
  // ... création du groupe
}));
```

---

## Gestion des Transactions

### Service de Transaction pour Import en Masse

```javascript
// services/importService.js
const mongoose = require('mongoose');
const PeopleGroup = require('../models/PeopleGroup');
const { computeDmmStatus, computeDmmLevel } = require('../utils/dmmCalculations');
const { validatePeopleGroupRow } = require('../utils/validation');

/**
 * Service d'import avec gestion de transaction
 */
class ImportService {
  /**
   * Importe des groupes de population avec transaction
   * @param {Array} rows - Lignes de données à importer
   * @param {Object} options - Options d'import
   * @returns {Promise<Object>} Résultat de l'import
   */
  async importWithTransaction(rows, options = {}) {
    const {
      updateExisting = false,
      batchSize = 100,
      validateOnly = false,
      source = 'csv'
    } = options;

    const session = await mongoose.startSession();
    const results = this.initializeResults();

    try {
      // Mode validation uniquement
      if (validateOnly) {
        return this.validateRows(rows);
      }

      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' }
      });

      // Traitement par lots
      const batches = this.chunkArray(rows, batchSize);

      for (let i = 0; i < batches.length; i++) {
        await this.processBatch(batches[i], i * batchSize, {
          session,
          updateExisting,
          source,
          results
        });

        // Point de sauvegarde intermédiaire pour les gros imports
        if (i > 0 && i % 10 === 0) {
          console.log(`Progression: ${(i + 1) * batchSize}/${rows.length} lignes traitées`);
        }
      }

      // Commit de la transaction
      await session.commitTransaction();
      results.success = true;
      results.message = `Import réussi: ${results.summary.imported} groupes importés`;

    } catch (error) {
      // Rollback en cas d'erreur
      await session.abortTransaction();
      results.success = false;
      results.error = error.message;
      results.message = 'Import annulé suite à une erreur';

      console.error('Erreur d\'import, transaction annulée:', error);

    } finally {
      session.endSession();
    }

    return results;
  }

  /**
   * Traite un lot de lignes
   */
  async processBatch(batch, startIndex, options) {
    const { session, updateExisting, source, results } = options;
    const documentsToInsert = [];

    for (let i = 0; i < batch.length; i++) {
      const rowIndex = startIndex + i + 1;
      const row = batch[i];

      try {
        // Validation
        const validation = validatePeopleGroupRow(row, rowIndex);
        
        if (!validation.isValid) {
          results.errors.push({ row: rowIndex, errors: validation.errors });
          results.summary.failed++;
          continue;
        }

        if (validation.warnings.length > 0) {
          results.warnings.push({ row: rowIndex, warnings: validation.warnings });
        }

        // Transformation et calcul DMM
        const data = this.transformAndCalculate(row, source);

        // Gestion des doublons
        const existing = await PeopleGroup.findOne({
          name: data.name,
          country: data.country
        }).session(session);

        if (existing) {
          if (updateExisting) {
            await PeopleGroup.updateOne(
              { _id: existing._id },
              { $set: { ...data, updatedAt: new Date() } },
              { session }
            );
            results.details.updated.push({
              row: rowIndex,
              id: existing._id,
              name: data.name
            });
            results.summary.imported++;
          } else {
            results.summary.skipped++;
          }
        } else {
          documentsToInsert.push(data);
        }

      } catch (error) {
        results.errors.push({
          row: rowIndex,
          errors: [{ message: error.message }]
        });
        results.summary.failed++;
      }
    }

    // Insertion en masse
    if (documentsToInsert.length > 0) {
      const inserted = await PeopleGroup.insertMany(documentsToInsert, {
        session,
        ordered: false
      });

      inserted.forEach(doc => {
        results.details.created.push({
          id: doc._id,
          name: doc.name,
          dmmStatus: doc.dmmStatus,
          dmmLevel: doc.dmmLevel
        });
        results.summary.imported++;
      });
    }
  }

  /**
   * Transforme une ligne et calcule les valeurs DMM
   */
  transformAndCalculate(row, source) {
    const data = {
      name: row.name,
      population: parseInt(row.population, 10) || 0,
      language: row.language,
      religion: row.religion || 'Unknown',
      latitude: parseFloat(row.latitude) || 0,
      longitude: parseFloat(row.longitude) || 0,
      country: row.country,
      region: row.region || '',
      hasEngagement: this.parseBoolean(row.hasengagement),
      hasChurch: this.parseBoolean(row.haschurch),
      churchCount: parseInt(row.churchcount, 10) || 0,
      believerCount: parseInt(row.believercount, 10) || 0,
      hasLeadership: this.parseBoolean(row.hasleadership),
      isMultiplying: this.parseBoolean(row.ismultiplying),
      hasMovement: this.parseBoolean(row.hasmovement),
      importedFrom: source,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calcul automatique DMM
    data.dmmStatus = computeDmmStatus(data);
    data.dmmLevel = computeDmmLevel(data);

    return data;
  }

  /**
   * Initialise la structure des résultats
   */
  initializeResults() {
    return {
      success: false,
      message: '',
      summary: {
        total: 0,
        imported: 0,
        failed: 0,
        skipped: 0
      },
      details: {
        created: [],
        updated: []
      },
      errors: [],
      warnings: []
    };
  }

  /**
   * Valide les lignes sans import
   */
  validateRows(rows) {
    const results = this.initializeResults();
    results.summary.total = rows.length;

    rows.forEach((row, index) => {
      const validation = validatePeopleGroupRow(row, index + 1);
      
      if (!validation.isValid) {
        results.errors.push({ row: index + 1, errors: validation.errors });
        results.summary.failed++;
      } else {
        results.summary.imported++;
      }

      if (validation.warnings.length > 0) {
        results.warnings.push({ row: index + 1, warnings: validation.warnings });
      }
    });

    results.success = results.summary.failed === 0;
    results.message = results.success 
      ? 'Validation réussie' 
      : `${results.summary.failed} erreurs trouvées`;

    return results;
  }

  parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'oui'].includes(value.toLowerCase().trim());
    }
    return Boolean(value);
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = new ImportService();
```

---

## Tests Unitaires

### Tests pour les Fonctions de Calcul DMM

```javascript
// tests/dmmCalculations.test.js
const {
  computeDmmStatus,
  computeDmmStatusWithScore,
  computeDmmLevel,
  computeDmmLevelDetailed
} = require('../utils/dmmCalculations');

describe('DMM Calculations', () => {
  
  // ============================================
  // Tests pour computeDmmStatus
  // ============================================
  describe('computeDmmStatus', () => {
    
    describe('Statut "unreached"', () => {
      test('retourne "unreached" pour données vides', () => {
        expect(computeDmmStatus({})).toBe('unreached');
      });

      test('retourne "unreached" pour null', () => {
        expect(computeDmmStatus(null)).toBe('unreached');
      });

      test('retourne "unreached" pour undefined', () => {
        expect(computeDmmStatus(undefined)).toBe('unreached');
      });

      test('retourne "unreached" quand tous les champs sont false', () => {
        const data = {
          hasEngagement: false,
          hasChurch: false,
          churchCount: 0,
          hasLeadership: false,
          isMultiplying: false,
          hasMovement: false
        };
        expect(computeDmmStatus(data)).toBe('unreached');
      });
    });

    describe('Statut "formative"', () => {
      test('retourne "formative" avec seulement hasEngagement', () => {
        const data = { hasEngagement: true };
        expect(computeDmmStatus(data)).toBe('formative');
      });

      test('retourne "formative" avec engagement et début d\'église', () => {
        const data = {
          hasEngagement: true,
          hasChurch: true,
          churchCount: 0
        };
        expect(computeDmmStatus(data)).toBe('formative');
      });

      test('retourne "formative" avec engagement et churchCount > 0 mais pas de leadership', () => {
        const data = {
          hasEngagement: true,
          hasChurch: true,
          churchCount: 1,
          hasLeadership: false
        };
        expect(computeDmmStatus(data)).toBe('formative');
      });
    });

    describe('Statut "established"', () => {
      test('retourne "established" avec église et leadership', () => {
        const data = {
          hasEngagement: true,
          hasChurch: true,
          churchCount: 1,
          hasLeadership: true,
          isMultiplying: false
        };
        expect(computeDmmStatus(data)).toBe('established');
      });

      test('retourne "established" avec plusieurs églises et leadership', () => {
        const data = {
          hasEngagement: true,
          hasChurch: true,
          churchCount: 3,
          hasLeadership: true,
          isMultiplying: false,
          hasMovement: false
        };
        expect(computeDmmStatus(data)).toBe('established');
      });
    });

    describe('Statut "multiplying"', () => {
      test('retourne "multiplying" avec mouvement actif', () => {
        const data = {
          hasEngagement: true,
          hasChurch: true,
          churchCount: 5,
          hasLeadership: true,
          isMultiplying: true,
          hasMovement: true
        };
        expect(computeDmmStatus(data)).toBe('multiplying');
      });

      test('retourne "established" si mouvement mais churchCount < 4', () => {
        const data = {
          hasEngagement: true,
          hasChurch: true,
          churchCount: 3,
          hasLeadership: true,
          isMultiplying: true,
          hasMovement: true
        };
        expect(computeDmmStatus(data)).toBe('established');
      });

      test('retourne "multiplying" avec exactement 4 églises', () => {
        const data = {
          hasEngagement: true,
          hasChurch: true,
          churchCount: 4,
          hasLeadership: true,
          isMultiplying: true,
          hasMovement: true
        };
        expect(computeDmmStatus(data)).toBe('multiplying');
      });
    });
  });

  // ============================================
  // Tests pour computeDmmLevel
  // ============================================
  describe('computeDmmLevel', () => {
    
    test('retourne 0 pour données vides', () => {
      expect(computeDmmLevel({})).toBe(0);
    });

    test('retourne 0 pour null', () => {
      expect(computeDmmLevel(null)).toBe(0);
    });

    test('retourne 1 pour engagement initial', () => {
      const data = { hasEngagement: true };
      expect(computeDmmLevel(data)).toBe(1);
    });

    test('retourne 2 pour formation active', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        believerCount: 15
      };
      expect(computeDmmLevel(data)).toBe(2);
    });

    test('retourne 2 avec believerCount >= 10 même sans église', () => {
      const data = {
        hasEngagement: true,
        hasChurch: false,
        believerCount: 10
      };
      expect(computeDmmLevel(data)).toBe(2);
    });

    test('retourne 3 pour église naissante avec leadership', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        churchCount: 1,
        hasLeadership: true
      };
      expect(computeDmmLevel(data)).toBe(3);
    });

    test('retourne 4 pour église établie avec multiplication', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        churchCount: 2,
        hasLeadership: true,
        isMultiplying: true
      };
      expect(computeDmmLevel(data)).toBe(4);
    });

    test('retourne 5 pour mouvement complet', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        churchCount: 5,
        hasLeadership: true,
        isMultiplying: true,
        hasMovement: true,
        believerCount: 500,
        population: 10000
      };
      expect(computeDmmLevel(data)).toBe(5);
    });

    test('retourne 4 si mouvement mais ratio croyants insuffisant', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        churchCount: 5,
        hasLeadership: true,
        isMultiplying: true,
        hasMovement: true,
        believerCount: 100,
        population: 100000 // ratio = 0.1%
      };
      expect(computeDmmLevel(data)).toBe(4);
    });
  });

  // ============================================
  // Tests pour computeDmmLevelDetailed
  // ============================================
  describe('computeDmmLevelDetailed', () => {
    
    test('retourne les détails complets pour niveau 0', () => {
      const result = computeDmmLevelDetailed({});
      
      expect(result.level).toBe(0);
      expect(result.name).toBe('Non atteint');
      expect(result.color).toBe('#dc3545');
      expect(result.nextSteps).toHaveLength(3);
      expect(result.metrics).toBeDefined();
    });

    test('retourne les détails complets pour niveau 3', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        churchCount: 1,
        hasLeadership: true
      };
      const result = computeDmmLevelDetailed(data);
      
      expect(result.level).toBe(3);
      expect(result.name).toBe('Église naissante');
      expect(result.color).toBe('#20c997');
      expect(result.metrics.hasChurch).toBe(true);
      expect(result.metrics.hasLeadership).toBe(true);
    });

    test('inclut les métriques correctes', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        churchCount: 3,
        believerCount: 50
      };
      const result = computeDmmLevelDetailed(data);
      
      expect(result.metrics.hasEngagement).toBe(true);
      expect(result.metrics.churchCount).toBe(3);
      expect(result.metrics.believerCount).toBe(50);
    });
  });

  // ============================================
  // Tests pour computeDmmStatusWithScore
  // ============================================
  describe('computeDmmStatusWithScore', () => {
    
    test('retourne le score détaillé', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        churchCount: 2,
        hasLeadership: true
      };
      const result = computeDmmStatusWithScore(data);
      
      expect(result.status).toBeDefined();
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.engagement).toBe(1);
      expect(result.breakdown.church).toBe(2);
      expect(result.breakdown.leadership).toBe(3);
    });

    test('calcule le score correctement pour unreached', () => {
      const result = computeDmmStatusWithScore({});
      
      expect(result.status).toBe('unreached');
      expect(result.totalScore).toBe(0);
    });

    test('calcule le score correctement pour multiplying', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        churchCount: 10,
        hasLeadership: true,
        isMultiplying: true,
        hasMovement: true
      };
      const result = computeDmmStatusWithScore(data);
      
      expect(result.status).toBe('multiplying');
      expect(result.totalScore).toBeGreaterThanOrEqual(12);
    });
  });
});
```

### Tests pour la Validation

```javascript
// tests/validation.test.js
const {
  validatePeopleGroupRow,
  validateDmmData,
  parseBoolean
} = require('../utils/validation');

describe('Validation', () => {
  
  // ============================================
  // Tests pour validatePeopleGroupRow
  // ============================================
  describe('validatePeopleGroupRow', () => {
    
    const validRow = {
      name: 'Test Group',
      population: '50000',
      language: 'French',
      latitude: '14.6937',
      longitude: '-17.4441',
      country: 'Senegal'
    };

    test('valide une ligne correcte', () => {
      const result = validatePeopleGroupRow(validRow, 1);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('échoue si le nom est manquant', () => {
      const row = { ...validRow, name: '' };
      const result = validatePeopleGroupRow(row, 1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    test('échoue si la population n\'est pas un nombre', () => {
      const row = { ...validRow, population: 'abc' };
      const result = validatePeopleGroupRow(row, 1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'population')).toBe(true);
    });

    test('échoue si la latitude est hors limites', () => {
      const row = { ...validRow, latitude: '100' };
      const result = validatePeopleGroupRow(row, 1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'latitude')).toBe(true);
    });

    test('échoue si la longitude est hors limites', () => {
      const row = { ...validRow, longitude: '-200' };
      const result = validatePeopleGroupRow(row, 1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'longitude')).toBe(true);
    });

    test('avertit si coordonnées à (0, 0)', () => {
      const row = { ...validRow, latitude: '0', longitude: '0' };
      const result = validatePeopleGroupRow(row, 1);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'ZERO_COORDINATES')).toBe(true);
    });

    test('avertit si believerCount > population', () => {
      const row = {
        ...validRow,
        population: '1000',
        believercount: '2000'
      };
      const result = validatePeopleGroupRow(row, 1);
      
      expect(result.warnings.some(w => w.code === 'BELIEVER_EXCEEDS_POPULATION')).toBe(true);
    });

    test('avertit si hasChurch mais churchCount = 0', () => {
      const row = {
        ...validRow,
        haschurch: 'true',
        churchcount: '0'
      };
      const result = validatePeopleGroupRow(row, 1);
      
      expect(result.warnings.some(w => w.code === 'INCONSISTENT_DATA')).toBe(true);
    });
  });

  // ============================================
  // Tests pour validateDmmData
  // ============================================
  describe('validateDmmData', () => {
    
    test('valide des données DMM cohérentes', () => {
      const data = {
        hasEngagement: true,
        hasChurch: true,
        churchCount: 2,
        hasLeadership: true,
        isMultiplying: false,
        hasMovement: false
      };
      const result = validateDmmData(data);
      
      expect(result.isValid).toBe(true);
    });

    test('échoue si isMultiplying sans hasChurch', () => {
      const data = {
        hasChurch: false,
        isMultiplying: true
      };
      const result = validateDmmData(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'isMultiplying')).toBe(true);
    });

    test('échoue si hasMovement sans isMultiplying', () => {
      const data = {
        hasChurch: true,
        isMultiplying: false,
        hasMovement: true
      };
      const result = validateDmmData(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'hasMovement')).toBe(true);
    });

    test('avertit si hasLeadership sans hasChurch', () => {
      const data = {
        hasChurch: false,
        hasLeadership: true
      };
      const result = validateDmmData(data);
      
      expect(result.warnings.some(w => w.field === 'hasLeadership')).toBe(true);
    });

    test('avertit si churchCount > 0 mais hasChurch false', () => {
      const data = {
        hasChurch: false,
        churchCount: 5
      };
      const result = validateDmmData(data);
      
      expect(result.warnings.some(w => w.code === 'INCONSISTENT_CHURCH_DATA')).toBe(true);
    });
  });

  // ============================================
  // Tests pour parseBoolean
  // ============================================
  describe('parseBoolean', () => {
    
    test('retourne true pour "true"', () => {
      expect(parseBoolean('true')).toBe(true);
    });

    test('retourne true pour "TRUE"', () => {
      expect(parseBoolean('TRUE')).toBe(true);
    });

    test('retourne true pour "1"', () => {
      expect(parseBoolean('1')).toBe(true);
    });

    test('retourne true pour "yes"', () => {
      expect(parseBoolean('yes')).toBe(true);
    });

    test('retourne true pour "oui"', () => {
      expect(parseBoolean('oui')).toBe(true);
    });

    test('retourne false pour "false"', () => {
      expect(parseBoolean('false')).toBe(false);
    });

    test('retourne false pour "0"', () => {
      expect(parseBoolean('0')).toBe(false);
    });

    test('retourne false pour chaîne vide', () => {
      expect(parseBoolean('')).toBe(false);
    });

    test('retourne true pour booléen true', () => {
      expect(parseBoolean(true)).toBe(true);
    });

    test('retourne false pour booléen false', () => {
      expect(parseBoolean(false)).toBe(false);
    });
  });
});
```

### Tests d'Intégration pour l'Import

```javascript
// tests/integration/import.test.js
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');
const PeopleGroup = require('../../models/PeopleGroup');

describe('Import CSV Integration Tests', () => {
  
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await PeopleGroup.deleteMany({});
  });

  describe('POST /api/people-groups/import', () => {
    
    test('importe un fichier CSV valide', async () => {
      const csvContent = `name,population,language,latitude,longitude,country,hasEngagement,hasChurch,churchCount
"Test Group",50000,"French",14.6937,-17.4441,"Senegal",true,true,2`;

      const response = await request(app)
        .post('/api/people-groups/import')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary.imported).toBe(1);

      // Vérifier que le groupe a été créé avec les calculs DMM
      const group = await PeopleGroup.findOne({ name: 'Test Group' });
      expect(group).toBeDefined();
      expect(group.dmmStatus).toBe('formative');
      expect(group.dmmLevel).toBe(2);
    });

    test('rejette un fichier non-CSV', async () => {
      const response = await request(app)
        .post('/api/people-groups/import')
        .attach('file', Buffer.from('not csv'), 'test.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('gère les erreurs de validation', async () => {
      const csvContent = `name,population,language,latitude,longitude,country
"",invalid,"",-100,200,""`;

      const response = await request(app)
        .post('/api/people-groups/import')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(200);

      expect(response.body.summary.failed).toBe(1);
      expect(response.body.details.errors.length).toBeGreaterThan(0);
    });

    test('met à jour les groupes existants si updateExisting=true', async () => {
      // Créer un groupe existant
      await PeopleGroup.create({
        name: 'Existing Group',
        population: 10000,
        language: 'French',
        latitude: 14.6937,
        longitude: -17.4441,
        country: 'Senegal',
        hasEngagement: false,
        dmmStatus: 'unreached',
        dmmLevel: 0
      });

      const csvContent = `name,population,language,latitude,longitude,country,hasEngagement,hasChurch,churchCount,hasLeadership
"Existing Group",50000,"French",14.6937,-17.4441,"Senegal",true,true,3,true`;

      const response = await request(app)
        .post('/api/people-groups/import')
        .field('updateExisting', 'true')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(200);

      expect(response.body.summary.imported).toBe(1);

      // Vérifier la mise à jour
      const group = await PeopleGroup.findOne({ name: 'Existing Group' });
      expect(group.population).toBe(50000);
      expect(group.dmmStatus).toBe('established');
      expect(group.dmmLevel).toBe(3);
    });

    test('ignore les doublons si updateExisting=false', async () => {
      await PeopleGroup.create({
        name: 'Existing Group',
        population: 10000,
        language: 'French',
        latitude: 14.6937,
        longitude: -17.4441,
        country: 'Senegal'
      });

      const csvContent = `name,population,language,latitude,longitude,country
"Existing Group",50000,"French",14.6937,-17.4441,"Senegal"`;

      const response = await request(app)
        .post('/api/people-groups/import')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(200);

      expect(response.body.summary.skipped).toBe(1);

      // Vérifier que la population n'a pas changé
      const group = await PeopleGroup.findOne({ name: 'Existing Group' });
      expect(group.population).toBe(10000);
    });

    test('effectue un rollback en cas d\'erreur critique', async () => {
      // Ce test simule une erreur de base de données
      // En production, vous utiliseriez un mock pour simuler l'erreur
      
      const csvContent = `name,population,language,latitude,longitude,country
"Group 1",50000,"French",14.6937,-17.4441,"Senegal"
"Group 2",30000,"Wolof",14.7645,-17.3660,"Senegal"`;

      // Simuler une erreur après le premier insert
      // (nécessite un mock de mongoose)
      
      // Vérifier qu'aucun groupe n'a été créé après rollback
      const count = await PeopleGroup.countDocuments();
      expect(count).toBe(0);
    });
  });
});
```

---

## Cas Limites et Dépannage

### Cas Limites Courants

```javascript
// utils/edgeCases.js

/**
 * Gestion des cas limites pour les calculs DMM
 */

// Cas 1: Données partiellement manquantes
function handlePartialData(data) {
  // Utiliser des valeurs par défaut sûres
  return {
    hasEngagement: data.hasEngagement ?? false,
    hasChurch: data.hasChurch ?? false,
    churchCount: Math.max(0, parseInt(data.churchCount, 10) || 0),
    believerCount: Math.max(0, parseInt(data.believerCount, 10) || 0),
    hasLeadership: data.hasLeadership ?? false,
    isMultiplying: data.isMultiplying ?? false,
    hasMovement: data.hasMovement ?? false,
    population: Math.max(0, parseInt(data.population, 10) || 0)
  };
}

// Cas 2: Incohérences dans les données
function detectInconsistencies(data) {
  const issues = [];

  // churchCount > 0 mais hasChurch = false
  if (data.churchCount > 0 && !data.hasChurch) {
    issues.push({
      type: 'warning',
      field: 'hasChurch',
      message: 'churchCount > 0 mais hasChurch est false',
      suggestion: 'Définir hasChurch = true'
    });
  }

  // isMultiplying = true mais churchCount < 2
  if (data.isMultiplying && data.churchCount < 2) {
    issues.push({
      type: 'warning',
      field: 'isMultiplying',
      message: 'isMultiplying est true mais churchCount < 2',
      suggestion: 'Vérifier si la multiplication est réelle'
    });
  }

  // hasMovement = true mais pas de multiplication
  if (data.hasMovement && !data.isMultiplying) {
    issues.push({
      type: 'error',
      field: 'hasMovement',
      message: 'hasMovement ne peut être true sans isMultiplying',
      suggestion: 'Définir isMultiplying = true ou hasMovement = false'
    });
  }

  // believerCount > population
  if (data.believerCount > data.population && data.population > 0) {
    issues.push({
      type: 'error',
      field: 'believerCount',
      message: 'believerCount dépasse la population totale',
      suggestion: 'Corriger believerCount ou population'
    });
  }

  // Coordonnées invalides
  if (data.latitude === 0 && data.longitude === 0) {
    issues.push({
      type: 'warning',
      field: 'coordinates',
      message: 'Coordonnées à (0, 0) - probablement incorrect',
      suggestion: 'Vérifier les coordonnées géographiques'
    });
  }

  return issues;
}

// Cas 3: Correction automatique des incohérences
function autoCorrectData(data) {
  const corrected = { ...data };
  const corrections = [];

  // Si churchCount > 0, hasChurch devrait être true
  if (corrected.churchCount > 0 && !corrected.hasChurch) {
    corrected.hasChurch = true;
    corrections.push('hasChurch défini à true (churchCount > 0)');
  }

  // Si hasChurch = true et churchCount = 0, définir churchCount = 1
  if (corrected.hasChurch && corrected.churchCount === 0) {
    corrected.churchCount = 1;
    corrections.push('churchCount défini à 1 (hasChurch = true)');
  }

  // Si isMultiplying = true, hasChurch doit être true
  if (corrected.isMultiplying && !corrected.hasChurch) {
    corrected.hasChurch = true;
    corrections.push('hasChurch défini à true (isMultiplying = true)');
  }

  // Si hasMovement = true, isMultiplying doit être true
  if (corrected.hasMovement && !corrected.isMultiplying) {
    corrected.isMultiplying = true;
    corrections.push('isMultiplying défini à true (hasMovement = true)');
  }

  // Limiter believerCount à population
  if (corrected.believerCount > corrected.population && corrected.population > 0) {
    corrected.believerCount = corrected.population;
    corrections.push(`believerCount limité à population (${corrected.population})`);
  }

  return {
    data: corrected,
    corrections,
    wasModified: corrections.length > 0
  };
}

// Cas 4: Gestion des valeurs nulles dans les calculs
function safeCompute(data) {
  // Nettoyer les données avant calcul
  const cleanData = handlePartialData(data);
  
  // Détecter les problèmes
  const issues = detectInconsistencies(cleanData);
  
  // Corriger automatiquement si nécessaire
  const { data: correctedData, corrections } = autoCorrectData(cleanData);
  
  return {
    cleanData: correctedData,
    issues,
    corrections
  };
}

module.exports = {
  handlePartialData,
  detectInconsistencies,
  autoCorrectData,
  safeCompute
};
```

### Guide de Dépannage

```javascript
/**
 * GUIDE DE DÉPANNAGE - PROBLÈMES COURANTS
 * =======================================
 */

/**
 * Problème 1: Import échoue silencieusement
 * -----------------------------------------
 * Symptôme: L'import retourne succès mais aucun groupe n'est créé
 * 
 * Causes possibles:
 * 1. Tous les groupes existent déjà (doublons)
 * 2. Toutes les lignes ont des erreurs de validation
 * 3. Transaction annulée mais erreur non propagée
 * 
 * Solution:
 */
async function debugImport(results) {
  console.log('=== DEBUG IMPORT ===');
  console.log('Total lignes:', results.summary.total);
  console.log('Importés:', results.summary.imported);
  console.log('Échoués:', results.summary.failed);
  console.log('Ignorés:', results.summary.skipped);
  
  if (results.errors.length > 0) {
    console.log('\nErreurs détaillées:');
    results.errors.forEach(err => {
      console.log(`  Ligne ${err.row}:`, err.errors);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\nAvertissements:');
    results.warnings.forEach(warn => {
      console.log(`  Ligne ${warn.row}:`, warn.warnings || warn.message);
    });
  }
}

/**
 * Problème 2: Calcul DMM incorrect
 * --------------------------------
 * Symptôme: Le statut ou niveau DMM ne correspond pas aux attentes
 * 
 * Solution: Utiliser la fonction de diagnostic
 */
function diagnoseDmmCalculation(data) {
  const { computeDmmStatus, computeDmmLevel, computeDmmLevelDetailed } = require('./dmmCalculations');
  const { detectInconsistencies } = require('./edgeCases');
  
  console.log('=== DIAGNOSTIC DMM ===');
  console.log('Données entrée:', JSON.stringify(data, null, 2));
  
  // Vérifier les incohérences
  const issues = detectInconsistencies(data);
  if (issues.length > 0) {
    console.log('\nIncohérences détectées:');
    issues.forEach(issue => {
      console.log(`  [${issue.type}] ${issue.field}: ${issue.message}`);
      console.log(`    Suggestion: ${issue.suggestion}`);
    });
  }
  
  // Calculer et afficher les résultats
  const status = computeDmmStatus(data);
  const level = computeDmmLevel(data);
  const detailed = computeDmmLevelDetailed(data);
  
  console.log('\nRésultats:');
  console.log('  Statut:', status);
  console.log('  Niveau:', level);
  console.log('  Détails:', detailed.name);
  console.log('  Prochaines étapes:', detailed.nextSteps);
  
  return { status, level, detailed, issues };
}

/**
 * Problème 3: Erreur de transaction MongoDB
 * -----------------------------------------
 * Symptôme: "Transaction has been aborted" ou "WriteConflict"
 * 
 * Causes possibles:
 * 1. Timeout de transaction (défaut: 60s)
 * 2. Conflit d'écriture concurrent
 * 3. Replica set non configuré
 * 
 * Solution:
 */
async function robustTransaction(operation) {
  const MAX_RETRIES = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority', wtimeout: 30000 },
        maxCommitTimeMS: 60000
      });
      
      const result = await operation(session);
      
      await session.commitTransaction();
      return result;
      
    } catch (error) {
      await session.abortTransaction();
      lastError = error;
      
      // Retry seulement pour les erreurs transitoires
      if (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError')) {
        console.log(`Tentative ${attempt}/${MAX_RETRIES} échouée, retry...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      throw error;
      
    } finally {
      session.endSession();
    }
  }
  
  throw lastError;
}

/**
 * Problème 4: Performance lente sur gros imports
 * ----------------------------------------------
 * Symptôme: Import de >1000 lignes prend plusieurs minutes
 * 
 * Solutions:
 */
const performanceOptimizations = {
  // 1. Augmenter la taille des lots
  batchSize: 500, // au lieu de 100
  
  // 2. Désactiver la validation Mongoose pour les imports en masse
  insertOptions: {
    ordered: false,
    lean: true,
    rawResult: true
  },
  
  // 3. Utiliser bulkWrite au lieu de insertMany
  async bulkImport(documents, session) {
    const operations = documents.map(doc => ({
      updateOne: {
        filter: { name: doc.name, country: doc.country },
        update: { $set: doc },
        upsert: true
      }
    }));
    
    return await PeopleGroup.bulkWrite(operations, { session });
  },
  
  // 4. Indexer les champs de recherche
  async ensureIndexes() {
    await PeopleGroup.collection.createIndex(
      { name: 1, country: 1 },
      { unique: true }
    );
    await PeopleGroup.collection.createIndex({ dmmStatus: 1 });
    await PeopleGroup.collection.createIndex({ dmmLevel: 1 });
  }
};

/**
 * Problème 5: Encodage CSV incorrect
 * ----------------------------------
 * Symptôme: Caractères spéciaux (accents) mal affichés
 * 
 * Solution:
 */
function parseCSVWithEncoding(buffer) {
  // Détecter l'encodage
  const chardet = require('chardet');
  const iconv = require('iconv-lite');
  
  const encoding = chardet.detect(buffer) || 'utf-8';
  console.log('Encodage détecté:', encoding);
  
  // Convertir en UTF-8 si nécessaire
  let content;
  if (encoding.toLowerCase() !== 'utf-8') {
    content = iconv.decode(buffer, encoding);
  } else {
    content = buffer.toString('utf-8');
  }
  
  // Supprimer le BOM si présent
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  return content;
}

module.exports = {
  debugImport,
  diagnoseDmmCalculation,
  robustTransaction,
  performanceOptimizations,
  parseCSVWithEncoding
};
```

---

## Annexes

### A. Schéma Complet du Modèle PeopleGroup

```javascript
// models/PeopleGroup.js - Version complète
const mongoose = require('mongoose');

const peopleGroupSchema = new mongoose.Schema({
  // Identité
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [200, 'Le nom ne peut pas dépasser 200 caractères']
  },
  alternateNames: [String],
  
  // Démographie
  population: {
    type: Number,
    required: [true, 'La population est requise'],
    min: [0, 'La population doit être positive']
  },
  language: {
    type: String,
    required: [true, 'La langue est requise'],
    trim: true
  },
  religion: {
    type: String,
    default: 'Unknown',
    trim: true
  },
  
  // Géographie
  latitude: {
    type: Number,
    required: [true, 'La latitude est requise'],
    min: [-90, 'Latitude invalide'],
    max: [90, 'Latitude invalide']
  },
  longitude: {
    type: Number,
    required: [true, 'La longitude est requise'],
    min: [-180, 'Longitude invalide'],
    max: [180, 'Longitude invalide']
  },
  country: {
    type: String,
    required: [true, 'Le pays est requis'],
    trim: true
  },
  region: {
    type: String,
    trim: true
  },
  
  // Métriques DMM
  hasEngagement: { type: Boolean, default: false },
  hasChurch: { type: Boolean, default: false },
  churchCount: { type: Number, default: 0, min: 0 },
  believerCount: { type: Number, default: 0, min: 0 },
  hasLeadership: { type: Boolean, default: false },
  isMultiplying: { type: Boolean, default: false },
  hasMovement: { type: Boolean, default: false },
  
  // Valeurs calculées
  dmmStatus: {
    type: String,
    enum: ['unreached', 'formative', 'established', 'multiplying'],
    default: 'unreached'
  },
  dmmLevel: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  
  // Métadonnées
  importedFrom: String,
  importBatchId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index composé pour éviter les doublons
peopleGroupSchema.index({ name: 1, country: 1 }, { unique: true });

// Index pour les recherches fréquentes
peopleGroupSchema.index({ dmmStatus: 1 });
peopleGroupSchema.index({ dmmLevel: 1 });
peopleGroupSchema.index({ country: 1 });
peopleGroupSchema.index({ language: 1 });

// Index géospatial
peopleGroupSchema.index({ latitude: 1, longitude: 1 });

// Middleware pre-save pour recalculer DMM
peopleGroupSchema.pre('save', function(next) {
  const { computeDmmStatus, computeDmmLevel } = require('../utils/dmmCalculations');
  
  this.dmmStatus = computeDmmStatus(this);
  this.dmmLevel = computeDmmLevel(this);
  this.updatedAt = new Date();
  
  next();
});

// Méthode virtuelle pour le ratio de croyants
peopleGroupSchema.virtual('believerRatio').get(function() {
  if (this.population === 0) return 0;
  return (this.believerCount / this.population * 100).toFixed(2);
});

module.exports = mongoose.model('PeopleGroup', peopleGroupSchema);
```

### B. Configuration Recommandée

```javascript
// config/database.js
module.exports = {
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },
  import: {
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    maxRows: 10000,
    batchSize: 100,
    allowedMimeTypes: ['text/csv', 'application/csv']
  }
};
```

---

## Conclusion

Ce guide fournit une implémentation complète de la logique DMM pour le backend de l'application Church Planting Map. Les points clés à retenir sont:

1. **Calculs DMM**: Utilisez `computeDmmStatus` et `computeDmmLevel` pour calculer automatiquement les valeurs DMM
2. **Validation**: Validez toujours les données avant l'import avec `validatePeopleGroupRow`
3. **Transactions**: Utilisez les transactions MongoDB pour garantir l'intégrité des imports en masse
4. **Gestion d'erreurs**: Implémentez une gestion d'erreurs robuste avec des messages clairs
5. **Tests**: Écrivez des tests unitaires et d'intégration pour chaque fonction

Pour toute question ou amélioration, consultez la documentation de l'API ou contactez l'équipe de développement.
