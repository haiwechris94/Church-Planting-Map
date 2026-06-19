#!/usr/bin/env node
/**
 * Script to add i18n support to React component files
 * Adds useLanguage import and replaces hardcoded French/English text with t() calls
 */

const fs = require('fs');
const path = require('path');

// Translation key mappings for common French text
const translationMappings = {
  // Common actions
  'Modifier': "t('common.edit')",
  'Enregistrer': "t('common.save')",
  'Annuler': "t('common.cancel')",
  'Supprimer': "t('common.delete')",
  'Ajouter': "t('common.add')",
  'Créer': "t('common.create')",
  'Fermer': "t('common.close')",
  'Confirmer': "t('common.confirm')",
  'Rechercher': "t('common.search')",
  'Filtrer': "t('common.filter')",
  'Exporter': "t('common.export')",
  'Importer': "t('common.import')",
  'Retour': "t('common.back')",
  'Suivant': "t('common.next')",
  'Précédent': "t('common.previous')",
  'Charger plus': "t('common.loadMore')",
  'Voir tout': "t('common.viewAll')",
  'Voir plus': "t('common.viewMore')",
  'Oui': "t('common.yes')",
  'Non': "t('common.no')",
  
  // Status labels
  'Non atteint': "t('status.unreached')",
  'En cours': "t('status.inProgress')",
  'Église plantée': "t('status.churchPlanted')",
  'Multiplication': "t('status.multiplying')",
  
  // Form labels
  'Nom': "t('form.name')",
  'Email': "t('form.email')",
  'Mot de passe': "t('form.password')",
  'Description': "t('form.description')",
  'Population': "t('form.population')",
  'Région': "t('form.region')",
  'Pays': "t('form.country')",
  'Statut': "t('form.status')",
  'Latitude': "t('form.latitude')",
  'Longitude': "t('form.longitude')",
  'Organisation': "t('form.organization')",
  'Rôle': "t('form.role')",
  
  // Section titles
  'Informations générales': "t('sections.generalInfo')",
  'Informations personnelles': "t('sections.personalInfo')",
  'Activités récentes': "t('sections.recentActivities')",
  'Statistiques': "t('sections.statistics')",
  'Sécurité': "t('sections.security')",
  
  // Messages
  'Chargement...': "t('messages.loading')",
  'Enregistrement...': "t('messages.saving')",
  'Suppression...': "t('messages.deleting')",
  'Aucun résultat': "t('messages.noResults')",
  'Erreur': "t('messages.error')",
  'Succès': "t('messages.success')",
  
  // Roles
  'Administrateur': "t('roles.admin')",
  'Superviseur': "t('roles.supervisor')",
  'Missionnaire': "t('roles.missionary')",
  'Coordinateur': "t('roles.coordinator')",
  'Observateur': "t('roles.viewer')",
  'Invité': "t('roles.guest')",
  'Admin': "t('roles.admin')",
  
  // Entities
  'Villages': "t('entities.villages')",
  'Églises': "t('entities.churches')",
  'Activités': "t('entities.activities')",
  'Utilisateurs': "t('entities.users')",
  'Groupes ethniques': "t('entities.peopleGroups')",
  
  // Admin specific
  'Gestion des utilisateurs': "t('adminUsers.title')",
  'Rechercher un utilisateur...': "t('adminUsers.searchPlaceholder')",
  'Tous les rôles': "t('adminUsers.allRoles')",
  'Actif': "t('adminUsers.active')",
  'Bloqué': "t('adminUsers.blocked')",
  
  // Map controls
  'Ajouter un élément': "t('map.addElement')",
  'Ma position': "t('map.myLocation')",
  'Voir tous les éléments': "t('map.viewAll')",
  'Changer de couche': "t('map.changeLayer')",
  
  // Data management
  'Toutes les données': "t('dataManagement.allData')",
  'Enquête': "t('dataManagement.survey')",
  'Manuel': "t('dataManagement.manual')",
  'Nom (A-Z)': "t('dataManagement.sortNameAsc')",
  'Nom (Z-A)': "t('dataManagement.sortNameDesc')",
  
  // Village detail
  'Village non trouvé': "t('village.notFound')",
  'Retour aux villages': "t('village.backToList')",
  'Coordonnées': "t('village.coordinates')",
  'Aucune activité enregistrée': "t('village.noActivities')",
  'Aucune église': "t('village.noChurches')",
  'Créé le': "t('village.createdAt')",
  'Supprimer le village': "t('village.deleteTitle')",
  
  // Import/Export
  'Format universel compatible avec tous les tableurs': "t('export.csvDescription')",
  'Format Microsoft Excel avec mise en forme': "t('export.excelDescription')",
  'Document imprimable avec mise en page professionnelle': "t('export.pdfDescription')",
  
  // People groups
  "Données d'organisation": "t('peopleGroups.organizationData')",
  "Données d'enquête": "t('peopleGroups.surveyData')",
  'Données collectées par votre organisation': "t('peopleGroups.organizationDataDesc')",
  "Données collectées lors d'une enquête terrain": "t('peopleGroups.surveyDataDesc')",
};

// Files to process with their relative paths from frontend/src
const filesToProcess = [
  // Pages
  'pages/PeopleGroupDetail.jsx',
  'pages/AdminUsers.jsx',
  'pages/AnalyseQualitative.jsx',
  'pages/Activities.jsx',
  'pages/Dashboard.jsx',
  'pages/DashboardEnhanced.jsx',
  'pages/Profile.jsx',
  'pages/VillageDetail.jsx',
  'pages/DataManagement.jsx',
  'pages/PendingValidations.jsx',
  'pages/RejectedPeopleGroups.jsx',
  'pages/Login.jsx',
  'pages/Register.jsx',
  'pages/ResetPassword.jsx',
  'pages/MapView.jsx',
  'pages/GeoJSONMapView.jsx',
  // Components - Dashboard
  'components/Dashboard/KPICards.jsx',
  'components/Dashboard/PeopleGroupsList.jsx',
  'components/Dashboard/StatusDonutChart.jsx',
  'components/Dashboard/HierarchicalTable.jsx',
  'components/Dashboard/AnalyticsDashboard.jsx',
  // Components - Map
  'components/Map/MapControls.jsx',
  'components/Map/MapLegend.jsx',
  'components/Map/MapLayout.jsx',
  // Components - Import/Export
  'components/Import/PeopleGroupImport.jsx',
  'components/Export/DataExport.jsx',
  // Components - Peoples
  'components/Peoples/AddPeopleModal.jsx',
  'components/Peoples/AddPeopleButton.jsx',
  // Components - Other
  'components/Layout.jsx',
  'components/TopNavbar.jsx',
  'components/AdvancedSearch.jsx',
  'components/CountrySelector.jsx',
];

function getImportPath(filePath) {
  const depth = filePath.split('/').length - 1;
  if (depth === 1) return '../i18n';
  if (depth === 2) return '../../i18n';
  return '../'.repeat(depth) + 'i18n';
}

function hasUseLanguageImport(content) {
  return /import\s*{[^}]*useLanguage[^}]*}\s*from\s*['"][^'"]*i18n['"]/.test(content);
}

function hasUseLanguageHook(content) {
  return /const\s*{\s*t\s*[,}]/.test(content) || /const\s*{\s*[^}]*\bt\b[^}]*}\s*=\s*useLanguage/.test(content);
}

function addUseLanguageImport(content, importPath) {
  if (hasUseLanguageImport(content)) {
    return content;
  }
  
  const importRegex = /^import\s+.*from\s+['"][^'"]+['"];?\s*$/gm;
  let lastImportMatch;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }
  
  if (lastImportMatch) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    return content.slice(0, insertPos) + `\nimport { useLanguage } from '${importPath}'` + content.slice(insertPos);
  }
  
  return `import { useLanguage } from '${importPath}'\n` + content;
}

function addUseLanguageHook(content, componentName) {
  if (hasUseLanguageHook(content)) {
    return content;
  }
  
  // Pattern to find component function start
  const patterns = [
    // const ComponentName = () => {
    new RegExp(`const\\s+${componentName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*{`, 'g'),
    // const ComponentName = ({ props }) => {
    new RegExp(`const\\s+${componentName}\\s*=\\s*\\(\\s*{[^}]*}\\s*\\)\\s*=>\\s*{`, 'g'),
    // function ComponentName() {
    new RegExp(`function\\s+${componentName}\\s*\\([^)]*\\)\\s*{`, 'g'),
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(content);
    if (match) {
      const insertPos = match.index + match[0].length;
      const nextChars = content.slice(insertPos, insertPos + 100);
      if (!nextChars.includes('useLanguage')) {
        return content.slice(0, insertPos) + '\n  const { t } = useLanguage()' + content.slice(insertPos);
      }
    }
  }
  
  return content;
}

function replaceHardcodedText(content) {
  let result = content;
  
  for (const [french, replacement] of Object.entries(translationMappings)) {
    // Replace in title attributes: title="French text"
    const titlePattern = new RegExp(`title=["']${escapeRegex(french)}["']`, 'g');
    result = result.replace(titlePattern, `title={${replacement}}`);
    
    // Replace in JSX text content: >French text<
    const jsxPattern = new RegExp(`>\\s*${escapeRegex(french)}\\s*<`, 'g');
    result = result.replace(jsxPattern, `>{${replacement}}<`);
    
    // Replace in object literals: label: 'French text'
    const labelPattern = new RegExp(`(label:\\s*)['"]${escapeRegex(french)}['"]`, 'g');
    result = result.replace(labelPattern, `$1${replacement}`);
    
    // Replace in description: description: 'French text'
    const descPattern = new RegExp(`(description:\\s*)['"]${escapeRegex(french)}['"]`, 'g');
    result = result.replace(descPattern, `$1${replacement}`);
  }
  
  return result;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getComponentName(filePath) {
  const fileName = path.basename(filePath, '.jsx');
  return fileName;
}

function processFile(filePath) {
  const fullPath = path.join(__dirname, '..', 'frontend', 'src', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return { status: 'not_found', file: filePath };
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  const componentName = getComponentName(filePath);
  
  // Step 1: Add import if needed
  const importPath = getImportPath(filePath);
  content = addUseLanguageImport(content, importPath);
  
  // Step 2: Add hook if needed
  content = addUseLanguageHook(content, componentName);
  
  // Step 3: Replace hardcoded text
  content = replaceHardcodedText(content);
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return { status: 'updated', file: filePath };
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
    return { status: 'unchanged', file: filePath };
  }
}

// Main execution
console.log('🌐 Adding i18n support to React components...\n');

const results = { updated: [], unchanged: [], notFound: [], errors: [] };

for (const file of filesToProcess) {
  try {
    const result = processFile(file);
    if (result.status === 'updated') results.updated.push(file);
    else if (result.status === 'unchanged') results.unchanged.push(file);
    else if (result.status === 'not_found') results.notFound.push(file);
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
    results.errors.push({ file, error: error.message });
  }
}

console.log('\n📊 Summary:');
console.log(`   ✅ Updated: ${results.updated.length} files`);
console.log(`   ℹ️  Unchanged: ${results.unchanged.length} files`);
console.log(`   ⚠️  Not found: ${results.notFound.length} files`);
console.log(`   ❌ Errors: ${results.errors.length} files`);

if (results.notFound.length > 0) {
  console.log('\nFiles not found:');
  results.notFound.forEach(f => console.log(`   - ${f}`));
}
