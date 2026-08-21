const express = require('express');
const mongoose = require('mongoose');
const Church = require('../models/Church');
const DiscoveryGroup = require('../models/DiscoveryGroup');
const DBSSession = require('../models/DBSSession');
const PersonOfPeace = require('../models/PersonOfPeace');
const CoachingSession = require('../models/CoachingSession');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Build the Cityteam-style numerical DMM report for a date window.
 * All counts guard against empty results (return 0, never null).
 */
async function buildNumericalReport({ from, to, organization }) {
  const orgMatch = organization ? { organization: new mongoose.Types.ObjectId(organization) } : {};
  const windowMatch = {};
  if (from || to) {
    windowMatch.$gte = from ? new Date(from) : new Date(0);
    windowMatch.$lte = to ? new Date(to) : new Date();
  }
  const hasWindow = from || to;

  // ── Disciples (from DBS sessions in the window) ─────────────────────────
  const dbsMatch = { ...orgMatch };
  if (hasWindow) dbsMatch.date = windowMatch;
  const [discipleAgg] = await DBSSession.aggregate([
    { $match: dbsMatch },
    {
      $group: {
        _id: null,
        newDisciples: { $sum: { $ifNull: ['$decisionsForChrist', 0] } },
        baptized: { $sum: { $ifNull: ['$baptisms', 0] } },
      },
    },
  ]);

  // ── Discovery groups ────────────────────────────────────────────────────
  const dgTotal = await DiscoveryGroup.countDocuments({ ...orgMatch });
  const dgActive = await DiscoveryGroup.countDocuments({ ...orgMatch, status: 'active' });
  const dgBecameChurch = await DiscoveryGroup.countDocuments({ ...orgMatch, status: 'became-church' });

  // ── Churches ────────────────────────────────────────────────────────────
  const churchTotal = await Church.countDocuments({ lifecycleStatus: 'active' });
  const churchCommissioned = await Church.countDocuments({ lifecycleStatus: 'active', planterType: 'commissioned' });
  const churchCatalytic = await Church.countDocuments({ lifecycleStatus: 'active', planterType: 'catalytic' });
  const churchMerged = await Church.countDocuments({ lifecycleStatus: 'merged' });
  const churchDied = await Church.countDocuments({ lifecycleStatus: 'died' });

  const genAgg = await Church.aggregate([
    { $match: { lifecycleStatus: 'active' } },
    { $group: { _id: '$generation', count: { $sum: 1 } } },
  ]);
  const byGeneration = { 1: 0, 2: 0, 3: 0, '4plus': 0 };
  genAgg.forEach((g) => {
    const gen = g._id || 1;
    if (gen >= 4) byGeneration['4plus'] += g.count;
    else byGeneration[gen] = (byGeneration[gen] || 0) + g.count;
  });

  // ── Persons of peace ──────────────────────────────────────────────────────
  const popAgg = await PersonOfPeace.aggregate([
    { $match: { ...orgMatch } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = { identified: 0, engaging: 0, confirmed: 0, leading: 0, inactive: 0 };
  let popTotal = 0;
  popAgg.forEach((s) => {
    if (s._id && byStatus[s._id] !== undefined) byStatus[s._id] = s.count;
    popTotal += s.count;
  });

  // ── Leaders ───────────────────────────────────────────────────────────────
  const inTraining = byStatus.engaging + byStatus.confirmed + byStatus.leading;
  const deployMatch = { ...orgMatch, status: 'leading' };
  if (hasWindow) deployMatch.createdAt = windowMatch;
  const newLeadersDeployed = await PersonOfPeace.countDocuments(deployMatch);

  const coachMatch = {};
  if (hasWindow) coachMatch.date = windowMatch;
  const activeCoaches = (await CoachingSession.distinct('coach', coachMatch)).length;

  return {
    period: { from: from || null, to: to || null },
    disciples: {
      newDisciples: discipleAgg ? discipleAgg.newDisciples : 0,
      baptized: discipleAgg ? discipleAgg.baptized : 0,
    },
    discoveryGroups: { total: dgTotal, active: dgActive, becameChurch: dgBecameChurch },
    churches: {
      total: churchTotal,
      commissioned: churchCommissioned,
      catalytic: churchCatalytic,
      byGeneration,
      mergedOrDied: { merged: churchMerged, died: churchDied },
    },
    leaders: { inTraining, activeCoaches, newLeadersDeployed },
    personsOfPeace: { total: popTotal, byStatus },
  };
}

// GET /api/reporting/numerical?from=&to=&organization=
router.get('/numerical', optionalAuth, async (req, res) => {
  try {
    const { from, to, organization } = req.query;
    const report = await buildNumericalReport({ from, to, organization });
    res.json({ data: report });
  } catch (error) {
    console.error('Error building numerical report:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// GET /api/reporting/quarterly?year=&quarter=&organization=
router.get('/quarterly', optionalAuth, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const quarter = Math.min(4, Math.max(1, parseInt(req.query.quarter) || 1));
    const startMonth = (quarter - 1) * 3; // 0,3,6,9
    const from = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
    const to = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59)); // last day of quarter
    const report = await buildNumericalReport({
      from: from.toISOString(),
      to: to.toISOString(),
      organization: req.query.organization,
    });
    report.quarter = { year, quarter };
    res.json({ data: report });
  } catch (error) {
    console.error('Error building quarterly report:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
