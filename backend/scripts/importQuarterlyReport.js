/**
 * Script d'import du rapport trimestriel DMM
 *
 * Lit le fichier Excel trimestriel (ex: FRANCOPHONE_CENTRAL_AFRICA_1Q26.xlsx),
 * met à jour les PeopleGroups existants et crée les QuarterlyReport documents.
 *
 * Feuille "Sheet1"  → peuples existants avec leurs métriques trimestrielles
 * Feuille "NEW PGs" → nouveaux peuples découverts ce trimestre
 *
 * Usage:
 *   node scripts/importQuarterlyReport.js --file=../data/FRANCOPHONE_CENTRAL_AFRICA_1Q26.xlsx
 *   node scripts/importQuarterlyReport.js --file=../data/FRANCOPHONE_CENTRAL_AFRICA_1Q26.xlsx --dry-run
 *   node scripts/importQuarterlyReport.js --file=../data/FRANCOPHONE_CENTRAL_AFRICA_1Q26.xlsx --quarter=Q1-2026
 *
 * Options:
 *   --file=<path>       Chemin vers le fichier Excel (obligatoire)
 *   --quarter=<Q1-2026> Trimestre à forcer (auto-détecté depuis le nom de fichier sinon)
 *   --dry-run           Prévisualise sans sauvegarder
 *   --skip-pg-update    N'actualise pas les PeopleGroups (seulement QuarterlyReport)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const PeopleGroup = require('../models/PeopleGroup');
const QuarterlyReport = require('../models/QuarterlyReport');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'chrishaiwe@gmail.com';

// Mapping code pays → ISO 3166-1 alpha-2
const COUNTRY_CODE_MAP = {
  'Cameroon':                'CM',
  'Central African Republic':'CF',
  'Chad':                    'TD',
  'Congo, Dem. Rep.':        'CD',
  'Congo, Rep.':             'CG',
  'Equatorial Guinea':       'GQ',
  'Gabon':                   'GA',
  'Rwanda':                  'RW',
};

// Normalise les noms de pays venant du fichier (espaces, accents, abréviations)
const COUNTRY_NORMALIZE = {
  'cameroun':                    'Cameroon',
  'cameroon':                    'Cameroon',
  'car':                         'Central African Republic',
  'central african republic':    'Central African Republic',
  'rca':                         'Central African Republic',
  'centrafrique':                'Central African Republic',
  'chad':                        'Chad',
  'tchad':                       'Chad',
  'congo, dem. rep.':            'Congo, Dem. Rep.',
  'congo drc':                   'Congo, Dem. Rep.',
  'rd congo':                    'Congo, Dem. Rep.',
  'rdc':                         'Congo, Dem. Rep.',
  'congo, rep.':                 'Congo, Rep.',
  'congo rep':                   'Congo, Rep.',
  'congo brazzaville':           'Congo, Rep.',
  'equatorial guinea':           'Equatorial Guinea',
  'guinée équatoriale':          'Equatorial Guinea',
  'guinee equatoriale':          'Equatorial Guinea',
  'gabon':                       'Gabon',
  'rwanda':                      'Rwanda',
  'ouganda':                     'Rwanda', // les entrées Uganda/Rwanda du fichier
};

// ─────────────────────────────────────────────────────────────────────────────
// DMM STATUS CALCULATOR (inline — pas de dépendance externe)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le statut DMM et le niveau d'engagement à partir de
 * totalChurches (TOTAL) et churchGeneration (GEN).
 *
 * Tableau DMM officiel :
 *   GEN 1-2 × CHS 1-33  → pioneer / I
 *   GEN 1-2 × CHS 34-66 → pioneer / II
 *   GEN 1-2 × CHS 67-99 → midway  / II
 *   GEN 1-2 × CHS 100+  → midway  / III
 *   GEN 3-4 × CHS 1-33  → pioneer / I
 *   GEN 3-4 × CHS 34-66 → midway  / II
 *   GEN 3-4 × CHS 67-99 → tipping-point / III
 *   GEN 3-4 × CHS 100+  → dmm     / IV
 *   GEN 5-6 × CHS 1-33  → midway  / II
 *   GEN 5-6 × CHS 34-66 → tipping-point / III
 *   GEN 5-6 × CHS 67+   → dmm     / IV
 *   GEN 7+  × any       → dmm     / IV
 */
function calculateDMMStatus(totalChurches, churchGeneration) {
  const chs = totalChurches  || 0;
  const gen = churchGeneration || 0;

  if (chs === 0 && gen === 0) return { status: 'unreached', level: '' };

  if (gen >= 7) return { status: 'dmm', level: 'IV' };

  if (gen >= 5) {
    if (chs >= 67)  return { status: 'dmm',           level: 'IV' };
    if (chs >= 34)  return { status: 'tipping-point', level: 'III' };
    return            { status: 'midway',              level: 'II' };
  }

  if (gen >= 3) {
    if (chs >= 100) return { status: 'dmm',           level: 'IV' };
    if (chs >= 67)  return { status: 'tipping-point', level: 'III' };
    if (chs >= 34)  return { status: 'midway',        level: 'II' };
    return            { status: 'pioneer',             level: 'I' };
  }

  // gen 1-2
  if (chs >= 100) return { status: 'midway',  level: 'III' };
  if (chs >= 67)  return { status: 'midway',  level: 'II' };
  if (chs >= 34)  return { status: 'pioneer', level: 'II' };
  if (chs >= 1)   return { status: 'pioneer', level: 'I' };

  return { status: 'unreached', level: '' };
}

// ─────────────────────────────────────────────────────────────────────────────
// LECTURE DES ARGUMENTS CLI
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    filePath:     null,
    quarter:      null,
    isDryRun:     false,
    skipPGUpdate: false,
  };
  for (const arg of args) {
    if (arg.startsWith('--file='))    opts.filePath     = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--quarter=')) opts.quarter = arg.split('=')[1];
    else if (arg === '--dry-run')     opts.isDryRun     = true;
    else if (arg === '--skip-pg-update') opts.skipPGUpdate = true;
  }
  return opts;
}

/**
 * Auto-détecte le trimestre depuis le nom du fichier.
 * Ex: "FRANCOPHONE_CENTRAL_AFRICA_1Q26.xlsx" → "Q1-2026"
 */
function detectQuarterFromFilename(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  const match = base.match(/(\d)[Qq](\d{2,4})/);
  if (!match) return null;
  const qNum = match[1];
  let year = parseInt(match[2]);
  if (year < 100) year += 2000;
  return `Q${qNum}-${year}`;
}

/**
 * Normalise le nom de pays
 */
function normalizeCountry(raw) {
  if (!raw) return '';
  const key = String(raw).trim().toLowerCase();
  return COUNTRY_NORMALIZE[key] || String(raw).trim();
}

/**
 * Convertit la valeur d'une cellule Excel en nombre (0 si vide/erreur)
 */
function toNum(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'string' && (val.startsWith('#') || val.trim() === '')) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Convertit la valeur d'une cellule Excel en chaîne propre
 */
function toStr(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  return s.startsWith('#') ? '' : s; // ignore les erreurs Excel (#N/A, #REF!, etc.)
}

/**
 * Convertit un numéro de série Excel en objet Date JS
 */
function excelDateToDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  // Excel date serial : 1 = 1 jan 1900
  const d = new Date((serial - 25569) * 86400 * 1000);
  return isNaN(d.getTime()) ? null : d;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING PEUPLE ← BASE DE DONNÉES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cherche un PeopleGroup existant par :
 * 1. JP People_Group ID (le plus fiable)
 * 2. Nom exact + pays
 * 3. Nom normalisé (lowercase, sans espaces extra) + pays
 */
async function findExistingPeopleGroup(jpId, name, country) {
  // 1. Par JP ID (si disponible et valide)
  if (jpId && jpId !== '#N/A' && jpId !== '' && !isNaN(jpId)) {
    const byJP = await PeopleGroup.findOne({
      'jpData.peopleId': String(jpId),
      approved: true,
    });
    if (byJP) return byJP;
  }

  // 2. Par nom exact + pays (case-insensitive)
  const byExact = await PeopleGroup.findOne({
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    country: { $regex: new RegExp(`^${country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    approved: true,
  });
  if (byExact) return byExact;

  // 3. Par nom normalisé (sans caractères spéciaux)
  const normalName = name.toLowerCase().replace(/[\s\-\/]+/g, ' ').trim();
  const byNorm = await PeopleGroup.findOne({
    approved: true,
    $where: `this.name.toLowerCase().replace(/[\\s\\-\\/]+/g,' ').trim() === "${normalName}"`,
  }).catch(() => null);

  return byNorm || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE UNE LIGNE DU FICHIER EXCEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforme une ligne de Sheet1 en objet structuré
 */
function parseSheet1Row(row) {
  // row = tableau de valeurs selon l'ordre des colonnes
  const [
    ngKey, dateSerial, regionId, region, regionOld,
    engagementId, countryOld, country, countryId, engagementName,
    jpId, peopleGroupName,
    dbs, com, cat, total, gen, avgChurchSize,
    newDisciples, newBaptisms, mbPct, mbbCount, otherFollowers,
    notes, leadersTraining, activeTrainers, trainingsHeld,
    highestTrainingLevel, trainingCategory,
    mbDecimal, mbChurches, gStatus, priority, lostChs, mergedChs,
  ] = row;

  const countryNorm = normalizeCountry(country || countryOld);

  return {
    ngKey:               toNum(ngKey),
    reportDate:          excelDateToDate(dateSerial),
    region:              toStr(region || regionOld),
    country:             countryNorm,
    countryCode:         COUNTRY_CODE_MAP[countryNorm] || '',
    engagementId:        toNum(engagementId),
    engagementName:      toStr(engagementName),
    jpPeopleGroupId:     toStr(jpId),
    peopleGroupName:     toStr(peopleGroupName).trim(),
    dbs:                 toNum(dbs),
    com:                 toNum(com),
    cat:                 toNum(cat),
    totalChurches:       toNum(total),
    churchGeneration:    toNum(gen),
    avgChurchSize:       toNum(avgChurchSize),
    newDisciples:        toNum(newDisciples),
    newBaptisms:         toNum(newBaptisms),
    mbPercent:           toNum(mbPct),
    mbbCount:            toNum(mbbCount),
    otherChristFollowers:toNum(otherFollowers),
    notes:               toStr(notes),
    leadersInTraining:   toNum(leadersTraining),
    activeTrainers:      toNum(activeTrainers),
    trainingsHeld:       toNum(trainingsHeld),
    highestTrainingLevel:toStr(highestTrainingLevel),
    trainingCategory:    toStr(trainingCategory),
    mbDecimal:           toNum(mbDecimal),
    mbChurches:          toNum(mbChurches),
    gStatus:             toStr(gStatus),
    priority:            toStr(priority),
    lostChurches:        toNum(lostChs),
    mergedChurches:      toNum(mergedChs),
  };
}

/**
 * Transforme une ligne de l'onglet NEW PGs
 */
function parseNewPGRow(row) {
  const [
    dateSerial, region, country, peopleGroupName,
    dbs, com, cat, total, gen, avgChurchSize,
    newDisciples, newBaptisms, mbPct, mbbCount,
    notes, leadersTraining, activeTrainers, lostChs, mergedChs,
  ] = row;

  const countryNorm = normalizeCountry(country);

  return {
    reportDate:           excelDateToDate(typeof dateSerial === 'number' ? dateSerial : null),
    region:               toStr(region),
    country:              countryNorm,
    countryCode:          COUNTRY_CODE_MAP[countryNorm] || '',
    jpPeopleGroupId:      '',
    peopleGroupName:      toStr(peopleGroupName).trim(),
    engagementName:       `${countryNorm}-${toStr(peopleGroupName).trim()}`,
    dbs:                  toNum(dbs),
    com:                  toNum(com),
    cat:                  toNum(cat),
    totalChurches:        toNum(total),
    churchGeneration:     toNum(gen),
    avgChurchSize:        toNum(avgChurchSize),
    newDisciples:         toNum(newDisciples),
    newBaptisms:          toNum(newBaptisms),
    mbPercent:            toNum(mbPct),
    mbbCount:             toNum(mbbCount),
    notes:                toStr(notes),
    leadersInTraining:    toNum(leadersTraining),
    activeTrainers:       toNum(activeTrainers),
    lostChurches:         toNum(lostChs),
    mergedChurches:       toNum(mergedChs),
    isNewPG:              true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAITEMENT D'UNE LIGNE
// ─────────────────────────────────────────────────────────────────────────────

async function processRow(data, quarter, year, quarterNumber, adminUserId, sourceFile, opts, stats) {
  if (!data.peopleGroupName || data.peopleGroupName === '') {
    stats.skipped++;
    return;
  }

  // Calcul du statut DMM
  const { status: calculatedStatus, level: calculatedLevel } = calculateDMMStatus(
    data.totalChurches,
    data.churchGeneration
  );

  // Chercher le PeopleGroup existant
  const existingPG = await findExistingPeopleGroup(
    data.jpPeopleGroupId,
    data.peopleGroupName,
    data.country
  );

  // Chercher le rapport du trimestre précédent pour calculer le delta
  let delta = {
    totalChurches:  null,
    newDisciples:   null,
    newBaptisms:    null,
    mbbCount:       null,
    statusChanged:  false,
    previousStatus: '',
  };

  if (existingPG) {
    const prevQNum = quarterNumber === 1 ? 4 : quarterNumber - 1;
    const prevYear = quarterNumber === 1 ? year - 1 : year;
    const prevQuarter = `Q${prevQNum}-${prevYear}`;
    const prevReport = await QuarterlyReport.findOne({
      quarter: prevQuarter,
      peopleGroup: existingPG._id,
    });
    if (prevReport) {
      delta.totalChurches  = data.totalChurches  - (prevReport.totalChurches  || 0);
      delta.newDisciples   = data.newDisciples   - (prevReport.newDisciples   || 0);
      delta.newBaptisms    = data.newBaptisms    - (prevReport.newBaptisms    || 0);
      delta.mbbCount       = data.mbbCount       - (prevReport.mbbCount       || 0);
      delta.previousStatus = prevReport.calculatedStatus || '';
      delta.statusChanged  = calculatedStatus !== prevReport.calculatedStatus
                              && prevReport.calculatedStatus !== '';
    }
  }

  if (opts.isDryRun) {
    const action = existingPG ? 'UPDATE' : 'NEW';
    const alert = delta.statusChanged ? ` 🎉 PERCÉE: ${delta.previousStatus} → ${calculatedStatus}` : '';
    const mbb   = data.mbbCount > 0   ? ` | MBB:${data.mbbCount}` : '';
    console.log(`   [${action}] ${data.country}/${data.peopleGroupName} → ${calculatedStatus} (L${calculatedLevel}) | CHS:${data.totalChurches} GEN:${data.churchGeneration}${mbb}${alert}`);
    stats.dryRun++;
    return;
  }

  // ── Sauvegarder le QuarterlyReport ─────────────────────────────────────────
  const reportData = {
    quarter,
    year,
    quarterNumber,
    reportDate:         data.reportDate,
    region:             data.region,
    country:            data.country,
    countryCode:        data.countryCode,
    peopleGroup:        existingPG?._id || null,
    peopleGroupName:    data.peopleGroupName,
    engagementName:     data.engagementName || `${data.country}-${data.peopleGroupName}`,
    jpPeopleGroupId:    data.jpPeopleGroupId,
    ngKey:              data.ngKey || undefined,
    engagementId:       data.engagementId || undefined,
    dbs:                data.dbs,
    com:                data.com,
    cat:                data.cat,
    totalChurches:      data.totalChurches,
    churchGeneration:   data.churchGeneration,
    avgChurchSize:      data.avgChurchSize,
    newDisciples:       data.newDisciples,
    newBaptisms:        data.newBaptisms,
    mbPercent:          data.mbPercent,
    mbbCount:           data.mbbCount,
    otherChristFollowers: data.otherChristFollowers || 0,
    mbDecimal:          data.mbDecimal || 0,
    mbChurches:         data.mbChurches || 0,
    leadersInTraining:  data.leadersInTraining,
    activeTrainers:     data.activeTrainers,
    trainingsHeld:      data.trainingsHeld || 0,
    highestTrainingLevel: data.highestTrainingLevel || '',
    trainingCategory:   data.trainingCategory || '',
    lostChurches:       data.lostChurches,
    mergedChurches:     data.mergedChurches,
    gStatus:            data.gStatus || '',
    priority:           data.priority || '',
    calculatedStatus,
    calculatedLevel,
    delta,
    notes:              data.notes,
    isNewPG:            data.isNewPG || false,
    importedBy:         adminUserId,
    sourceFile,
  };

  await QuarterlyReport.findOneAndUpdate(
    { quarter, peopleGroupName: data.peopleGroupName, country: data.country },
    reportData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // ── Mettre à jour le PeopleGroup si demandé ─────────────────────────────────
  if (existingPG && !opts.skipPGUpdate) {
    await PeopleGroup.findByIdAndUpdate(existingPG._id, {
      $set: {
        numberOfChurches:  data.totalChurches,
        churchGeneration:  data.churchGeneration,
        engagementStatus:  calculatedStatus,
        engagementLevel:   calculatedLevel,
        status:            calculatedStatus,
        // MBB
        ...(data.mbbCount > 0 ? { believersCount: data.mbbCount } : {}),
      },
    });
    stats.pgUpdated++;
  }

  if (delta.statusChanged) {
    stats.statusChanges.push({
      name: data.peopleGroupName,
      country: data.country,
      from: delta.previousStatus,
      to: calculatedStatus,
    });
  }

  existingPG ? stats.updated++ : stats.created++;
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  const opts = parseArgs();

  if (!opts.filePath) {
    console.error('❌  Argument manquant : --file=<chemin>');
    console.error('    Exemple: node scripts/importQuarterlyReport.js --file=../data/FRANCOPHONE_CENTRAL_AFRICA_1Q26.xlsx');
    process.exit(1);
  }

  const absolutePath = path.resolve(__dirname, opts.filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌  Fichier introuvable : ${absolutePath}`);
    process.exit(1);
  }

  // Détection du trimestre
  const quarter = opts.quarter || detectQuarterFromFilename(absolutePath);
  if (!quarter) {
    console.error('❌  Impossible de détecter le trimestre depuis le nom du fichier.');
    console.error('    Utilisez --quarter=Q1-2026 pour le spécifier manuellement.');
    process.exit(1);
  }

  const qMatch = quarter.match(/^Q(\d)-(\d{4})$/);
  const quarterNumber = parseInt(qMatch[1]);
  const year          = parseInt(qMatch[2]);

  const sourceFile = path.basename(absolutePath);

  // ── Banner ─────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(65));
  console.log('  📊  Import Rapport Trimestriel DMM');
  console.log('═'.repeat(65));
  console.log(`  Fichier    : ${sourceFile}`);
  console.log(`  Trimestre  : ${quarter}`);
  console.log(`  Mode       : ${opts.isDryRun ? '🔍 DRY RUN — rien ne sera sauvegardé' : '🚀 IMPORT RÉEL'}`);
  console.log(`  PG Update  : ${opts.skipPGUpdate ? 'NON' : 'OUI — PeopleGroups mis à jour'}`);
  console.log('═'.repeat(65) + '\n');

  const stats = {
    created: 0, updated: 0, skipped: 0, dryRun: 0,
    newPGs: 0, pgUpdated: 0, errors: 0,
    statusChanges: [],
    byCountry: {},
  };

  try {
    // ── Connexion MongoDB ──────────────────────────────────────────────────
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-planting-map';
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté\n');

    // ── Utilisateur admin ──────────────────────────────────────────────────
    let adminUser = await User.findOne({ email: ADMIN_EMAIL })
                 || await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.warn('⚠️  Utilisateur admin introuvable — utilisation d\'un ObjectId système');
      adminUser = { _id: new mongoose.Types.ObjectId() };
    } else {
      console.log(`👤 Importé par : ${adminUser.name || adminUser.email}\n`);
    }

    // ── Lecture du fichier Excel ───────────────────────────────────────────
    console.log(`📂 Lecture de ${sourceFile}...`);
    const workbook = XLSX.readFile(absolutePath, { cellDates: false });
    console.log(`✅ Feuilles trouvées : ${workbook.SheetNames.join(', ')}\n`);

    // ── FEUILLE 1 : Sheet1 ─────────────────────────────────────────────────
    const ws1 = workbook.Sheets['Sheet1'];
    if (!ws1) throw new Error('Feuille "Sheet1" introuvable dans le fichier Excel');

    // Lire à partir de la ligne 2 (ligne 1 = "Please DO NOT Update", ligne 2 = headers)
    const sheet1Data = XLSX.utils.sheet_to_json(ws1, {
      header: 1,
      range: 1,      // Commence à la ligne index 1 (= ligne Excel 2 = headers)
      defval: null,
    });

    // Ligne 0 = headers, lignes 1+ = données
    const dataRows = sheet1Data.slice(1).filter(row =>
      row && row[7] && String(row[7]).trim() !== '' // Country non vide
    );

    console.log(`📋 Sheet1 : ${dataRows.length} lignes de données\n`);
    console.log('📊 Traitement en cours...\n');

    const startTime = Date.now();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const country = normalizeCountry(row[7] || row[6]);
      stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;

      try {
        const data = parseSheet1Row(row);
        await processRow(data, quarter, year, quarterNumber, adminUser._id, sourceFile, opts, stats);
      } catch (err) {
        stats.errors++;
        if (stats.errors <= 5) {
          console.error(`   ❌ Ligne ${i + 3} : ${err.message}`);
        }
      }
    }

    // ── FEUILLE 2 : NEW PGs ────────────────────────────────────────────────
    const wsNewPGs = workbook.Sheets['NEW PGs'];
    if (wsNewPGs) {
      const newPGData = XLSX.utils.sheet_to_json(wsNewPGs, {
        header: 1,
        range: 0,
        defval: null,
      });

      // Ligne 0 = headers, lignes 1+ = données
      const newPGRows = newPGData.slice(1).filter(row =>
        row && row[3] && String(row[3]).trim() !== '' // PEOPLE GROUP non vide
      );

      console.log(`\n🆕 NEW PGs : ${newPGRows.length} nouveau(x) peuple(s)\n`);

      for (let i = 0; i < newPGRows.length; i++) {
        const row = newPGRows[i];
        try {
          const data = parseNewPGRow(row);
          if (!data.peopleGroupName) continue;
          await processRow(data, quarter, year, quarterNumber, adminUser._id, sourceFile, opts, stats);
          stats.newPGs++;
        } catch (err) {
          stats.errors++;
          if (stats.errors <= 5) {
            console.error(`   ❌ NEW PGs ligne ${i + 2} : ${err.message}`);
          }
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // ── Résumé ─────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(65));
    console.log(`  ✅  RÉSUMÉ D'IMPORT — ${quarter}`);
    console.log('═'.repeat(65));
    if (opts.isDryRun) {
      console.log(`  🔍 DRY RUN : ${stats.dryRun} lignes analysées`);
    } else {
      console.log(`  ✅ Créés           : ${stats.created}`);
      console.log(`  🔄 Mis à jour      : ${stats.updated}`);
      console.log(`  🆕 Nouveaux peuples: ${stats.newPGs}`);
      console.log(`  👥 PeopleGroups maj: ${stats.pgUpdated}`);
    }
    console.log(`  ⏭️  Ignorés         : ${stats.skipped}`);
    console.log(`  ❌ Erreurs          : ${stats.errors}`);
    console.log(`  ⏱️  Durée           : ${elapsed}s`);

    if (stats.statusChanges.length > 0) {
      console.log('\n' + '─'.repeat(65));
      console.log(`  🎉  PERCÉES CE TRIMESTRE (${stats.statusChanges.length} changements de statut)`);
      console.log('─'.repeat(65));
      stats.statusChanges.forEach(sc => {
        console.log(`  🏆 ${sc.country} / ${sc.name} : ${sc.from} → ${sc.to}`);
      });
    }

    console.log('\n📈 Répartition par pays :');
    Object.entries(stats.byCountry)
      .sort((a, b) => b[1] - a[1])
      .forEach(([country, count]) => {
        const bar = '█'.repeat(Math.min(count, 30));
        console.log(`   ${country.padEnd(30)} ${String(count).padStart(4)}  ${bar}`);
      });

    if (opts.isDryRun) {
      console.log('\n⚠️  DRY RUN — Relancez sans --dry-run pour importer.');
    }

  } catch (err) {
    console.error('\n❌ Erreur fatale :', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB\n');
  }
}

run().catch(console.error);
