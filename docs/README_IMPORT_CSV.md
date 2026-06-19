# 🚀 Guide de Démarrage Rapide - Import CSV

## 📋 Vue d'ensemble

Fonctionnalité d'import CSV permettant de charger des données d'églises en masse dans l'application Church Planting Map. Supporte la validation des données, la gestion des erreurs, et l'intégration avec l'API existante.

---

## 📁 Fichiers créés

| Fichier | Description |
|---------|-------------|
| `backend/src/routes/csv.routes.js` | Routes API pour l'upload et le traitement CSV |
| `backend/src/controllers/csv.controller.js` | Logique métier pour l'import CSV |
| `backend/src/services/csv.service.js` | Service de parsing et validation CSV |
| `backend/src/middleware/upload.middleware.js` | Middleware Multer pour l'upload de fichiers |
| `backend/src/utils/csv.validator.js` | Validateurs pour les données CSV |
| `backend/tests/csv.test.js` | Tests unitaires et d'intégration |
| `docs/CSV_IMPORT_API.md` | Documentation technique complète de l'API |
| `docs/CSV_FORMAT_SPEC.md` | Spécification du format CSV attendu |
| `sample-data/churches-import-template.csv` | Modèle CSV avec exemples |

---

## ⚡ Démarrage en 3 étapes

### 1️⃣ Préparer votre fichier CSV
```bash
# Utiliser le fichier de référence "Import CSV.csv" (délimiteur: point-virgule)
# Note: Ce fichier utilise des point-virgules (;) comme délimiteur
cp "Import CSV.csv" mon-import.csv
# Éditer avec vos données
```

### 2️⃣ Lancer le serveur
```bash
cd backend
npm install
npm run dev
```

### 3️⃣ Tester l'import
```bash
# Via cURL
curl -X POST http://localhost:3000/api/csv/upload \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -F "file=@mon-import.csv"

# Ou utiliser Postman (collection fournie)
```

---

## 📚 Documentation détaillée

- **[API Documentation](docs/CSV_IMPORT_API.md)** - Endpoints, paramètres, exemples de réponses
- **[Format CSV](docs/CSV_FORMAT_SPEC.md)** - Structure, colonnes requises, règles de validation
- **[Tests](backend/tests/csv.test.js)** - Exemples d'utilisation et cas de test

---

## ⚠️ Problèmes courants

| Problème | Solution |
|----------|----------|
| **Erreur 401 Unauthorized** | Vérifier que le token JWT est valide et inclus dans le header `Authorization: Bearer TOKEN` |
| **Erreur "Invalid CSV format"** | Vérifier que le fichier contient les colonnes requises : `name`, `latitude`, `longitude`. Le fichier "Import CSV.csv" utilise des point-virgules (;) comme délimiteur |
| **Erreur "File too large"** | Limite de 5MB par fichier. Diviser en plusieurs fichiers si nécessaire |
| **Coordonnées invalides** | Latitude: -90 à 90, Longitude: -180 à 180 |
| **Encodage incorrect** | Utiliser UTF-8 pour les caractères spéciaux |
| **Délimiteur incorrect** | Le système détecte automatiquement les délimiteurs (virgule ou point-virgule). "Import CSV.csv" utilise des point-virgules (;) |

---

## 🎯 Prochaines étapes

### Pour le développement
- [ ] Tester avec vos propres données
- [ ] Consulter les logs pour le débogage : `backend/logs/`
- [ ] Exécuter les tests : `npm test`

### Pour la production
- [ ] Configurer les variables d'environnement (voir `.env.example`)
- [ ] Augmenter les limites de fichiers si nécessaire
- [ ] Mettre en place la surveillance des erreurs
- [ ] Configurer les sauvegardes de la base de données
- [ ] Ajouter la limitation de débit (rate limiting)

---

## 🆘 Support

- **Issues GitHub** : Créer une issue pour les bugs ou demandes de fonctionnalités
- **Documentation API** : Voir `docs/CSV_IMPORT_API.md`
- **Tests** : Consulter `backend/tests/csv.test.js` pour des exemples

---

## ✅ Checklist de validation

Avant de déployer en production :

- [ ] Tests unitaires passent (`npm test`)
- [ ] Import d'un fichier CSV de test réussi
- [ ] Validation des erreurs fonctionne correctement
- [ ] Authentification configurée
- [ ] Logs configurés et accessibles
- [ ] Limites de fichiers appropriées
- [ ] Documentation à jour

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2024
