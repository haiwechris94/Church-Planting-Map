/**
 * Script to update translations.js and MapView.jsx
 * - Adds new translation keys for i18n
 * - Fixes Gabon people groups not showing (selectedCountries default)
 * - Replaces hardcoded French text with t() calls
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// PART 1: Update translations.js
// ============================================================================

const translationsPath = path.join(__dirname, '../frontend/src/i18n/translations.js');
let translationsContent = fs.readFileSync(translationsPath, 'utf8');

// New keys to add to en.peopleMap (after existing keys, before closing brace)
const enPeopleMapNewKeys = `
      selectCountries: 'Select countries...',
      allCountries: 'All countries',
      addPeople: 'Add a people group',
      newPeople: 'New People Group',
      clickMapInstruction: 'Click on the map to place the people group',
      dataType: 'Data type',
      orgData: 'Organization',
      orgDataDesc: 'Your org data',
      surveyData: 'Survey',
      surveyDataDesc: 'Survey data',
      peopleName: 'People group name',
      village: 'Village',
      searchVillage: 'Search a village...',
      numberOfChurches: 'Number of churches',
      churchGeneration: 'Church generation',
      engagementStatus: 'Engagement status',
      engagementLevel: 'Engagement level (optional)',
      population: 'Population (optional)',
      country: 'Country',
      region: 'Region (optional)',
      description: 'Description (optional)',
      descriptionPlaceholder: 'Additional information...',
      adding: 'Adding...',
      deleteConfirmTitle: 'Delete people group',
      deleteConfirmMessage: 'Are you sure you want to delete',
      deleteConfirmWarning: 'This action is irreversible.',
      viewDetails: 'View details',
      deletePeople: 'Delete this people group',
      clearFilters: 'Clear filters',
      noCountryFilter: 'No country filter (all)',
      allRegions: 'All regions',
      allDepartments: 'All departments',
      allArrondissements: 'All arrondissements',
      showDMM: 'Show/Hide DMM data',
      showSurvey: 'Show/Hide Survey data',
      showJP: 'Show/Hide Joshua Project data',
      peoples: 'Peoples',
      churches: 'churches',
      myLocation: 'My location',
      fitAll: 'View all peoples',
      paginationPage: 'Page',
      loading: 'Loading...',
      records: 'records',
      niveau: 'Level',
      locationError: 'Unable to get your location',
      noVillageFound: 'No village found. Please select an existing village.',
      noVillageAvailable: 'No village available',
      autoCalculatedStatus: 'Auto-calculated status',
      basedOnDMM: '(based on DMM table)',
      peopleStatus: 'People status',
      peopleLevel: 'People level',
      coordinates: 'Coordinates',`;

// New keys to add to fr.peopleMap
const frPeopleMapNewKeys = `
      selectCountries: 'Sélectionner des pays...',
      allCountries: 'Tous les pays',
      addPeople: 'Ajouter un peuple',
      newPeople: 'Nouveau Peuple',
      clickMapInstruction: 'Cliquez sur la carte pour placer le peuple',
      dataType: 'Type de données',
      orgData: 'Organisation',
      orgDataDesc: 'Données de votre org.',
      surveyData: 'Enquête',
      surveyDataDesc: 'Données de terrain',
      peopleName: 'Nom du peuple',
      village: 'Village',
      searchVillage: 'Rechercher un village...',
      numberOfChurches: 'Nombre d\\'églises',
      churchGeneration: 'Génération d\\'église',
      engagementStatus: 'Statut d\\'engagement',
      engagementLevel: 'Niveau d\\'engagement (optionnel)',
      population: 'Population (optionnel)',
      country: 'Pays',
      region: 'Région (optionnel)',
      description: 'Description (optionnel)',
      descriptionPlaceholder: 'Informations supplémentaires...',
      adding: 'Ajout en cours...',
      deleteConfirmTitle: 'Supprimer le peuple',
      deleteConfirmMessage: 'Êtes-vous sûr de vouloir supprimer',
      deleteConfirmWarning: 'Cette action est irréversible.',
      viewDetails: 'Voir les détails',
      deletePeople: 'Supprimer ce peuple',
      clearFilters: 'Effacer les filtres',
      noCountryFilter: 'Aucun filtre pays (tous)',
      allRegions: 'Toutes les régions',
      allDepartments: 'Tous les départements',
      allArrondissements: 'Tous les arrondissements',
      showDMM: 'Afficher/Masquer les données DMM',
      showSurvey: 'Afficher/Masquer les données Survey',
      showJP: 'Afficher/Masquer les données Joshua Project',
      peoples: 'Peuples',
      churches: 'églises',
      myLocation: 'Ma position',
      fitAll: 'Voir tous les peuples',
      paginationPage: 'Page',
      loading: 'Chargement...',
      records: 'enregistrements',
      niveau: 'Niveau',
      locationError: 'Impossible d\\'obtenir votre position',
      noVillageFound: 'Aucun village trouvé. Veuillez sélectionner un village existant.',
      noVillageAvailable: 'Aucun village disponible',
      autoCalculatedStatus: 'Statut calculé automatiquement',
      basedOnDMM: '(basé sur le tableau DMM)',
      peopleStatus: 'Statut du peuple',
      peopleLevel: 'Niveau du peuple',
      coordinates: 'Coordonnées',`;

// New keys to add to en.common
const enCommonNewKeys = `
      noFilter: 'No filter',
      allItems: 'All',
      clearAll: 'Clear all',
      selectAll: 'Select all',`;

// New keys to add to fr.common
const frCommonNewKeys = `
      noFilter: 'Aucun filtre',
      allItems: 'Tous',
      clearAll: 'Tout effacer',
      selectAll: 'Tout sélectionner',`;

// New section: en.peopleDetail
const enPeopleDetail = `
    // People Group Detail Page
    peopleDetail: {
      title: 'People Group Details',
      backToMap: 'Back to map',
      editPeople: 'Edit',
      deletePeople: 'Delete',
      confirmDelete: 'Confirm deletion',
      confirmDeleteMessage: 'Are you sure you want to permanently delete this people group?',
      deleteSuccess: 'People group deleted successfully',
      deleteError: 'Error deleting people group',
      saveSuccess: 'Changes saved successfully',
      saveError: 'Error saving changes',
      basicInfo: 'Basic Information',
      name: 'Name',
      village: 'Village',
      region: 'Region',
      country: 'Country',
      population: 'Population',
      language: 'Language',
      religion: 'Religion',
      dmmStatus: 'DMM Status',
      numberOfChurches: 'Number of churches',
      churchGeneration: 'Church generation',
      engagementStatus: 'Engagement status',
      engagementLevel: 'Engagement level',
      description: 'Description',
      coordinates: 'Coordinates',
      source: 'Source',
      addedBy: 'Added by',
      dateAdded: 'Date added',
      lastUpdated: 'Last updated',
      notSpecified: 'Not specified',
      unknown: 'Unknown',
      loadError: 'Loading error',
      loadErrorDesc: 'Unable to load people group details.',
    },
`;

// New section: fr.peopleDetail
const frPeopleDetail = `
    // People Group Detail Page
    peopleDetail: {
      title: 'Détails du Groupe de Peuples',
      backToMap: 'Retour à la carte',
      editPeople: 'Modifier',
      deletePeople: 'Supprimer',
      confirmDelete: 'Confirmer la suppression',
      confirmDeleteMessage: 'Êtes-vous sûr de vouloir supprimer définitivement ce peuple ?',
      deleteSuccess: 'Peuple supprimé avec succès',
      deleteError: 'Erreur lors de la suppression',
      saveSuccess: 'Modifications enregistrées avec succès',
      saveError: 'Erreur lors de l\\'enregistrement',
      basicInfo: 'Informations de base',
      name: 'Nom',
      village: 'Village',
      region: 'Région',
      country: 'Pays',
      population: 'Population',
      language: 'Langue',
      religion: 'Religion',
      dmmStatus: 'Statut DMM',
      numberOfChurches: 'Nombre d\\'églises',
      churchGeneration: 'Génération d\\'église',
      engagementStatus: 'Statut d\\'engagement',
      engagementLevel: 'Niveau d\\'engagement',
      description: 'Description',
      coordinates: 'Coordonnées',
      source: 'Source',
      addedBy: 'Ajouté par',
      dateAdded: 'Date d\\'ajout',
      lastUpdated: 'Dernière mise à jour',
      notSpecified: 'Non spécifié',
      unknown: 'Inconnu',
      loadError: 'Erreur de chargement',
      loadErrorDesc: 'Impossible de charger les détails du peuple.',
    },
`;

// New section: en.analyseQualitative
const enAnalyseQualitative = `
    // Qualitative Analysis Page
    analyseQualitative: {
      title: 'Qualitative Analysis',
      subtitle: 'DMM DNA Analysis',
      loading: 'Loading analysis...',
      loadError: 'Loading error',
      noData: 'No data available',
      selectPeople: 'Select a people group',
      dmmDna: 'DMM DNA',
      indicators: 'Indicators',
      score: 'Score',
      level: 'Level',
      notes: 'Notes',
      saveSuccess: 'Analysis saved successfully',
      saveError: 'Error saving analysis',
    },
`;

// New section: fr.analyseQualitative
const frAnalyseQualitative = `
    // Qualitative Analysis Page
    analyseQualitative: {
      title: 'Analyse Qualitative',
      subtitle: 'Analyse ADN DMM',
      loading: 'Chargement de l\\'analyse...',
      loadError: 'Erreur de chargement',
      noData: 'Aucune donnée disponible',
      selectPeople: 'Sélectionner un peuple',
      dmmDna: 'ADN DMM',
      indicators: 'Indicateurs',
      score: 'Score',
      level: 'Niveau',
      notes: 'Notes',
      saveSuccess: 'Analyse enregistrée avec succès',
      saveError: 'Erreur lors de l\\'enregistrement',
    },
`;

// New section: en.adminUsers
const enAdminUsers = `
    // Admin Users Page
    adminUsers: {
      title: 'User Management',
      subtitle: 'Manage user accounts and permissions',
      searchPlaceholder: 'Search a user...',
      allRoles: 'All roles',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      organization: 'Organization',
      dateAdded: 'Date added',
      actions: 'Actions',
      editRole: 'Edit role',
      deleteUser: 'Delete user',
      confirmDelete: 'Are you sure you want to delete this user?',
      deleteSuccess: 'User deleted successfully',
      deleteError: 'Error deleting user',
      updateSuccess: 'Role updated successfully',
      updateError: 'Error updating role',
      loadError: 'Loading error',
      noUsers: 'No users found',
      roles: {
        admin: 'Administrator',
        supervisor: 'Supervisor',
        missionary: 'Missionary',
        guest: 'Guest',
      },
    },
`;

// New section: fr.adminUsers
const frAdminUsers = `
    // Admin Users Page
    adminUsers: {
      title: 'Gestion des utilisateurs',
      subtitle: 'Gérer les comptes et permissions des utilisateurs',
      searchPlaceholder: 'Rechercher un utilisateur...',
      allRoles: 'Tous les rôles',
      name: 'Nom',
      email: 'Email',
      role: 'Rôle',
      organization: 'Organisation',
      dateAdded: 'Date d\\'ajout',
      actions: 'Actions',
      editRole: 'Modifier le rôle',
      deleteUser: 'Supprimer l\\'utilisateur',
      confirmDelete: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
      deleteSuccess: 'Utilisateur supprimé avec succès',
      deleteError: 'Erreur lors de la suppression',
      updateSuccess: 'Rôle mis à jour avec succès',
      updateError: 'Erreur lors de la mise à jour',
      loadError: 'Erreur de chargement',
      noUsers: 'Aucun utilisateur trouvé',
      roles: {
        admin: 'Administrateur',
        supervisor: 'Superviseur',
        missionary: 'Missionnaire',
        guest: 'Invité',
      },
    },
`;

// New section: en.pendingValidations
const enPendingValidations = `
    // Pending Validations Page (separate from validation form messages)
    pendingValidations: {
      title: 'Pending Validations',
      subtitle: 'People groups awaiting review',
    },
`;

// New section: fr.pendingValidations
const frPendingValidations = `
    // Pending Validations Page
    pendingValidations: {
      title: 'Validations en attente',
      subtitle: 'Peuples en attente de révision',
    },
`;

// New section: en.countrySelect
const enCountrySelect = `
    // Country Multi-Select Component
    countrySelect: {
      searchPlaceholder: 'Search a country...',
      selectAll: 'Select all',
      clearAll: 'Clear all',
      noCountryFound: 'No country found',
      clearSelection: 'Clear selection',
      others: 'others',
    },
`;

// New section: fr.countrySelect
const frCountrySelect = `
    // Country Multi-Select Component
    countrySelect: {
      searchPlaceholder: 'Rechercher un pays...',
      selectAll: 'Tout sélectionner',
      clearAll: 'Tout effacer',
      noCountryFound: 'Aucun pays trouvé',
      clearSelection: 'Effacer la sélection',
      others: 'autres',
    },
`;

// Function to insert new keys into a section
function insertKeysIntoSection(content, sectionPattern, newKeys) {
  // Find the section and insert before its closing brace
  const regex = new RegExp(`(${sectionPattern}[\\s\\S]*?)(\\n    },)`, 'm');
  return content.replace(regex, `$1${newKeys}$2`);
}

// Function to insert a new section before a marker
function insertSectionBefore(content, marker, newSection) {
  return content.replace(marker, newSection + '\n' + marker);
}

// Insert new keys into en.peopleMap
translationsContent = insertKeysIntoSection(
  translationsContent,
  "// People Map \\(DMM Peoples\\)\\n    peopleMap: \\{",
  enPeopleMapNewKeys
);

// Insert new keys into fr.peopleMap
translationsContent = insertKeysIntoSection(
  translationsContent,
  "// People Map \\(DMM Peoples\\)\\n    peopleMap: \\{[\\s\\S]*?fr:[\\s\\S]*?// People Map \\(DMM Peoples\\)\\n    peopleMap: \\{",
  frPeopleMapNewKeys
);

// Actually, let's do a simpler approach - find the exact patterns
// For en.common - add before closing brace
translationsContent = translationsContent.replace(
  /(common: \{[\s\S]*?export: 'Export',)\n(\s+\},\n\n\s+\/\/ Authentication)/,
  `$1${enCommonNewKeys}\n$2`
);

// For fr.common - add before closing brace  
translationsContent = translationsContent.replace(
  /(fr:[\s\S]*?common: \{[\s\S]*?export: 'Exporter',)\n(\s+\},\n\n\s+\/\/ Authentication)/,
  `$1${frCommonNewKeys}\n$2`
);

// For en.peopleMap - add before status section
translationsContent = translationsContent.replace(
  /(en:[\s\S]*?peopleMap: \{[\s\S]*?level: 'Level',)\n(\s+status: \{)/,
  `$1${enPeopleMapNewKeys}\n$2`
);

// For fr.peopleMap - add before status section
translationsContent = translationsContent.replace(
  /(fr:[\s\S]*?peopleMap: \{[\s\S]*?level: 'Niveau',)\n(\s+status: \{)/,
  `$1${frPeopleMapNewKeys}\n$2`
);

// Insert new sections before the closing of en section (before fr:)
// Find the position just before "  fr: {"
const enSectionEnd = translationsContent.indexOf('\n  fr: {');
if (enSectionEnd > 0) {
  // Find the last closing brace of en section
  const enClosingBrace = translationsContent.lastIndexOf('  },\n\n  fr:');
  if (enClosingBrace > 0) {
    // Insert new sections before the validation section closing
    const insertPoint = translationsContent.indexOf('    // Validation\n    validation:', 0);
    if (insertPoint > 0 && insertPoint < enSectionEnd) {
      translationsContent = translationsContent.slice(0, insertPoint) +
        enPeopleDetail +
        enAnalyseQualitative +
        enAdminUsers +
        enPendingValidations +
        enCountrySelect +
        translationsContent.slice(insertPoint);
    }
  }
}

// Insert French sections before the validation section in fr
const frValidationPoint = translationsContent.indexOf('    // Validation (People Groups)\n    validation:', translationsContent.indexOf('fr: {'));
if (frValidationPoint > 0) {
  translationsContent = translationsContent.slice(0, frValidationPoint) +
    frPeopleDetail +
    frAnalyseQualitative +
    frAdminUsers +
    frPendingValidations +
    frCountrySelect +
    translationsContent.slice(frValidationPoint);
}

// Write updated translations
fs.writeFileSync(translationsPath, translationsContent, 'utf8');
console.log('✅ Updated translations.js');

// ============================================================================
// PART 2: Update MapView.jsx
// ============================================================================

const mapViewPath = path.join(__dirname, '../frontend/src/pages/MapView.jsx');
let mapViewContent = fs.readFileSync(mapViewPath, 'utf8');

// Fix 1: Change selectedCountries default from ['CM'] to []
mapViewContent = mapViewContent.replace(
  /const \[selectedCountries, setSelectedCountries\] = useState\(\['CM'\]\)/,
  "const [selectedCountries, setSelectedCountries] = useState([])"
);

// Fix 2: Remove the early return when selectedCountries.length === 0
mapViewContent = mapViewContent.replace(
  /\/\/ Only fetch if at least one country is selected\n\s+if \(selectedCountries\.length === 0\) \{\n\s+return \[\]\n\s+\}/,
  "// When no countries selected, fetch all (no country filter)"
);

// Fix 3: Change enabled condition from selectedCountries.length > 0 to true
mapViewContent = mapViewContent.replace(
  /enabled: selectedCountries\.length > 0,\s*\/\/ Only fetch when at least one country is selected/,
  "enabled: true, // Always fetch - when no countries selected, fetch all"
);

// Fix 4: Replace hardcoded French text with t() calls

// Line 428: "Niveau {people.engagementLevel}"
mapViewContent = mapViewContent.replace(
  /Niveau \{people\.engagementLevel\}/g,
  "{t('peopleMap.niveau')} {people.engagementLevel}"
);

// Line 434: "{people.numberOfChurches || 0} églises"
mapViewContent = mapViewContent.replace(
  /\{people\.numberOfChurches \|\| 0\} églises/g,
  "{people.numberOfChurches || 0} {t('peopleMap.churches')}"
);

// Line 451: "Voir les détails"
mapViewContent = mapViewContent.replace(
  />Voir les détails</g,
  ">{t('peopleMap.viewDetails')}<"
);

// Line 456: title="Supprimer ce peuple"
mapViewContent = mapViewContent.replace(
  /title="Supprimer ce peuple"/g,
  "title={t('peopleMap.deletePeople')}"
);

// Line 832: toast.error("Impossible d'obtenir votre position")
mapViewContent = mapViewContent.replace(
  /toast\.error\("Impossible d'obtenir votre position"\)/,
  "toast.error(t('peopleMap.locationError'))"
);

// Line 1000: "Peuples" header
mapViewContent = mapViewContent.replace(
  /<h2 className="text-sm font-semibold text-gray-700">\n\s+Peuples\n\s+<\/h2>/,
  '<h2 className="text-sm font-semibold text-gray-700">\n                    {t(\'peopleMap.peoples\')}\n                  </h2>'
);

// Line 1053: placeholder="Sélectionner des pays..."
mapViewContent = mapViewContent.replace(
  /placeholder="Sélectionner des pays\.\.\."/,
  "placeholder={t('peopleMap.selectCountries')}"
);

// Line 1066: "Toutes les régions"
mapViewContent = mapViewContent.replace(
  /<option value="">Toutes les régions<\/option>/g,
  "<option value=\"\">{t('peopleMap.allRegions')}</option>"
);

// Line 1082: "Tous les départements"
mapViewContent = mapViewContent.replace(
  /<option value="">Tous les départements<\/option>/g,
  "<option value=\"\">{t('peopleMap.allDepartments')}</option>"
);

// Line 1095: "Tous les arrondissements"
mapViewContent = mapViewContent.replace(
  /<option value="">Tous les arrondissements<\/option>/g,
  "<option value=\"\">{t('peopleMap.allArrondissements')}</option>"
);

// Line 1114: title="Afficher/Masquer les données DMM"
mapViewContent = mapViewContent.replace(
  /title="Afficher\/Masquer les données DMM"/,
  "title={t('peopleMap.showDMM')}"
);

// Line 1125: title="Afficher/Masquer les données Survey"
mapViewContent = mapViewContent.replace(
  /title="Afficher\/Masquer les données Survey"/,
  "title={t('peopleMap.showSurvey')}"
);

// Line 1136: title="Afficher/Masquer les données Joshua Project"
mapViewContent = mapViewContent.replace(
  /title="Afficher\/Masquer les données Joshua Project"/,
  "title={t('peopleMap.showJP')}"
);

// Line 1261: title="Ajouter un peuple"
mapViewContent = mapViewContent.replace(
  /title="Ajouter un peuple"/g,
  "title={t('peopleMap.addPeople')}"
);

// Line 1268: title="Ma position"
mapViewContent = mapViewContent.replace(
  /title="Ma position"/,
  "title={t('peopleMap.myLocation')}"
);

// Line 1275: title="Voir tous les peuples"
mapViewContent = mapViewContent.replace(
  /title="Voir tous les peuples"/,
  "title={t('peopleMap.fitAll')}"
);

// Line 1287: "Cliquez sur la carte pour placer le peuple"
mapViewContent = mapViewContent.replace(
  /<MapPin size=\{18\} \/>\n\s+Cliquez sur la carte pour placer le peuple/,
  "<MapPin size={18} />\n                {t('peopleMap.clickMapInstruction')}"
);

// Lines 1353-1360: Pagination progress
mapViewContent = mapViewContent.replace(
  /Page \{paginationProgress\.page\}\/\{paginationProgress\.totalPages\}/,
  "{t('peopleMap.paginationPage')} {paginationProgress.page}/{paginationProgress.totalPages}"
);

mapViewContent = mapViewContent.replace(
  /\(\{paginationProgress\.recordsFetched\} enregistrements\)/,
  "({paginationProgress.recordsFetched} {t('peopleMap.records')})"
);

// Line 1360: "Chargement..."
mapViewContent = mapViewContent.replace(
  /<span>Chargement\.\.\.<\/span>/,
  "<span>{t('peopleMap.loading')}</span>"
);

// Line 1370: "Peuples" stats label
mapViewContent = mapViewContent.replace(
  /<p className="text-gray-500 text-xs">Peuples<\/p>/g,
  "<p className=\"text-gray-500 text-xs\">{t('peopleMap.peoples')}</p>"
);

// Line 1375: "Églises" stats label
mapViewContent = mapViewContent.replace(
  /<p className="text-gray-500 text-xs">Églises<\/p>/,
  "<p className=\"text-gray-500 text-xs\">{t('nav.churches')}</p>"
);

// Lines 1384-1404: Empty state
mapViewContent = mapViewContent.replace(
  /<h3 className="text-lg font-bold text-gray-900 mb-2">Aucun peuple trouvé<\/h3>/,
  "<h3 className=\"text-lg font-bold text-gray-900 mb-2\">{t('peopleMap.noPeopleFound')}</h3>"
);

mapViewContent = mapViewContent.replace(
  /\? "Essayez de modifier vos filtres de recherche\."/,
  "? t('activities.empty.withFilters')"
);

mapViewContent = mapViewContent.replace(
  /: "Commencez par ajouter votre premier peuple sur la carte\."/,
  ": t('activities.empty.withoutFilters')"
);

mapViewContent = mapViewContent.replace(
  />Effacer les filtres</,
  ">{t('peopleMap.clearFilters')}<"
);

mapViewContent = mapViewContent.replace(
  /<Plus size=\{18\} className="inline mr-1" \/>\n\s+Ajouter un peuple/,
  "<Plus size={18} className=\"inline mr-1\" />\n                {t('peopleMap.addPeople')}"
);

// Line 1414: "Nouveau Peuple" modal title
mapViewContent = mapViewContent.replace(
  /<h3 className="text-xl font-bold">Nouveau Peuple<\/h3>/,
  "<h3 className=\"text-xl font-bold\">{t('peopleMap.newPeople')}</h3>"
);

// Line 1422: "Type de données"
mapViewContent = mapViewContent.replace(
  /<label className="form-label">Type de données<\/label>/,
  "<label className=\"form-label\">{t('peopleMap.dataType')}</label>"
);

// Line 1444: "Organisation"
mapViewContent = mapViewContent.replace(
  /\}`}>Organisation<\/p>/,
  "}`}>{t('peopleMap.orgData')}</p>"
);

// Line 1447: "Données de votre org."
mapViewContent = mapViewContent.replace(
  /\}`}>Données de votre org\.<\/p>/,
  "}`}>{t('peopleMap.orgDataDesc')}</p>"
);

// Line 1471: "Enquête" (Survey button)
mapViewContent = mapViewContent.replace(
  /\}`}>Enquête<\/p>/,
  "}`}>{t('peopleMap.surveyData')}</p>"
);

// Line 1474: "Données de terrain"
mapViewContent = mapViewContent.replace(
  /\}`}>Données de terrain<\/p>/,
  "}`}>{t('peopleMap.surveyDataDesc')}</p>"
);

// Line 1482: "Nom du peuple *"
mapViewContent = mapViewContent.replace(
  /<label className="form-label">Nom du peuple \*<\/label>/,
  "<label className=\"form-label\">{t('peopleMap.peopleName')} *</label>"
);

// Line 1494: "Nom du village"
mapViewContent = mapViewContent.replace(
  /<label className="form-label">Nom du village<\/label>/,
  "<label className=\"form-label\">{t('peopleMap.village')}</label>"
);

// Line 1509: placeholder="Rechercher ou sélectionner un village..."
mapViewContent = mapViewContent.replace(
  /placeholder="Rechercher ou sélectionner un village\.\.\."/,
  "placeholder={t('peopleMap.searchVillage')}"
);

// Line 1559: "Aucun village trouvé..."
mapViewContent = mapViewContent.replace(
  /Aucun village trouvé\. Veuillez sélectionner un village existant\./,
  "{t('peopleMap.noVillageFound')}"
);

// Line 1567: "Aucun village disponible"
mapViewContent = mapViewContent.replace(
  /Aucun village disponible/,
  "{t('peopleMap.noVillageAvailable')}"
);

// Line 1583: "Population"
mapViewContent = mapViewContent.replace(
  /<label className="form-label">Population<\/label>/,
  "<label className=\"form-label\">{t('peopleMap.population')}</label>"
);

// Line 1596: "Nombre d'églises"
mapViewContent = mapViewContent.replace(
  /<label className="form-label">Nombre d'églises<\/label>/,
  "<label className=\"form-label\">{t('peopleMap.numberOfChurches')}</label>"
);

// Line 1606: "Génération d'église"
mapViewContent = mapViewContent.replace(
  /<label className="form-label">Génération d'église<\/label>/,
  "<label className=\"form-label\">{t('peopleMap.churchGeneration')}</label>"
);

// Line 1624: "📊 Statut calculé automatiquement"
mapViewContent = mapViewContent.replace(
  /<span className="text-sm font-medium text-gray-700">📊 Statut calculé automatiquement<\/span>/,
  "<span className=\"text-sm font-medium text-gray-700\">📊 {t('peopleMap.autoCalculatedStatus')}</span>"
);

// Line 1625: "(basé sur le tableau DMM)"
mapViewContent = mapViewContent.replace(
  /<span className="text-xs text-gray-500">\(basé sur le tableau DMM\)<\/span>/,
  "<span className=\"text-xs text-gray-500\">{t('peopleMap.basedOnDMM')}</span>"
);

// Line 1629: "Statut du peuple"
mapViewContent = mapViewContent.replace(
  /<label className="text-xs text-gray-500 block mb-1">Statut du peuple<\/label>/,
  "<label className=\"text-xs text-gray-500 block mb-1\">{t('peopleMap.peopleStatus')}</label>"
);

// Line 1636: "Niveau du peuple"
mapViewContent = mapViewContent.replace(
  /<label className="text-xs text-gray-500 block mb-1">Niveau du peuple<\/label>/,
  "<label className=\"text-xs text-gray-500 block mb-1\">{t('peopleMap.peopleLevel')}</label>"
);

// Line 1638: "Niveau {calculated.level}"
mapViewContent = mapViewContent.replace(
  /<span className="font-semibold text-gray-800">Niveau \{calculated\.level\}<\/span>/,
  "<span className=\"font-semibold text-gray-800\">{t('peopleMap.niveau')} {calculated.level}</span>"
);

// Line 1651: "Région"
mapViewContent = mapViewContent.replace(
  /<label className="form-label">Région<\/label>/,
  "<label className=\"form-label\">{t('peopleMap.region')}</label>"
);

// Line 1660: "Pays"
mapViewContent = mapViewContent.replace(
  /<label className="form-label">Pays<\/label>/,
  "<label className=\"form-label\">{t('peopleMap.country')}</label>"
);

// Line 1671: "Description"
mapViewContent = mapViewContent.replace(
  /<label className="form-label">Description<\/label>/,
  "<label className=\"form-label\">{t('peopleMap.description')}</label>"
);

// Line 1677: placeholder="Informations supplémentaires..."
mapViewContent = mapViewContent.replace(
  /placeholder="Informations supplémentaires sur ce peuple\.\.\."/,
  "placeholder={t('peopleMap.descriptionPlaceholder')}"
);

// Line 1684: "Coordonnées:"
mapViewContent = mapViewContent.replace(
  /<MapPin size=\{14\} className="inline mr-1" \/>\n\s+Coordonnées:/,
  "<MapPin size={14} className=\"inline mr-1\" />\n                    {t('peopleMap.coordinates')}:"
);

// Line 1690: "Annuler" button
mapViewContent = mapViewContent.replace(
  /<button type="button" onClick=\{resetForm\} className="flex-1 btn-secondary">\n\s+Annuler\n\s+<\/button>/,
  "<button type=\"button\" onClick={resetForm} className=\"flex-1 btn-secondary\">\n                    {t('common.cancel')}\n                  </button>"
);

// Line 1700: "Ajout..."
mapViewContent = mapViewContent.replace(
  /<Loader2 size=\{16\} className="inline mr-1 animate-spin" \/>\n\s+Ajout\.\.\./,
  "<Loader2 size={16} className=\"inline mr-1 animate-spin\" />\n                        {t('peopleMap.adding')}"
);

// Line 1702: "Ajouter" button
mapViewContent = mapViewContent.replace(
  /\) : 'Ajouter'\}/,
  ") : t('common.add')}"
);

// Line 1718: "Confirmer la suppression"
mapViewContent = mapViewContent.replace(
  /<h3 className="text-xl font-bold text-gray-900">Confirmer la suppression<\/h3>/,
  "<h3 className=\"text-xl font-bold text-gray-900\">{t('peopleMap.deleteConfirmTitle')}</h3>"
);

// Line 1721: "Êtes-vous sûr de vouloir supprimer le peuple"
mapViewContent = mapViewContent.replace(
  /Êtes-vous sûr de vouloir supprimer le peuple <strong className="text-gray-900">\{deleteConfirm\.name\}<\/strong> \?/,
  "{t('peopleMap.deleteConfirmMessage')} <strong className=\"text-gray-900\">{deleteConfirm.name}</strong> ?"
);

// Line 1724: "Cette action est irréversible..."
mapViewContent = mapViewContent.replace(
  /Cette action est irréversible et mettra à jour automatiquement le statut du village associé\./,
  "{t('peopleMap.deleteConfirmWarning')}"
);

// Line 1733: "Annuler" in delete dialog
mapViewContent = mapViewContent.replace(
  /className="flex-1 btn-secondary"\n\s+disabled=\{deletePeopleMutation\.isPending\}\n\s+>\n\s+Annuler\n\s+<\/button>/,
  "className=\"flex-1 btn-secondary\"\n                  disabled={deletePeopleMutation.isPending}\n                >\n                  {t('common.cancel')}\n                </button>"
);

// Line 1743: "Suppression..."
mapViewContent = mapViewContent.replace(
  /<Loader2 size=\{16\} className="animate-spin" \/>\n\s+Suppression\.\.\./,
  "<Loader2 size={16} className=\"animate-spin\" />\n                      {t('common.loading')}"
);

// Line 1748: "Supprimer" button
mapViewContent = mapViewContent.replace(
  /<Trash2 size=\{16\} \/>\n\s+Supprimer\n\s+<\/>/,
  "<Trash2 size={16} />\n                      {t('common.delete')}\n                    </>"
);

// Write updated MapView
fs.writeFileSync(mapViewPath, mapViewContent, 'utf8');
console.log('✅ Updated MapView.jsx');

// ============================================================================
// PART 3: Update CountryMultiSelect.jsx
// ============================================================================

const countryMultiSelectPath = path.join(__dirname, '../frontend/src/components/CountryMultiSelect.jsx');
let countryMultiSelectContent = fs.readFileSync(countryMultiSelectPath, 'utf8');

// Add useLanguage import
countryMultiSelectContent = countryMultiSelectContent.replace(
  "import { useState, useRef, useEffect } from 'react';",
  "import { useState, useRef, useEffect } from 'react';\nimport { useLanguage } from '../contexts/LanguageContext';"
);

// Add const { t } = useLanguage() inside the component
countryMultiSelectContent = countryMultiSelectContent.replace(
  "const [isOpen, setIsOpen] = useState(false);",
  "const { t } = useLanguage();\n  const [isOpen, setIsOpen] = useState(false);"
);

// Change default placeholder
countryMultiSelectContent = countryMultiSelectContent.replace(
  "placeholder = 'Sélectionner des pays...',",
  "placeholder = '',"
);

// Update placeholder usage to use t() as fallback
countryMultiSelectContent = countryMultiSelectContent.replace(
  "{placeholder}",
  "{placeholder || t('peopleMap.selectCountries')}"
);

// Replace "Rechercher un pays..."
countryMultiSelectContent = countryMultiSelectContent.replace(
  'placeholder="Rechercher un pays..."',
  "placeholder={t('countrySelect.searchPlaceholder')}"
);

// Replace "Tout sélectionner"
countryMultiSelectContent = countryMultiSelectContent.replace(
  ">Tout sélectionner<",
  ">{t('countrySelect.selectAll')}<"
);

// Replace "Tout effacer"
countryMultiSelectContent = countryMultiSelectContent.replace(
  ">Tout effacer<",
  ">{t('countrySelect.clearAll')}<"
);

// Replace "Aucun pays trouvé"
countryMultiSelectContent = countryMultiSelectContent.replace(
  "Aucun pays trouvé",
  "{t('countrySelect.noCountryFound')}"
);

// Replace "+{selectedCountries.length - 3} autres"
countryMultiSelectContent = countryMultiSelectContent.replace(
  "+{selectedCountries.length - 3} autres",
  "+{selectedCountries.length - 3} {t('countrySelect.others')}"
);

// Replace title="Effacer tout"
countryMultiSelectContent = countryMultiSelectContent.replace(
  'title="Effacer tout"',
  "title={t('countrySelect.clearAll')}"
);

// Write updated CountryMultiSelect
fs.writeFileSync(countryMultiSelectPath, countryMultiSelectContent, 'utf8');
console.log('✅ Updated CountryMultiSelect.jsx');

console.log('\n🎉 All updates completed successfully!');
console.log('\nSummary of changes:');
console.log('1. translations.js: Added new translation keys for peopleMap, common, peopleDetail, analyseQualitative, adminUsers, pendingValidations, countrySelect');
console.log('2. MapView.jsx: Fixed selectedCountries default to [], enabled query always, replaced hardcoded French text with t() calls');
console.log('3. CountryMultiSelect.jsx: Added useLanguage hook and replaced hardcoded French text with t() calls');
