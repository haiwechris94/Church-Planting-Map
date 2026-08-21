/**
 * Master People API — read-only endpoints over the canonical people-graph
 * (master_people + people_sources / people_aliases / people_locations /
 * people_matches / people_statuses). See docs/architecture/08-api-architecture.md.
 *
 * Mounted at /api/master-people (see server.js).
 * Always returns exactly ONE marker per master people from /map/markers.
 */
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const MasterPeople = require('../models/MasterPeople');
const PeopleSource = require('../models/PeopleSource');
const PeopleAlias = require('../models/PeopleAlias');
const PeopleLocation = require('../models/PeopleLocation');
const PeopleMatch = require('../models/PeopleMatch');
const PeopleStatus = require('../models/PeopleStatus');
const PeopleGroup = require('../models/PeopleGroup');
const Activity = require('../models/Activity');
const Village = require('../models/Village');

const fs = require('fs');
const path = require('path');

// ── Admin polygon helpers (territorial coverage) ─────────────────────────────
const DATA_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'data');
const ADMIN_FILES = {
  CMR: 'Admin123CMR fusionnées.geojson',
  CAF: 'CAF_admin123.geojson',
  TCD: 'TCD_admin123.geojson',
  GAB: 'GAB_admin123.geojson',
  COG: 'Admin123COG fusionnées.geojson',
  COD: 'Admin123COD fusionnées.geojson',
  GNQ: 'Admin123GNQ fusionnées.geojson',
};
const _adminCache = new Map();
function loadAdmin(code3) {
  if (!code3 || !ADMIN_FILES[code3]) return null;
  if (_adminCache.has(code3)) return _adminCache.get(code3);
  let gj = null;
  try {
    gj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, ADMIN_FILES[code3]), 'utf8'));
  } catch (e) {
    gj = null;
  }
  _adminCache.set(code3, gj);
  return gj;
}
function admLevel(props = {}) {
  if (props.admin_level != null) return Number(props.admin_level);
  if (!props.GID_2) return 1;
  if (!props.GID_3) return 2;
  return 3;
}
function admName(props = {}, lvl) {
  if (lvl === 1) return props.NAME_1 || props.name || '';
  if (lvl === 2) return props.NAME_2 || props.name || '';
  return props.NAME_3 || props.name || '';
}
function ringContains(pt, ring) {
  const [px, py] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function featureContains(lngLat, feature) {
  const g = feature && feature.geometry;
  if (!g) return false;
  if (g.type === 'Polygon') return ringContains(lngLat, g.coordinates[0]);
  if (g.type === 'MultiPolygon') return g.coordinates.some((poly) => ringContains(lngLat, poly[0]));
  return false;
}
const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── helpers ──────────────────────────────────────────────────────────────────
const toList = (v) =>
  (v === undefined || v === null || v === '')
    ? null
    : String(v).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Build the shared master_people filter from query params. */
function buildFilter(q) {
  const filter = {};
  const sources = toList(q.source);
  if (sources) filter.sourceTypes = { $in: sources };
  if (q.country) filter.primaryCountryCode = String(q.country).trim().toUpperCase();
  if (q.status) filter['status.status'] = String(q.status).trim().toUpperCase();
  if (q.q && String(q.q).trim()) {
    filter.canonicalName = { $regex: String(q.q).trim(), $options: 'i' };
  }
  return filter;
}

// ── GET /  — paginated list of master people ─────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const filter = buildFilter(req.query);

    const [items, total] = await Promise.all([
      MasterPeople.find(filter)
        .sort({ canonicalName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MasterPeople.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /map/markers — ONE marker per master people (map-optimized) ──────────
router.get('/map/markers', async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    // Only masters that have a display point.
    filter.primaryLocation = { $ne: null };

    // Optional bbox: "minLng,minLat,maxLng,maxLat"
    if (req.query.bbox) {
      const parts = String(req.query.bbox).split(',').map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        filter.primaryLocation = {
          $geoWithin: { $box: [[minLng, minLat], [maxLng, maxLat]] },
        };
      }
    }

    const cap = Math.min(20000, Math.max(1, parseInt(req.query.limit, 10) || 20000));

    const docs = await MasterPeople.find(filter, {
      canonicalName: 1,
      rop3: 1,
      primaryCountryCode: 1,
      sourceTypes: 1,
      primaryLocation: 1,
      status: 1,
      totalPopulation: 1,
    })
      .limit(cap)
      .lean();

    const markers = docs.map((d) => ({
      id: d._id,
      name: d.canonicalName,
      rop3: d.rop3 || null,
      coordinates: d.primaryLocation ? d.primaryLocation.coordinates : null, // [lng,lat]
      sourceTypes: d.sourceTypes || [],
      status: d.status ? d.status.status : null,
      country: d.primaryCountryCode || null,
      population: d.totalPopulation || 0,
    }));

    res.json({ count: markers.length, markers });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — one master people (full) ──────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const doc = await MasterPeople.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Master people not found' });

    // Attach the aggregated status doc if present.
    const status = await PeopleStatus.findOne({ masterPeopleId: doc._id }).lean();
    res.json({ ...doc, statusDetail: status || null });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/sources — all contributing source records (with raw attributes) ─
router.get('/:id/sources', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const sources = await PeopleSource.find({ masterPeopleId: req.params.id }).lean();
    res.json({ count: sources.length, sources });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/aliases ─────────────────────────────────────────────────────────
router.get('/:id/aliases', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const aliases = await PeopleAlias.find({ masterPeopleId: req.params.id }).lean();
    res.json({ count: aliases.length, aliases });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/coordinates ─────────────────────────────────────────────────────
router.get('/:id/coordinates', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const coords = await PeopleLocation.find({ masterPeopleId: req.params.id }).lean();
    res.json({ count: coords.length, coordinates: coords });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/matches — merge-decision audit trail ────────────────────────────
router.get('/:id/matches', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const matches = await PeopleMatch.find({ masterPeopleId: req.params.id }).lean();
    res.json({ count: matches.length, matches });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/profile — consolidated profile for the detail panel ─────────────
// Aggregates overview (language, religion, photo, description, region), sources
// with a normalized "lastSyncedAt" + per-source coordinates, a population
// breakdown, and localisation (representative point). Fields that are absent
// from the imported source data are returned as null.
router.get('/:id/profile', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const master = await MasterPeople.findById(req.params.id).lean();
    if (!master) return res.status(404).json({ error: 'Master people not found' });

    const [sources, aliases, statusDetail] = await Promise.all([
      PeopleSource.find({ masterPeopleId: master._id }).lean(),
      PeopleAlias.find({ masterPeopleId: master._id }).lean(),
      PeopleStatus.findOne({ masterPeopleId: master._id }).lean(),
    ]);

    // Derive overview fields from raw source rows, preferring a stable order.
    const ORDER = ['JP', 'CPPI', 'DMM', 'FTT', 'SURVEY', 'MANUAL'];
    const ordered = [...sources].sort(
      (a, b) => ORDER.indexOf(a.sourceType) - ORDER.indexOf(b.sourceType)
    );

    const pick = (keys) => {
      for (const src of ordered) {
        const raw = src.rawAttributes || {};
        for (const k of keys) {
          if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
            return String(raw[k]).trim();
          }
        }
      }
      return null;
    };

    const religion = pick(['Rlgn', 'PrimaryReligion', 'ReligionPrimary', 'Religion', 'RlgnDesc']);
    const description = pick(['PeopleDesc', 'Summary', 'Introduction', 'Description', 'LocationDesc']);
    let photoUrl = pick(['PicURL', 'PhotoAddress', 'PeopleGroupPhotoURL', 'PhotoURL', 'Photo']);
    if (photoUrl && !/^https?:\/\//i.test(photoUrl)) {
      // Bare filename (common for JP/CPPI exports) — best-effort JP profile URL.
      photoUrl = `https://joshuaproject.net/assets/media/profiles/photos/${photoUrl}`;
    }
    const language = master.primaryLanguageName || pick(['Lang', 'PrimaryLanguageName', 'Language']);
    const region = pick(['Regn', 'RegionName', 'Region', 'RegnSub']);

    const normSyncDate = (s) =>
      s.sourceUpdatedAt ||
      (s.rawAttributes && (s.rawAttributes.UpdatedDate || s.rawAttributes.UpdateDate)) ||
      s.updatedAt ||
      s.importedAt ||
      null;

    const num = (v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);
    const sourceRows = ordered.map((s) => {
      const raw = s.rawAttributes || {};
      const lng = num(raw.Longitude);
      const lat = num(raw.Latitude);
      return {
        id: s._id,
        sourceType: s.sourceType,
        sourceRecordId: s.sourceRecordId,
        sourceName: s.sourceName || null,
        countryName: s.countryName || s.countryCode || null,
        population: s.population != null ? s.population : null,
        lastSyncedAt: normSyncDate(s),
        coordinates: lng != null && lat != null ? [lng, lat] : null,
      };
    });

    const representative = master.primaryLocation ? master.primaryLocation.coordinates : null;

    res.json({
      id: master._id,
      overview: {
        name: master.canonicalName,
        status: master.status ? master.status.status : null,
        jpScale: master.status ? master.status.jpScale : null,
        leastReached: master.status ? master.status.leastReached : null,
        country: master.primaryCountryCode || null,
        region,
        language,
        religion,
        description,
        photoUrl,
        totalPopulation: master.totalPopulation || 0,
        rop3: master.rop3 || null,
      },
      sources: sourceRows,
      population: {
        total: master.totalPopulation || 0,
        bySource: sourceRows.map((s) => ({ sourceType: s.sourceType, population: s.population })),
      },
      localisation: {
        representative, // [lng, lat] or null
        method: 'Calculée',
        sourcePoints: sourceRows
          .filter((s) => s.coordinates)
          .map((s) => ({ sourceType: s.sourceType, coordinates: s.coordinates })),
        coverage: null, // territorial coverage (region/districts/…) : agrégation polygones à venir
      },
      aliases: aliases.map((a) => a.alias).filter(Boolean),
      statusDetail: statusDetail || null,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/coverage — territorial coverage (admin polygons + villages) ─────
// Attaches the people's point(s) (representative + per-source raw coordinates)
// to administrative polygons (GADM region/dept/arrondissement) and to village
// polygons (Village.boundary), returning per-level counts and a territory list
// suitable for the "Territoires" table.
router.get('/:id/coverage', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const master = await MasterPeople.findById(req.params.id).lean();
    if (!master) return res.status(404).json({ error: 'Master people not found' });

    const sources = await PeopleSource.find({ masterPeopleId: master._id }).lean();

    // Collect all known points for this people (dedup, [lng, lat]).
    const points = [];
    const seenPt = new Set();
    const pushPt = (c) => {
      if (!Array.isArray(c) || c.length !== 2) return;
      const lng = Number(c[0]); const lat = Number(c[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      const k = `${lng.toFixed(5)},${lat.toFixed(5)}`;
      if (seenPt.has(k)) return;
      seenPt.add(k);
      points.push([lng, lat]);
    };
    if (master.primaryLocation) pushPt(master.primaryLocation.coordinates);
    for (const s of sources) {
      const raw = s.rawAttributes || {};
      pushPt([raw.Longitude, raw.Latitude]);
    }

    // Administrative polygons (region/dept/arrondissement) via point-in-polygon.
    const code3 = (master.primaryCountryCode || '').toUpperCase();
    const admin = loadAdmin(code3);
    const territories = [];
    const byLevel = { 1: new Set(), 2: new Set(), 3: new Set() };
    const LEVEL_LABEL = { 1: 'Région', 2: 'Département', 3: 'Arrondissement' };
    if (admin && Array.isArray(admin.features) && points.length) {
      for (const f of admin.features) {
        const lvl = admLevel(f.properties || {});
        if (![1, 2, 3].includes(lvl)) continue;
        if (!points.some((p) => featureContains(p, f))) continue;
        const gid = (f.properties && f.properties[`GID_${lvl}`]) || admName(f.properties, lvl);
        if (byLevel[lvl].has(gid)) continue;
        byLevel[lvl].add(gid);
        territories.push({
          name: admName(f.properties, lvl) || 'Inconnu',
          level: LEVEL_LABEL[lvl],
          type: (f.properties && f.properties[`TYPE_${lvl}`]) || null,
          coverageStatus: null,
          population: null,
          area: null,
        });
      }
    }

    // Village polygons from the DB (boundary contains the point).
    const villageTerritories = [];
    const seenV = new Set();
    for (const p of points) {
      let vs = [];
      try {
        vs = await Village.find({
          boundary: { $geoIntersects: { $geometry: { type: 'Point', coordinates: p } } },
        })
          .select('name status population area region departement arrondissement')
          .limit(10)
          .lean();
      } catch (e) {
        vs = [];
      }
      for (const v of vs) {
        const key = String(v._id);
        if (seenV.has(key)) continue;
        seenV.add(key);
        villageTerritories.push({
          name: v.name,
          level: 'Village',
          type: 'Village',
          coverageStatus: v.status || null,
          population: v.population || null,
          area: v.area || null,
        });
      }
    }

    const allTerritories = [...territories, ...villageTerritories];
    const totalPop = allTerritories.reduce((s, t) => s + (t.population || 0), 0);

    res.json({
      id: master._id,
      pointsUsed: points.length,
      counts: {
        region: byLevel[1].size,
        departement: byLevel[2].size,
        arrondissement: byLevel[3].size,
        village: villageTerritories.length,
      },
      territories: allTerritories,
      totalPopulation: totalPop || null,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id/activities — activities linked to this people ───────────────────
// Activities reference the legacy PeopleGroup collection, so we resolve
// candidate people groups by exact name (case-insensitive) and by geographic
// proximity to the representative point, then return their recent activities.
router.get('/:id/activities', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const master = await MasterPeople.findById(req.params.id).lean();
    if (!master) return res.status(404).json({ error: 'Master people not found' });

    const pgIds = new Set();
    if (master.canonicalName) {
      const byName = await PeopleGroup.find({
        name: new RegExp(`^${escapeRegExp(master.canonicalName)}$`, 'i'),
      }).select('_id').limit(50).lean();
      byName.forEach((p) => pgIds.add(String(p._id)));
    }
    const rep = master.primaryLocation && master.primaryLocation.coordinates;
    if (Array.isArray(rep) && rep.length === 2) {
      try {
        const near = await PeopleGroup.find({
          location: { $near: { $geometry: { type: 'Point', coordinates: rep }, $maxDistance: 8000 } },
        }).select('_id').limit(50).lean();
        near.forEach((p) => pgIds.add(String(p._id)));
      } catch (e) { /* no geo index / no match */ }
    }

    let activities = [];
    if (pgIds.size) {
      activities = await Activity.find({
        peopleGroup: { $in: [...pgIds] },
        archived: { $ne: true },
      })
        .sort({ date: -1 })
        .limit(50)
        .populate('village', 'name')
        .populate('user', 'name email')
        .lean();
    }

    res.json({
      count: activities.length,
      linkedPeopleGroups: pgIds.size,
      activities: activities.map((a) => ({
        id: a._id,
        type: a.type,
        date: a.date,
        description: a.description,
        participants: a.participants || 0,
        village: a.village ? a.village.name : null,
        user: a.user ? (a.user.name || a.user.email) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
