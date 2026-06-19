/**
 * QuarterlyReport Model
 *
 * Stocke le rapport trimestriel DMM pour chaque peuple dans chaque pays.
 * Chaque trimestre (Q1, Q2, Q3, Q4) génère un document par peuple.
 * Permet de tracer l'évolution dans le temps et de calculer les deltas.
 *
 * Source : fichier Excel trimestriel (ex: FRANCOPHONE_CENTRAL_AFRICA_1Q26.xlsx)
 */
const mongoose = require('mongoose');

const quarterlyReportSchema = new mongoose.Schema({

  // ── Identifiants du rapport ─────────────────────────────────────────────────
  quarter: {
    type: String,
    required: true,
    // Format : "Q1-2026", "Q2-2026", "Q3-2026", "Q4-2026"
    match: [/^Q[1-4]-\d{4}$/, 'Format attendu : Q1-2026'],
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100,
  },
  quarterNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
  },
  reportDate: {
    type: Date,
    // Date du rapport telle qu'indiquée dans le fichier Excel
  },

  // ── Géographie ──────────────────────────────────────────────────────────────
  region: {
    type: String,
    trim: true,
    // Ex: "FRANCOPHONE CENTRAL AFRICA"
  },
  country: {
    type: String,
    required: true,
    trim: true,
    // Ex: "Cameroon", "Gabon", "Chad"
  },
  countryCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 2,
    // Ex: "CM", "GA", "TD"
  },

  // ── Lien avec PeopleGroup ───────────────────────────────────────────────────
  peopleGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PeopleGroup',
    // null si le peuple n'existe pas encore en base (sera créé lors de l'import)
  },
  peopleGroupName: {
    type: String,
    required: true,
    trim: true,
    // Tel qu'écrit dans le fichier Excel
  },
  engagementName: {
    type: String,
    trim: true,
    // Ex: "Cameroon-Mafa", "Gabon-Simba"
  },

  // ── Lien Joshua Project ─────────────────────────────────────────────────────
  jpPeopleGroupId: {
    type: String,
    trim: true,
    // Colonne "People_Group ID" du fichier Excel = ID Joshua Project
    // Ex: "9919" pour Mafa, "5400" pour Fulani, "#N/A" si non répertorié
  },

  // ── Indicateurs DMM clés ────────────────────────────────────────────────────
  // DBS = Discovery Bible Study groups, COM = Communautés, CAT = Catégories
  dbs: {
    type: Number,
    min: 0,
    default: 0,
  },
  com: {
    type: Number,
    min: 0,
    default: 0,
  },
  cat: {
    type: Number,
    min: 0,
    default: 0,
  },
  totalChurches: {
    type: Number,
    min: 0,
    default: 0,
    // Colonne "TOTAL" = nombre total d'églises ce trimestre
  },
  churchGeneration: {
    type: Number,
    min: 0,
    default: 0,
    // Colonne "GEN" = génération maximale d'église (profondeur du mouvement)
  },
  avgChurchSize: {
    type: Number,
    min: 0,
    default: 0,
  },

  // ── Croissance ──────────────────────────────────────────────────────────────
  newDisciples: {
    type: Number,
    min: 0,
    default: 0,
    // Nombre de nouveaux disciples CE trimestre
  },
  newBaptisms: {
    type: Number,
    min: 0,
    default: 0,
  },
  otherChristFollowers: {
    type: Number,
    min: 0,
    default: 0,
  },

  // ── Indicateurs Peuples Frontière (Muslim Background) ───────────────────────
  mbPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
    // MB% en entier : 5% = 5, 100% = 100, 50% = 50
    // STRATÉGIQUE : montre la percée dans les peuples à majorité musulmane
  },
  mbbCount: {
    type: Number,
    min: 0,
    default: 0,
    // Nombre de croyants d'origine musulmane (Muslim Background Believers)
  },
  mbDecimal: {
    type: Number,
    default: 0,
    // MB% en décimal (0.05 pour 5%)
  },
  mbChurches: {
    type: Number,
    min: 0,
    default: 0,
    // Nombre d'églises d'origine musulmane
  },

  // ── Leadership & Formation ──────────────────────────────────────────────────
  leadersInTraining: {
    type: Number,
    min: 0,
    default: 0,
    // Pipeline de leadership — indicateur de durabilité du mouvement
  },
  activeTrainers: {
    type: Number,
    min: 0,
    default: 0,
    // Coaches/formateurs actifs ce trimestre
  },
  trainingsHeld: {
    type: Number,
    min: 0,
    default: 0,
    // Nombre de formations tenues ce trimestre
  },
  highestTrainingLevel: {
    type: String,
    trim: true,
    default: '',
  },
  trainingCategory: {
    type: String,
    trim: true,
    default: '',
  },

  // ── Santé des Églises ───────────────────────────────────────────────────────
  lostChurches: {
    type: Number,
    min: 0,
    default: 0,
    // Églises perdues ce trimestre — indicateur de fragilité
  },
  mergedChurches: {
    type: Number,
    min: 0,
    default: 0,
    // Fusions — peut indiquer consolidation ou perte
  },

  // ── Statut & Priorité ───────────────────────────────────────────────────────
  gStatus: {
    type: String,
    trim: true,
    default: '',
    // Statut "G" du rapport global (champ G STATUS)
  },
  priority: {
    type: String,
    trim: true,
    default: '',
  },

  // ── Statut DMM calculé ──────────────────────────────────────────────────────
  // Calculé automatiquement à partir de totalChurches + churchGeneration
  // via dmmStatusCalculator au moment de l'import
  calculatedStatus: {
    type: String,
    enum: ['unreached', 'pioneer', 'midway', 'tipping-point', 'dmm', ''],
    default: '',
  },
  calculatedLevel: {
    type: String,
    enum: ['I', 'II', 'III', 'IV', ''],
    default: '',
  },

  // ── Delta par rapport au trimestre précédent ────────────────────────────────
  // Calculé automatiquement lors de l'import si un trimestre précédent existe
  delta: {
    totalChurches: { type: Number, default: null },
    newDisciples:  { type: Number, default: null },
    newBaptisms:   { type: Number, default: null },
    mbbCount:      { type: Number, default: null },
    statusChanged: { type: Boolean, default: false },
    previousStatus:{ type: String, default: '' },
  },

  // ── Notes ───────────────────────────────────────────────────────────────────
  notes: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: '',
  },

  // ── Métadonnées de l'import ─────────────────────────────────────────────────
  isNewPG: {
    type: Boolean,
    default: false,
    // true si le peuple vient de l'onglet "NEW PGs" du fichier
  },
  importedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  importedAt: {
    type: Date,
    default: Date.now,
  },
  sourceFile: {
    type: String,
    trim: true,
    // Nom du fichier Excel source, ex: "FRANCOPHONE_CENTRAL_AFRICA_1Q26.xlsx"
  },
  ngKey: {
    type: Number,
    // NG_KEY du fichier Excel — identifiant unique interne du rapport global
  },
  engagementId: {
    type: Number,
    // Engagement_id du fichier Excel
  },

}, {
  timestamps: true,
});

// ── Index ────────────────────────────────────────────────────────────────────

// Index principal : un rapport par peuple par trimestre (unicité)
quarterlyReportSchema.index(
  { quarter: 1, peopleGroupName: 1, country: 1 },
  { unique: true, name: 'unique_quarter_people_country' }
);

quarterlyReportSchema.index({ quarter: 1 });                      // Filtrer par trimestre
quarterlyReportSchema.index({ country: 1, quarter: 1 });          // Par pays + trimestre
quarterlyReportSchema.index({ peopleGroup: 1, quarter: 1 });      // Par peuple + trimestre
quarterlyReportSchema.index({ jpPeopleGroupId: 1 });              // Lien JP
quarterlyReportSchema.index({ calculatedStatus: 1, quarter: 1 }); // Filtre statut
quarterlyReportSchema.index({ mbPercent: -1 });                   // Top MBB
quarterlyReportSchema.index({ newDisciples: -1 });                // Top croissance
quarterlyReportSchema.index({ 'delta.statusChanged': 1 });        // Changements de statut

// ── Méthodes statiques ───────────────────────────────────────────────────────

/**
 * Récupérer tous les trimestres disponibles dans la base
 */
quarterlyReportSchema.statics.getAvailableQuarters = function () {
  return this.distinct('quarter').then(quarters =>
    quarters.sort().reverse() // Plus récent en premier
  );
};

/**
 * Récupérer le dernier rapport d'un peuple
 */
quarterlyReportSchema.statics.getLatestForPeopleGroup = function (peopleGroupId) {
  return this.findOne({ peopleGroup: peopleGroupId })
    .sort({ year: -1, quarterNumber: -1 });
};

/**
 * Récupérer l'historique complet d'un peuple (toutes les trimestres)
 */
quarterlyReportSchema.statics.getTimelineForPeopleGroup = function (peopleGroupId) {
  return this.find({ peopleGroup: peopleGroupId })
    .sort({ year: 1, quarterNumber: 1 });
};

/**
 * Stats globales d'un trimestre
 */
quarterlyReportSchema.statics.getQuarterStats = async function (quarter) {
  const result = await this.aggregate([
    { $match: { quarter } },
    {
      $group: {
        _id: null,
        totalPeoples:    { $sum: 1 },
        totalChurches:   { $sum: '$totalChurches' },
        totalDisciples:  { $sum: '$newDisciples' },
        totalBaptisms:   { $sum: '$newBaptisms' },
        totalMBB:        { $sum: '$mbbCount' },
        totalLeaders:    { $sum: '$leadersInTraining' },
        totalCoaches:    { $sum: '$activeTrainers' },
        lostChurches:    { $sum: '$lostChurches' },
        mergedChurches:  { $sum: '$mergedChurches' },
        newPGs:          { $sum: { $cond: ['$isNewPG', 1, 0] } },
        statusChanges:   { $sum: { $cond: ['$delta.statusChanged', 1, 0] } },
      },
    },
  ]);
  return result[0] || null;
};

/**
 * Peuples avec le plus de MBB (Croyants d'Origine Musulmane)
 */
quarterlyReportSchema.statics.getTopMBBPeoples = function (quarter, limit = 10) {
  return this.find({ quarter, mbbCount: { $gt: 0 } })
    .sort({ mbbCount: -1 })
    .limit(limit)
    .populate('peopleGroup', 'name location');
};

/**
 * Peuples ayant changé de statut DMM ce trimestre
 */
quarterlyReportSchema.statics.getStatusChanges = function (quarter) {
  return this.find({ quarter, 'delta.statusChanged': true })
    .sort({ calculatedStatus: 1 })
    .populate('peopleGroup', 'name location country');
};

module.exports = mongoose.model('QuarterlyReport', quarterlyReportSchema);
