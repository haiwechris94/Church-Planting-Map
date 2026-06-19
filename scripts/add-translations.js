const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'i18n', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

// ============ EN.DASHBOARD additions (after generationAbbr: 'gen.',) ============
const enDashboardAdd = `      totalPeoples: 'Total peoples',
      villageCoverage: 'Village coverage',
      dmmSaturation: 'DMM Saturation',
      peopleGroups: 'People Groups',
      totalVillages: 'Total villages',
      totalChurches: 'Total churches',
      totalActivities: 'Total activities',
      totalMissionaries: 'Total missionaries',
      noData: 'No data available',
      loadError: 'Loading error',`;

content = content.replace(
  /(generationAbbr: 'gen\.',)(\n    },\n\n    \/\/ Village Status)/,
  `$1\n${enDashboardAdd}$2`
);

// ============ EN.PROFILE additions (after newPassword: 'New Password',) ============
const enProfileAdd = `      fullName: 'Full Name',
      email: 'Email',
      organization: 'Organization',
      security: 'Security',
      password: 'Password',
      lastPasswordChange: 'Last password change',
      minCharacters: 'Minimum 6 characters',
      confirmPassword: 'Confirm Password',
      changingPassword: 'Changing...',
      preferences: 'Preferences',
      darkMode: 'Dark Mode',
      enabled: 'Enabled',
      disabled: 'Disabled',
      accountInfo: 'Account Information',
      accountCreated: 'Account created',
      lastLogin: 'Last login',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      passwordChangeSuccess: 'Password changed successfully!',
      passwordChangeError: 'Error changing password',
      profileUpdateSuccess: 'Profile updated successfully!',
      profileUpdateError: 'Error updating profile',
      roles: {
        admin: 'Administrator',
        supervisor: 'Supervisor',
        missionary: 'Missionary',
        coordinator: 'Coordinator',
        viewer: 'Viewer',
        guest: 'Guest',
      },`;

content = content.replace(
  /(profile: \{[\s\S]*?newPassword: 'New Password',)(\n    },\n\n    \/\/ Language)/,
  `$1\n${enProfileAdd}$2`
);

// ============ EN.ADMINUSERS and EN.ANALYSEQUALITATIVE new sections ============
const enAdminUsers = `
    // Admin Users
    adminUsers: {
      title: 'User Management',
      subtitle: 'Manage user accounts and permissions',
      searchPlaceholder: 'Search a user...',
      allRoles: 'All roles',
      name: 'Name',
      role: 'Role',
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
      active: 'Active',
      inactive: 'Inactive',
      block: 'Block',
      unblock: 'Unblock',
      createUser: 'Create user',
      newUser: 'New User',
      roles: {
        admin: 'Administrator',
        supervisor: 'Supervisor',
        missionary: 'Missionary',
        guest: 'Guest',
      },
    },

    // Qualitative Analysis
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
      allCountries: 'All countries',
      allPeoples: 'All peoples',
      selectCountry: 'Select a country',
      noAnalysis: 'No analysis available',
      startAnalysis: 'Start analysis',
      totalScore: 'Total score',
      maxScore: 'Maximum score',
      percentage: 'Percentage',
      criteria: 'Criteria',
      foundation: 'Foundation',
      discipleship: 'Discipleship',
      multiplication: 'Multiplication',
      leadership: 'Leadership',
      community: 'Community',
      exportPDF: 'Export PDF',
      exportExcel: 'Export Excel',
      aiAnalysis: 'AI Analysis',
      generating: 'Generating...',
      aiInsights: 'AI Insights',
    },
`;

// Insert after profile section (with roles), before language section
content = content.replace(
  /(guest: 'Guest',\n      },\n    },\n\n    \/\/ Language\n    language: \{\n      select: 'Language',)/,
  `guest: 'Guest',
      },
    },${enAdminUsers}
    // Language
    language: {
      select: 'Language',`
);

// ============ EN.COMMON additions (after export: 'Export',) ============
const enCommonAdd = `      saving: 'Saving...',
      updating: 'Updating...',
      deleting: 'Deleting...',
      loading: 'Loading...',
      noData: 'No data',
      refresh: 'Refresh',
      view: 'View',
      details: 'Details',
      status: 'Status',
      name: 'Name',
      type: 'Type',
      actions: 'Actions',
      createdAt: 'Created at',
      updatedAt: 'Updated at',
      unknown: 'Unknown',
      notSpecified: 'Not specified',
      copy: 'Copy',
      download: 'Download',
      upload: 'Upload',
      import: 'Import',
      print: 'Print',
      share: 'Share',
      more: 'More',
      less: 'Less',
      expand: 'Expand',
      collapse: 'Collapse',
      previous: 'Previous',
      page: 'Page',
      of: 'of',
      rows: 'rows',
      perPage: 'per page',`;

content = content.replace(
  /(export: 'Export',)(\n    },\n\n    \/\/ Authentication)/,
  `$1\n${enCommonAdd}$2`
);

// ============ EN.MAP.FILTERS additions (after hideAll: 'Hide All',) ============
const enMapAdd = `      addElement: 'Add element',
      myLocation: 'My location',
      viewAll: 'View all',
      changeLayer: 'Change layer',`;

content = content.replace(
  /(filters: \{\n        byStatus: 'Filter by Status',\n        byRegion: 'Filter by Region',\n        showAll: 'Show All',\n        hideAll: 'Hide All',)(\n      },\n    },\n\n    \/\/ Voronoi)/,
  `$1\n${enMapAdd}$2`
);

// ============ FR.DASHBOARD additions (after generationAbbr: 'gén.',) ============
const frDashboardAdd = `      totalPeoples: 'Total peuples',
      villageCoverage: 'Couverture villages',
      dmmSaturation: 'Saturation DMM',
      peopleGroups: 'Groupes de peuples',
      totalVillages: 'Total villages',
      totalChurches: 'Total églises',
      totalActivities: 'Total activités',
      totalMissionaries: 'Total missionnaires',
      noData: 'Aucune donnée disponible',
      loadError: 'Erreur de chargement',`;

content = content.replace(
  /(generationAbbr: 'gén\.',)(\n    },\n\n    \/\/ Village Status\n    status: \{\n      unreached: 'Non atteint',)/,
  `$1\n${frDashboardAdd}$2`
);

// ============ FR.PROFILE additions (after newPassword: 'Nouveau mot de passe',) ============
const frProfileAdd = `      fullName: 'Nom complet',
      email: 'Email',
      organization: 'Organisation',
      security: 'Sécurité',
      password: 'Mot de passe',
      lastPasswordChange: 'Dernière modification du mot de passe',
      minCharacters: 'Minimum 6 caractères',
      confirmPassword: 'Confirmer le mot de passe',
      changingPassword: 'Modification...',
      preferences: 'Préférences',
      darkMode: 'Mode sombre',
      enabled: 'Activé',
      disabled: 'Désactivé',
      accountInfo: 'Informations du compte',
      accountCreated: 'Compte créé le',
      lastLogin: 'Dernière connexion',
      passwordMismatch: 'Les mots de passe ne correspondent pas',
      passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
      passwordChangeSuccess: 'Mot de passe modifié avec succès !',
      passwordChangeError: 'Erreur lors de la modification du mot de passe',
      profileUpdateSuccess: 'Profil mis à jour avec succès !',
      profileUpdateError: 'Erreur lors de la mise à jour du profil',
      roles: {
        admin: 'Administrateur',
        supervisor: 'Superviseur',
        missionary: 'Missionnaire',
        coordinator: 'Coordinateur',
        viewer: 'Observateur',
        guest: 'Invité',
      },`;

content = content.replace(
  /(profile: \{\n      title: 'Mon Profil',\n      personalInfo: 'Informations personnelles',\n      changePassword: 'Changer le mot de passe',\n      currentPassword: 'Mot de passe actuel',\n      newPassword: 'Nouveau mot de passe',)(\n    },\n\n    \/\/ Language\n    language: \{\n      select: 'Langue',)/,
  `$1\n${frProfileAdd}$2`
);

// ============ FR.ADMINUSERS and FR.ANALYSEQUALITATIVE new sections ============
const frAdminUsers = `
    // Admin Users
    adminUsers: {
      title: 'Gestion des utilisateurs',
      subtitle: 'Gérer les comptes et permissions des utilisateurs',
      searchPlaceholder: 'Rechercher un utilisateur...',
      allRoles: 'Tous les rôles',
      name: 'Nom',
      role: 'Rôle',
      dateAdded: "Date d'ajout",
      actions: 'Actions',
      editRole: 'Modifier le rôle',
      deleteUser: "Supprimer l'utilisateur",
      confirmDelete: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
      deleteSuccess: 'Utilisateur supprimé avec succès',
      deleteError: 'Erreur lors de la suppression',
      updateSuccess: 'Rôle mis à jour avec succès',
      updateError: 'Erreur lors de la mise à jour',
      loadError: 'Erreur de chargement',
      noUsers: 'Aucun utilisateur trouvé',
      active: 'Actif',
      inactive: 'Inactif',
      block: 'Bloquer',
      unblock: 'Débloquer',
      createUser: 'Créer un utilisateur',
      newUser: 'Nouvel utilisateur',
      roles: {
        admin: 'Administrateur',
        supervisor: 'Superviseur',
        missionary: 'Missionnaire',
        guest: 'Invité',
      },
    },

    // Qualitative Analysis
    analyseQualitative: {
      title: 'Analyse Qualitative',
      subtitle: 'Analyse ADN DMM',
      loading: "Chargement de l'analyse...",
      loadError: 'Erreur de chargement',
      noData: 'Aucune donnée disponible',
      selectPeople: 'Sélectionner un peuple',
      dmmDna: 'ADN DMM',
      indicators: 'Indicateurs',
      score: 'Score',
      level: 'Niveau',
      notes: 'Notes',
      saveSuccess: 'Analyse enregistrée avec succès',
      saveError: "Erreur lors de l'enregistrement",
      allCountries: 'Tous les pays',
      allPeoples: 'Tous les peuples',
      selectCountry: 'Sélectionner un pays',
      noAnalysis: 'Aucune analyse disponible',
      startAnalysis: "Démarrer l'analyse",
      totalScore: 'Score total',
      maxScore: 'Score maximum',
      percentage: 'Pourcentage',
      criteria: 'Critères',
      foundation: 'Fondation',
      discipleship: 'Formation de disciples',
      multiplication: 'Multiplication',
      leadership: 'Leadership',
      community: 'Communauté',
      exportPDF: 'Exporter PDF',
      exportExcel: 'Exporter Excel',
      aiAnalysis: 'Analyse IA',
      generating: 'Génération...',
      aiInsights: 'Insights IA',
    },
`;

// Insert after fr.profile section (with roles), before fr.language section
content = content.replace(
  /(guest: 'Invité',\n      },\n    },\n\n    \/\/ Language\n    language: \{\n      select: 'Langue',)/,
  `guest: 'Invité',
      },
    },${frAdminUsers}
    // Language
    language: {
      select: 'Langue',`
);

// ============ FR.COMMON additions (after export: 'Exporter',) ============
const frCommonAdd = `      saving: 'Enregistrement...',
      updating: 'Mise à jour...',
      deleting: 'Suppression...',
      loading: 'Chargement...',
      noData: 'Aucune donnée',
      refresh: 'Actualiser',
      view: 'Voir',
      details: 'Détails',
      status: 'Statut',
      name: 'Nom',
      type: 'Type',
      actions: 'Actions',
      createdAt: 'Créé le',
      updatedAt: 'Mis à jour le',
      unknown: 'Inconnu',
      notSpecified: 'Non spécifié',
      copy: 'Copier',
      download: 'Télécharger',
      upload: 'Téléverser',
      import: 'Importer',
      print: 'Imprimer',
      share: 'Partager',
      more: 'Plus',
      less: 'Moins',
      expand: 'Développer',
      collapse: 'Réduire',
      previous: 'Précédent',
      page: 'Page',
      of: 'sur',
      rows: 'lignes',
      perPage: 'par page',`;

content = content.replace(
  /(export: 'Exporter',)(\n    },\n\n    \/\/ Authentication\n    auth: \{\n      login: 'Connexion',)/,
  `$1\n${frCommonAdd}$2`
);

// ============ FR.MAP.FILTERS additions (after hideAll: 'Tout masquer',) ============
const frMapAdd = `      addElement: 'Ajouter un élément',
      myLocation: 'Ma position',
      viewAll: 'Voir tout',
      changeLayer: 'Changer de couche',`;

content = content.replace(
  /(filters: \{\n        byStatus: 'Filtrer par statut',\n        byRegion: 'Filtrer par région',\n        showAll: 'Tout afficher',\n        hideAll: 'Tout masquer',)(\n      },\n    },\n\n    \/\/ Voronoi)/,
  `$1\n${frMapAdd}$2`
);

fs.writeFileSync(filePath, content);
console.log('All translations added successfully!');
