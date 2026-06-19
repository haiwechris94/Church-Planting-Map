/**
 * Joshua Project Live Sync Service
 *
 * Synchronise les données Joshua Project depuis l'API officielle
 * directement dans MongoDB — plus besoin d'importer des CSV manuellement.
 *
 * Couverture : monde entier (tous les pays, toutes les pages)
 * Fréquence  : hebdomadaire (CRON) + déclenchement manuel via API
 *
 * JP API docs : https://joshuaproject.net/api/v2
 * Clé API     : stockée dans .env → JP_API_KEY
 *
 * Ce service est appelé de deux façons :
 *   1. CRON hebdomadaire dans server.js
 *   2. Endpoint POST /api/jp-sync/trigger (déclenché manuellement)
 */

require('dotenv').config();
const axios       = require('axios');
const mongoose    = require('mongoose');
const PeopleGroup = require('../models/PeopleGroup');
const User        = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const JP_API_BASE   = 'https://joshuaproject.net/api/v2';
const JP_API_KEY    = process.env.JP_API_KEY || '2b454615e985';
const BATCH_SIZE    = 100;   // Enregistrements par appel API (max JP = 1000)
const DELAY_MS      = 300;   // Délai entre chaque appel (respect rate limit JP)
const MAX_RETRIES   = 3;     // Tentatives en cas d'erreur réseau

// Champs qu'on récupère depuis l'API JP
// Réduit au strict nécessaire pour optimiser la bande passante
const JP_FIELDS = [
  'PeopleID3',
  'PeopNameInCountry',
  'PeopNameAcrossCountries',
  'Population',
  'Latitude',
  'Longitude',
  'JPScale',
  'LeastReached',
  'Frontier',
  'PercentEvangelical',
  'PercentAdherents',
  'PrimaryReligion',
  'RLG3',
  'PrimaryLanguageName',
  'ROL3',
  'Ctry',
  'ROG3',                // Country code ISO
  'PeopleCluster',
  'PeopleID2',
  'AffinityBloc',
  'ROP1',
  'RegionName',
  'RegionCode',
  'TenFortyWindow',
  'WorkersNeeded',
  'BibleStatus',
  'Continent',
].join(',');

// Mapping code ISO → nom pays normalisé (cohérent avec le reste de l'app)
const COUNTRY_CODE_TO_NAME = {
  CM: 'Cameroon',
  GA: 'Gabon',
  TD: 'Chad',
  CG: 'Congo, Rep.',
  CF: 'Central African Republic',
  GQ: 'Equatorial Guinea',
  CD: 'Congo, Dem. Rep.',
  RW: 'Rwanda',
  // Ajout progressif au fur et à mesure des besoins
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Appel API JP avec retry automatique
 */
async function jpApiGet(endpoint, params = {}, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`${JP_API_BASE}${endpoint}`, {
        params: { api_key: JP_API_KEY, ...params },
        timeout: 30000,
      });
      return response.data;
    } catch (err) {
      const isLast = attempt === retries;
      if (isLast) throw err;
      const waitMs = attempt * 1000; // backoff progressif
      console.warn(`   ⚠️  Tentative ${attempt}/${retries} échouée (${err.message}) — retry dans ${waitMs}ms`);
      await sleep(waitMs);
    }
  }
}

/**
 * Map JPScale (1–5) → statut DMM
 */
function jpScaleToStatus(jpScale, leastReached, frontier) {
  if (frontier === 'Y' || frontier === true)      return 'unreached';
  if (leastReached === 'Y' || leastReached === true) return 'unreached';
  const scale = parseInt(jpScale) || 0;
  if (scale <= 2) return 'unreached';
  if (scale === 3) return 'pioneer';
  if (scale === 4) return 'midway';
  if (scale >= 5)  return 'tipping-point';
  return 'unreached';
}

/**
 * Transforme un enregistrement JP API → document PeopleGroup MongoDB
 */
function transformJPRecord(record, adminId) {
  const lat = parseFloat(record.Latitude);
  const lng = parseFloat(record.Longitude);
  const validCoords = !isNaN(lat) && !isNaN(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180;

  const countryCode    = (record.ROG3 || '').toUpperCase().trim();
  const countryName    = record.Ctry || COUNTRY_CODE_TO_NAME[countryCode] || countryCode;
  const leastReached   = record.LeastReached === 'Y';
  const frontier       = record.Frontier === 'Y';
  const jpScale        = record.JPScale || '';
  const engagementStatus = jpScaleToStatus(jpScale, leastReached, frontier);

  const name = (record.PeopNameInCountry || record.PeopNameAcrossCountries || '').trim();
  if (!name || !validCoords) return null;

  return {
    name,
    villageName:       '',
    description:       [
      `${name} — ${countryName}.`,
      record.PrimaryReligion ? `Religion: ${record.PrimaryReligion}.` : '',
      record.PrimaryLanguageName ? `Langue: ${record.PrimaryLanguageName}.` : '',
      leastReached ? 'Peuple Least Reached.' : '',
      frontier ? 'Peuple Frontière.' : '',
    ].filter(Boolean).join(' '),
    location: {
      type:        'Point',
      coordinates: [lng, lat],
    },
    population:        parseInt(record.Population) || 0,
    language:          record.PrimaryLanguageName || '',
    religion:          record.PrimaryReligion     || '',
    country:           countryName,
    countryCode:       countryCode,
    region:            record.RegionName          || '',
    engagementStatus,
    status:            engagementStatus,
    engagementLevel:   '',
    source:            'Joshua Project',
    approved:          true,
    createdBy:         adminId,
    approvedBy:        adminId,
    approvedAt:        new Date(),
    jpData: {
      peopleId:           record.PeopleID3   || '',
      rog3:               countryCode,
      jpScale,
      percentEvangelical: parseFloat(record.PercentEvangelical) || 0,
      percentChristian:   parseFloat(record.PercentAdherents)   || 0,
      leastReached,
      frontier,
      peopleCluster:      record.PeopleCluster || '',
      affinityBloc:       record.AffinityBloc  || '',
      // Champs enrichis depuis l'API live (non disponibles dans les CSV)
      tenFortyWindow:     record.TenFortyWindow === 'Y',
      workersNeeded:      parseInt(record.WorkersNeeded) || 0,
      bibleStatus:        record.BibleStatus  || '',
      continent:          record.Continent    || '',
      regionCode:         record.RegionCode   || '',
    },
    // Timestamp de la dernière synchronisation
    lastJPSync:          new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE DE SYNCHRONISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lance la synchronisation complète Joshua Project → MongoDB
 *
 * @param {Object} options
 * @param {string} options.adminId       - ObjectId de l'utilisateur qui déclenche la sync
 * @param {string} options.filterCountry - Code pays ISO (ex: 'CM') — null = monde entier
 * @param {boolean} options.dryRun       - true = analyse sans sauvegarder
 * @param {Function} options.onProgress  - Callback(stats) pour le suivi en temps réel
 * @returns {Promise<Object>} Rapport final de synchronisation
 */
async function syncJoshuaProject(options = {}) {
  const {
    adminId,
    filterCountry = null,
    dryRun        = false,
    onProgress    = null,
  } = options;

  const startTime = Date.now();
  const stats = {
    totalFetched: 0,
    created:      0,
    updated:      0,
    skipped:      0,
    errors:       0,
    byCountry:    {},
    byStatus:     {},
    startedAt:    new Date(),
    finishedAt:   null,
    duration:     null,
    status:       'running',
    lastError:    null,
  };

  console.log('\n' + '═'.repeat(65));
  console.log('  🌍  Joshua Project Live Sync — Démarrage');
  console.log('═'.repeat(65));
  console.log(`  Mode      : ${dryRun ? '🔍 DRY RUN' : '🚀 SYNC RÉELLE'}`);
  console.log(`  Filtre    : ${filterCountry || 'Monde entier'}`);
  console.log(`  API Key   : ${JP_API_KEY.substring(0, 6)}...`);
  console.log('═'.repeat(65) + '\n');

  try {
    // ── Trouver l'utilisateur admin ─────────────────────────────────────────
    let adminUser = null;
    if (adminId) {
      adminUser = await User.findById(adminId).lean();
    }
    if (!adminUser) {
      adminUser = await User.findOne({ role: 'admin' }).lean()
              || await User.findOne({}).lean();
    }
    const resolvedAdminId = adminUser?._id || new mongoose.Types.ObjectId();

    // ── Pagination : récupérer tous les peuples ─────────────────────────────
    let page    = 1;
    let hasMore = true;

    while (hasMore) {
      const params = {
        limit:  BATCH_SIZE,
        page,
        fields: JP_FIELDS,
      };
      if (filterCountry) params.rog3 = filterCountry;

      console.log(`📡 Récupération page ${page} (${BATCH_SIZE} enregistrements)...`);

      let records;
      try {
        const response = await jpApiGet('/people_groups.json', params);

        // L'API JP retourne soit un tableau direct soit { data: [...] }
        records = Array.isArray(response)
          ? response
          : (response?.data || response?.people_groups || []);
      } catch (fetchErr) {
        console.error(`   ❌ Erreur page ${page}: ${fetchErr.message}`);
        stats.errors++;
        stats.lastError = fetchErr.message;
        break;
      }

      if (!records || records.length === 0) {
        hasMore = false;
        break;
      }

      stats.totalFetched += records.length;
      console.log(`   ✅ ${records.length} peuples reçus (total: ${stats.totalFetched})`);

      // ── Traitement de chaque enregistrement ───────────────────────────────
      for (const record of records) {
        try {
          const doc = transformJPRecord(record, resolvedAdminId);

          if (!doc) {
            stats.skipped++;
            continue;
          }

          // Stats par pays et statut
          stats.byCountry[doc.country]          = (stats.byCountry[doc.country]          || 0) + 1;
          stats.byStatus[doc.engagementStatus]  = (stats.byStatus[doc.engagementStatus]  || 0) + 1;

          if (dryRun) {
            stats.created++; // En dry run, on compte comme "à créer"
            continue;
          }

          // Upsert : cherche par JP People ID + country code (clé unique)
          const filter = {
            source:              'Joshua Project',
            'jpData.peopleId':   doc.jpData.peopleId,
            countryCode:         doc.countryCode,
          };

          const existing = await PeopleGroup.findOne(filter).select('_id').lean();

          if (existing) {
            // Mise à jour — on préserve les coordonnées si la nouvelle est invalide
            await PeopleGroup.findByIdAndUpdate(existing._id, {
              $set: {
                ...doc,
                // Ne pas écraser un nom vide
                ...(doc.name ? { name: doc.name } : {}),
              },
            });
            stats.updated++;
          } else {
            await new PeopleGroup(doc).save();
            stats.created++;
          }

        } catch (recordErr) {
          stats.errors++;
          if (stats.errors <= 10) {
            console.error(`   ❌ Erreur enregistrement (${record.PeopNameInCountry}): ${recordErr.message}`);
          }
        }
      }

      // Callback de progression en temps réel (pour Socket.IO)
      if (onProgress) {
        onProgress({ ...stats, page, hasMore: records.length === BATCH_SIZE });
      }

      // Si on reçoit moins que BATCH_SIZE, on est à la dernière page
      if (records.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        page++;
        await sleep(DELAY_MS); // Respect du rate limit JP
      }
    }

    // ── Rapport final ───────────────────────────────────────────────────────
    stats.finishedAt = new Date();
    stats.duration   = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
    stats.status     = 'completed';

    console.log('\n' + '═'.repeat(65));
    console.log('  ✅  SYNC TERMINÉE');
    console.log('═'.repeat(65));
    console.log(`  Total récupérés  : ${stats.totalFetched}`);
    console.log(`  ✅ Créés         : ${stats.created}`);
    console.log(`  🔄 Mis à jour    : ${stats.updated}`);
    console.log(`  ⏭️  Ignorés       : ${stats.skipped}`);
    console.log(`  ❌ Erreurs       : ${stats.errors}`);
    console.log(`  ⏱️  Durée         : ${stats.duration}`);

    // Top 10 pays
    const topCountries = Object.entries(stats.byCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('\n📊 Top pays :');
    topCountries.forEach(([country, count]) => {
      const bar = '█'.repeat(Math.min(count / 10, 30));
      console.log(`   ${country.padEnd(35)} ${String(count).padStart(5)}  ${bar}`);
    });

    console.log('\n📊 Par statut DMM :');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`   ${status.padEnd(20)} ${count}`);
    });

    if (dryRun) {
      console.log('\n⚠️  DRY RUN — Aucune donnée sauvegardée.');
    }

    return stats;

  } catch (fatalErr) {
    stats.status    = 'failed';
    stats.lastError = fatalErr.message;
    stats.finishedAt = new Date();
    stats.duration   = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
    console.error('\n❌ Erreur fatale:', fatalErr.message);
    return stats;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAT DE LA SYNC (partagé entre le CRON et les routes API)
// ─────────────────────────────────────────────────────────────────────────────

let syncState = {
  isRunning:   false,
  lastSync:    null,     // Date de la dernière sync réussie
  lastStats:   null,     // Rapport de la dernière sync
  nextSync:    null,     // Date de la prochaine sync CRON
  cronEnabled: true,
};

/**
 * Lance la sync en arrière-plan (non-bloquant)
 * Empêche les lancements simultanés
 */
async function triggerSync(options = {}) {
  if (syncState.isRunning) {
    return { alreadyRunning: true, message: 'Sync déjà en cours, patientez...' };
  }

  syncState.isRunning = true;

  // Lancer en arrière-plan sans bloquer
  syncJoshuaProject({
    ...options,
    onProgress: (stats) => {
      syncState.lastStats = stats;
    },
  })
    .then(stats => {
      syncState.isRunning = false;
      syncState.lastSync   = new Date();
      syncState.lastStats  = stats;
      console.log('✅ Sync JP terminée en arrière-plan');
    })
    .catch(err => {
      syncState.isRunning = false;
      console.error('❌ Erreur sync JP:', err.message);
    });

  return { started: true, message: 'Synchronisation JP démarrée en arrière-plan' };
}

/**
 * Configure le CRON hebdomadaire (chaque lundi à 3h du matin)
 */
function setupWeeklyCron() {
  // Vérification simple toutes les heures si c'est l'heure du CRON
  // (évite la dépendance à node-cron)
  const CRON_HOUR    = 3;    // 3h du matin
  const CRON_WEEKDAY = 1;    // Lundi (0=Dimanche)

  setInterval(async () => {
    if (!syncState.cronEnabled || syncState.isRunning) return;

    const now = new Date();
    if (now.getDay() !== CRON_WEEKDAY || now.getHours() !== CRON_HOUR) return;

    // Vérifier qu'on n'a pas déjà syncé aujourd'hui
    if (syncState.lastSync) {
      const lastSyncDay = new Date(syncState.lastSync).toDateString();
      if (lastSyncDay === now.toDateString()) return;
    }

    console.log('\n🕐 CRON hebdomadaire — Démarrage sync Joshua Project...');
    await triggerSync({ adminId: null, filterCountry: null });

    // Calculer la prochaine sync
    const next = new Date();
    next.setDate(next.getDate() + 7);
    next.setHours(CRON_HOUR, 0, 0, 0);
    syncState.nextSync = next;

  }, 60 * 60 * 1000); // Vérification toutes les heures

  // Calculer la prochaine sync pour l'affichage
  const next = new Date();
  const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
  next.setDate(next.getDate() + daysUntilMonday);
  next.setHours(CRON_HOUR, 0, 0, 0);
  syncState.nextSync = next;

  console.log(`✅ CRON JP configuré — prochaine sync: ${syncState.nextSync.toLocaleString('fr-FR')}`);
}

module.exports = {
  syncJoshuaProject,
  triggerSync,
  setupWeeklyCron,
  getSyncState: () => ({ ...syncState }),
};
