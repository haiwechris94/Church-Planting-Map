/**
 * Analytics Routes - Statistics, heatmaps, and timeline data
 */
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const XLSX = require('xlsx');
const os = require('os');
const path = require('path');
const fs = require('fs');
const turf = require('@turf/turf');
const Village = require('../models/Village');
const PeopleGroup = require('../models/PeopleGroup');
const Church = require('../models/Church');
const ActivityLog = require('../models/ActivityLog');
const QuarterlyReport = require('../models/QuarterlyReport');
const { auth, optionalAuth } = require('../middleware/auth');
const { isSupervisorOrAdmin, hasPermission } = require('../middleware/roles');
const { generateAnalysisInsights } = require('../services/deepseekService');

// ── Multer — stockage temporaire en mémoire pour les fichiers Excel ──────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ]
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.xlsx' || ext === '.xls' || allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) sont acceptés'))
    }
  },
})

// ── Helpers partagés avec importQuarterlyReport.js ───────────────────────────
const COUNTRY_CODE_MAP = {
  'Cameroon': 'CM', 'Central African Republic': 'CF', 'Chad': 'TD',
  'Congo, Dem. Rep.': 'CD', 'Congo, Rep.': 'CG', 'Equatorial Guinea': 'GQ',
  'Gabon': 'GA', 'Rwanda': 'RW',
}
const COUNTRY_NORMALIZE = {
  'cameroun': 'Cameroon', 'cameroon': 'Cameroon',
  'car': 'Central African Republic', 'central african republic': 'Central African Republic',
  'rca': 'Central African Republic', 'centrafrique': 'Central African Republic',
  'chad': 'Chad', 'tchad': 'Chad',
  'congo, dem. rep.': 'Congo, Dem. Rep.', 'rd congo': 'Congo, Dem. Rep.',
  'rdc': 'Congo, Dem. Rep.', 'congo drc': 'Congo, Dem. Rep.',
  'congo, rep.': 'Congo, Rep.', 'congo rep': 'Congo, Rep.',
  'congo brazzaville': 'Congo, Rep.',
  'equatorial guinea': 'Equatorial Guinea',
  'guinée équatoriale': 'Equatorial Guinea', 'guinee equatoriale': 'Equatorial Guinea',
  'gabon': 'Gabon', 'rwanda': 'Rwanda',
}
const normalizeCountry = (raw) => {
  if (!raw) return ''
  const key = String(raw).trim().toLowerCase()
  return COUNTRY_NORMALIZE[key] || String(raw).trim()
}
const toNum = (val) => {
  if (val === null || val === undefined) return 0
  if (typeof val === 'string' && (val.startsWith('#') || !val.trim())) return 0
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}
const toStr = (val) => {
  if (val === null || val === undefined) return ''
  const s = String(val).trim()
  return s.startsWith('#') ? '' : s
}
const excelDateToDate = (serial) => {
  if (!serial || typeof serial !== 'number') return null
  const d = new Date((serial - 25569) * 86400 * 1000)
  return isNaN(d.getTime()) ? null : d
}
const detectQuarterFromFilename = (filename) => {
  const base = path.basename(filename, path.extname(filename))
  const match = base.match(/(\d)[Qq](\d{2,4})/)
  if (!match) return null
  const qNum = match[1]
  let year = parseInt(match[2])
  if (year < 100) year += 2000
  return `Q${qNum}-${year}`
}
const calculateDMMStatus = (totalChurches, churchGeneration) => {
  const chs = totalChurches || 0
  const gen = churchGeneration || 0
  if (chs === 0 && gen === 0) return { status: 'unreached', level: '' }
  if (gen >= 7) return { status: 'dmm', level: 'IV' }
  if (gen >= 5) {
    if (chs >= 67) return { status: 'dmm', level: 'IV' }
    if (chs >= 34) return { status: 'tipping-point', level: 'III' }
    return { status: 'midway', level: 'II' }
  }
  if (gen >= 3) {
    if (chs >= 100) return { status: 'dmm', level: 'IV' }
    if (chs >= 67)  return { status: 'tipping-point', level: 'III' }
    if (chs >= 34)  return { status: 'midway', level: 'II' }
    return { status: 'pioneer', level: 'I' }
  }
  if (chs >= 100) return { status: 'midway', level: 'III' }
  if (chs >= 67)  return { status: 'midway', level: 'II' }
  if (chs >= 34)  return { status: 'pioneer', level: 'II' }
  if (chs >= 1)   return { status: 'pioneer', level: 'I' }
  return { status: 'unreached', level: '' }
}

const router = express.Router();

/**
 * GET /analytics/stats - Get regional statistics and coverage percentages
 */
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const { region, country, organization } = req.query;

    const filters = {};
    if (region) filters.region = region;
    if (country) filters.country = country;
    if (organization) filters.organization = mongoose.Types.ObjectId(organization);

    // Village statistics
    const villageStats = await Village.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalPopulation: { $sum: '$population' },
          avgCoverage: { $avg: '$coveragePercentage' },
          byStatus: {
            $push: '$status'
          },
          byCoverage: {
            $push: '$coverageStatus'
          }
        }
      }
    ]);

    // People group statistics
    const pgFilters = { approved: true, ...filters };
    const peopleGroupStats = await PeopleGroup.getStatusStats(pgFilters);

    // Church statistics
    const churchStats = await Church.aggregate([
      { $match: filters.village ? { village: filters.village } : {} },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalMembers: { $sum: '$memberCount' }
        }
      }
    ]);

    // Coverage calculation
    const coverageStats = await Village.getCoverageStats(filters);

    // Calculate percentages
    const villageData = villageStats[0] || { total: 0, totalPopulation: 0, avgCoverage: 0 };
    const statusCounts = {};
    const coverageCounts = {};

    if (villageData.byStatus) {
      villageData.byStatus.forEach(s => {
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
    }

    if (villageData.byCoverage) {
      villageData.byCoverage.forEach(c => {
        coverageCounts[c] = (coverageCounts[c] || 0) + 1;
      });
    }

    res.json({
      villages: {
        total: villageData.total,
        totalPopulation: villageData.totalPopulation,
        averageCoverage: Math.round(villageData.avgCoverage || 0),
        byStatus: statusCounts,
        byCoverage: coverageCounts,
        coverageBreakdown: coverageStats,
      },
      peopleGroups: {
        byStatus: peopleGroupStats,
        total: peopleGroupStats.reduce((sum, s) => sum + s.count, 0),
      },
      churches: {
        byStatus: churchStats,
        total: churchStats.reduce((sum, s) => sum + s.count, 0),
        totalMembers: churchStats.reduce((sum, s) => sum + (s.totalMembers || 0), 0),
      },
      filters: { region, country, organization },
    });
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /analytics/heatmap - Get heatmap data for status distribution
 */
router.get('/heatmap', optionalAuth, async (req, res) => {
  try {
    const { type = 'people-groups', status, bounds } = req.query;

    let Model, statusField;
    if (type === 'villages') {
      Model = Village;
      statusField = 'status';
    } else {
      Model = PeopleGroup;
      statusField = 'status';
    }

    const query = {};
    if (type === 'people-groups') {
      query.approved = true;
    }
    if (status) {
      query[statusField] = status;
    }

    // Parse bounds if provided (sw_lng,sw_lat,ne_lng,ne_lat)
    if (bounds) {
      const [swLng, swLat, neLng, neLat] = bounds.split(',').map(Number);
      query.location = {
        $geoWithin: {
          $box: [[swLng, swLat], [neLng, neLat]]
        }
      };
    }

    // Get points for heatmap
    const points = await Model.find(query)
      .select('location status statusColor population progressPercentage')
      .lean();

    // Transform to heatmap format
    const heatmapData = points
      .filter(p => p.location?.coordinates)
      .map(p => ({
        lat: p.location.coordinates[1],
        lng: p.location.coordinates[0],
        intensity: p.progressPercentage || p.population || 1,
        status: p.status,
        color: p.statusColor,
      }));

    // Group by status for legend
    const statusGroups = {};
    heatmapData.forEach(p => {
      if (!statusGroups[p.status]) {
        statusGroups[p.status] = { count: 0, color: p.color };
      }
      statusGroups[p.status].count++;
    });

    res.json({
      type,
      points: heatmapData,
      total: heatmapData.length,
      statusGroups,
      bounds: bounds || null,
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /analytics/timeline - Get progress timeline data
 */
router.get('/timeline', optionalAuth, async (req, res) => {
  try {
    const { 
      type = 'people-groups', 
      period = '30', // days
      groupBy = 'day',
      region,
      country 
    } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const matchStage = {
      createdAt: { $gte: startDate },
    };
    if (region) matchStage.region = region;
    if (country) matchStage.country = country;

    let Model;
    if (type === 'villages') {
      Model = Village;
    } else if (type === 'churches') {
      Model = Church;
    } else {
      Model = PeopleGroup;
      matchStage.approved = true;
    }

    // Group by time period
    let dateGroup;
    if (groupBy === 'week') {
      dateGroup = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' },
      };
    } else if (groupBy === 'month') {
      dateGroup = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
    } else {
      dateGroup = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
    }

    const timeline = await Model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateGroup,
          count: { $sum: 1 },
          statuses: { $push: '$status' },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ]);

    // Format timeline data
    const formattedTimeline = timeline.map(t => {
      let date;
      if (groupBy === 'week') {
        // Approximate date from week number
        const d = new Date(t._id.year, 0, 1);
        d.setDate(d.getDate() + (t._id.week - 1) * 7);
        date = d.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        date = `${t._id.year}-${String(t._id.month).padStart(2, '0')}`;
      } else {
        date = `${t._id.year}-${String(t._id.month).padStart(2, '0')}-${String(t._id.day).padStart(2, '0')}`;
      }

      // Count statuses
      const statusBreakdown = {};
      t.statuses.forEach(s => {
        statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
      });

      return {
        date,
        count: t.count,
        statusBreakdown,
      };
    });

    // Calculate cumulative totals
    let cumulative = 0;
    const cumulativeTimeline = formattedTimeline.map(t => {
      cumulative += t.count;
      return { ...t, cumulative };
    });

    res.json({
      type,
      period: parseInt(period),
      groupBy,
      timeline: cumulativeTimeline,
      total: cumulative,
    });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /analytics/activity - Get activity analytics (supervisor only)
 */
router.get('/activity', auth, isSupervisorOrAdmin, async (req, res) => {
  try {
    const { days = 30, organization } = req.query;

    const options = { days: parseInt(days) };
    if (organization) {
      options.organization = organization;
    } else if (req.user.role === 'supervisor' && req.user.organization) {
      options.organization = req.user.organization;
    }

    const [dailyActivity, actionStats, geoDistribution] = await Promise.all([
      ActivityLog.getDailyActivity(options),
      ActivityLog.getStats(options),
      ActivityLog.getGeographicDistribution(options),
    ]);

    res.json({
      period: parseInt(days),
      dailyActivity,
      actionStats,
      geoDistribution,
    });
  } catch (error) {
    console.error('Error fetching activity analytics:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /analytics/regions - Get list of regions with counts
 */
router.get('/regions', optionalAuth, async (req, res) => {
  try {
    const { country } = req.query;

    const matchStage = {};
    if (country) matchStage.country = country;

    const regions = await Village.aggregate([
      { $match: { ...matchStage, region: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: { region: '$region', country: '$country' },
          villageCount: { $sum: 1 },
          totalPopulation: { $sum: '$population' },
        }
      },
      {
        $project: {
          region: '$_id.region',
          country: '$_id.country',
          villageCount: 1,
          totalPopulation: 1,
          _id: 0,
        }
      },
      { $sort: { villageCount: -1 } },
    ]);

    res.json({
      regions,
      total: regions.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /analytics/countries - Get list of countries with counts
 */
router.get('/countries', optionalAuth, async (req, res) => {
  try {
    const countries = await Village.aggregate([
      { $match: { country: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$country',
          villageCount: { $sum: 1 },
          totalPopulation: { $sum: '$population' },
          regions: { $addToSet: '$region' },
        }
      },
      {
        $project: {
          country: '$_id',
          villageCount: 1,
          totalPopulation: 1,
          regionCount: { $size: '$regions' },
          _id: 0,
        }
      },
      { $sort: { villageCount: -1 } },
    ]);

    res.json({
      countries,
      total: countries.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /analytics/user-summary - Get current user's activity summary
 */
router.get('/user-summary', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const [activitySummary, createdContent] = await Promise.all([
      ActivityLog.getUserActivitySummary(req.user._id, parseInt(days)),
      Promise.all([
        Village.countDocuments({ createdBy: req.user._id }),
        PeopleGroup.countDocuments({ createdBy: req.user._id }),
        Church.countDocuments({ createdBy: req.user._id }),
      ]),
    ]);

    res.json({
      period: parseInt(days),
      activitySummary,
      createdContent: {
        villages: createdContent[0],
        peopleGroups: createdContent[1],
        churches: createdContent[2],
        total: createdContent.reduce((a, b) => a + b, 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /analytics/ai-summary - AI-powered mission insights using DeepSeek
 */
router.get('/ai-summary', optionalAuth, async (req, res) => {
  try {
    // Gather real data for AI summary
    const [villageStats, pgStats, recentActivity] = await Promise.all([
      Village.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      PeopleGroup.aggregate([
        { $match: { approved: true } },
        { $group: { _id: '$engagementStatus', count: { $sum: 1 } } }
      ]),
      ActivityLog.find().sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const totalVillages = villageStats.reduce((s, v) => s + v.count, 0);
    const reachedVillages = villageStats.filter(v => ['church-planted', 'multiplying', 'dmm', 'tipping-point', 'midway'].includes(v._id)).reduce((s, v) => s + v.count, 0);
    const dmmGroups = pgStats.find(p => p._id === 'dmm')?.count || 0;
    const unreachedGroups = pgStats.find(p => p._id === 'unreached')?.count || 0;
    const pioneerGroups = pgStats.find(p => p._id === 'pioneer')?.count || 0;
    const totalGroups = pgStats.reduce((s, p) => s + p.count, 0);
    const coveragePct = totalVillages > 0 ? Math.round(reachedVillages / totalVillages * 100) : 0;

    // Build criteriaScores from real data for DeepSeek
    const criteriaScores = [
      { criterionId: 'church_multiplication', criterionName: 'Church Multiplication', score: dmmGroups > 10 ? 5 : dmmGroups > 5 ? 4 : dmmGroups > 2 ? 3 : dmmGroups > 0 ? 2 : 1, weight: 3 },
      { criterionId: 'disciple_replication', criterionName: 'Disciple Replication', score: coveragePct > 60 ? 5 : coveragePct > 40 ? 4 : coveragePct > 20 ? 3 : coveragePct > 5 ? 2 : 1, weight: 3 },
      { criterionId: 'leader_development', criterionName: 'Leader Development', score: pioneerGroups > 5 ? 4 : pioneerGroups > 0 ? 3 : 2, weight: 3 },
      { criterionId: 'church_gathering', criterionName: 'Church Gathering', score: reachedVillages > 20 ? 5 : reachedVillages > 10 ? 4 : reachedVillages > 5 ? 3 : reachedVillages > 0 ? 2 : 1, weight: 2 },
      { criterionId: 'prayer', criterionName: 'Prayer', score: 3, weight: 2 },
    ];

    const overallScore = Math.round(
      criteriaScores.reduce((s, c) => s + c.score * c.weight, 0) /
      criteriaScores.reduce((s, c) => s + c.weight, 0) * 20
    );

    const analysisData = {
      peopleGroupName: 'Tableau de bord global',
      villageName: null,
      country: 'Afrique Centrale',
      criteriaScores,
      overallScore,
      priorityLevel: coveragePct < 20 ? 'critical' : coveragePct < 40 ? 'high' : coveragePct < 60 ? 'moderate' : 'low',
      remarks: `Données globales: ${totalVillages} villages, ${totalGroups} groupes de peuples, ${reachedVillages} villages atteints (${coveragePct}%), ${dmmGroups} mouvements DMM actifs.`,
      recommendations: null,
    };

    // Try DeepSeek AI
    const aiResult = await generateAnalysisInsights(analysisData);

    if (aiResult.success) {
      // Parse AI response into bullet points for the dashboard
      const rawText = aiResult.rawResponse || aiResult.interpretation || '';
      const lines = rawText.split('\n').filter(l => l.trim().length > 20);
      const insights = lines.slice(0, 3).map(l => l.replace(/^\*+\s*/, '').replace(/^-\s*/, '').trim());
      const recommendations = lines.slice(3, 6).map(l => l.replace(/^\*+\s*/, '').replace(/^-\s*/, '').trim());

      return res.json({
        insights: insights.length > 0 ? insights : [
          `${reachedVillages} villages atteints sur ${totalVillages} (${coveragePct}% de couverture)`,
          `${dmmGroups} groupes de peuples avec des mouvements DMM actifs sur ${totalGroups} au total`,
        ],
        alerts: totalVillages === 0 ? ['Aucune donnée de village disponible — commencez par ajouter des villages'] : [],
        recommendations: recommendations.length > 0 ? recommendations : [],
        aiPowered: true,
      });
    }

    // Fallback to static insights
    res.json({
      insights: [
        `${reachedVillages} out of ${totalVillages} villages have been reached (${coveragePct}% coverage)`,
        `${dmmGroups} people groups have active DMM movements out of ${totalGroups} total`,
        `Mission momentum is ${dmmGroups > 5 ? 'strong' : 'growing'} across tracked regions`
      ],
      alerts: totalVillages === 0 ? ['No village data available yet — start by adding villages'] : [],
      recommendations: [
        'Focus outreach on unreached villages in high-density regions',
        'Strengthen discipleship in pioneer-stage people groups',
        'Document new DMM movements to track multiplication'
      ],
      aiPowered: false,
    });
  } catch (error) {
    console.error('[Analytics] /ai-summary error:', error.message);
    // Return static fallback instead of 500 so the dashboard still loads
    res.json({
      insights: [
        'Mission data is being gathered — check back shortly',
        'Add villages and people groups to see AI-powered insights',
        'DMM movements are tracked across all registered regions',
      ],
      alerts: ['AI summary temporarily unavailable — using static insights'],
      recommendations: [
        'Focus outreach on unreached villages in high-density regions',
        'Strengthen discipleship in pioneer-stage people groups',
        'Document new DMM movements to track multiplication',
      ],
      aiPowered: false,
    });
  }
});

/**
 * GET /analytics/weekly-activity - Weekly activity chart data
 */
router.get('/weekly-activity', optionalAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const result = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };

    try {
      const activities = await ActivityLog.aggregate([
        { $match: { createdAt: { $gte: startOfWeek } } },
        { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } }
      ]);
      // MongoDB $dayOfWeek: 1=Sun, 2=Mon, ..., 7=Sat
      activities.forEach(a => {
        const dayIndex = a._id - 1; // 0=Sun
        if (days[dayIndex]) result[days[dayIndex]] = a.count;
      });
    } catch (e) {
      // fallback: return zeros
    }

    // If all zeros (no ActivityLog data), try Village createdAt
    const hasData = Object.values(result).some(v => v > 0);
    if (!hasData) {
      try {
        const villageActivity = await Village.aggregate([
          { $match: { createdAt: { $gte: startOfWeek } } },
          { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } }
        ]);
        villageActivity.forEach(a => {
          const dayIndex = a._id - 1;
          if (days[dayIndex]) result[days[dayIndex]] = a.count;
        });
      } catch (e) {}
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * GET /analytics/monthly-activity - Monthly activity chart data (current year)
 */
router.get('/monthly-activity', optionalAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1st current year

    const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const result = {};
    monthKeys.forEach(k => { result[k] = 0; });

    // Try ActivityLog first
    let hasData = false;
    try {
      const activities = await ActivityLog.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } }
      ]);
      // MongoDB $month: 1=Jan ... 12=Dec
      activities.forEach(a => {
        const key = monthKeys[a._id - 1];
        if (key) { result[key] = a.count; hasData = true; }
      });
    } catch (e) {}

    // Fallback: try PeopleGroup createdAt
    if (!hasData) {
      try {
        const pgActivity = await PeopleGroup.aggregate([
          { $match: { approved: true, createdAt: { $gte: startOfYear } } },
          { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } }
        ]);
        pgActivity.forEach(a => {
          const key = monthKeys[a._id - 1];
          if (key) { result[key] = a.count; hasData = true; }
        });
      } catch (e) {}
    }

    // Fallback 2: Village createdAt
    if (!hasData) {
      try {
        const villageActivity = await Village.aggregate([
          { $match: { createdAt: { $gte: startOfYear } } },
          { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } }
        ]);
        villageActivity.forEach(a => {
          const key = monthKeys[a._id - 1];
          if (key) result[key] = a.count;
        });
      } catch (e) {}
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * GET /analytics/reached-villages - Count of reached villages with trend
 */
router.get('/reached-villages', optionalAuth, async (req, res) => {
  try {
    const includeJP = req.query.includeJoshuaProject === 'true' || req.query.includeJoshuaProject === '1';
    const reachedStatuses = ['church-planted', 'multiplying', 'dmm', 'tipping-point', 'midway'];
    const jpReachedStatuses = ['dmm', 'tipping-point', 'midway'];
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tasks = [
      Village.countDocuments({ status: { $in: reachedStatuses } }),
      Village.countDocuments({ status: { $in: reachedStatuses }, createdAt: { $lt: cutoff } })
    ];
    if (includeJP) {
      tasks.push(
        PeopleGroup.countDocuments({ source: 'Joshua Project', engagementStatus: { $in: jpReachedStatuses } }),
        PeopleGroup.countDocuments({ source: 'Joshua Project', engagementStatus: { $in: jpReachedStatuses }, createdAt: { $lt: cutoff } })
      );
    }
    const [current, lastMonth, jpCurrent = 0, jpLastMonth = 0] = await Promise.all(tasks);
    const total = current + jpCurrent;
    const totalLast = lastMonth + jpLastMonth;
    const trend = totalLast > 0 ? Math.round(((total - totalLast) / totalLast) * 100) : 0;
    res.json({ count: total, trend, label: 'Reached Villages', includeJoshuaProject: includeJP });
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * GET /analytics/unreached-villages - Count of unreached villages with trend
 */
router.get('/unreached-villages', optionalAuth, async (req, res) => {
  try {
    const includeJP = req.query.includeJoshuaProject === 'true' || req.query.includeJoshuaProject === '1';
    const unreachedStatuses = ['unreached', 'pioneer', 'in-progress'];
    const jpUnreachedStatuses = ['unreached', 'pioneer'];
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tasks = [
      Village.countDocuments({ status: { $in: unreachedStatuses } }),
      Village.countDocuments({ status: { $in: unreachedStatuses }, createdAt: { $lt: cutoff } })
    ];
    if (includeJP) {
      tasks.push(
        PeopleGroup.countDocuments({ source: 'Joshua Project', engagementStatus: { $in: jpUnreachedStatuses } }),
        PeopleGroup.countDocuments({ source: 'Joshua Project', engagementStatus: { $in: jpUnreachedStatuses }, createdAt: { $lt: cutoff } })
      );
    }
    const [current, lastMonth, jpCurrent = 0, jpLastMonth = 0] = await Promise.all(tasks);
    const total = current + jpCurrent;
    const totalLast = lastMonth + jpLastMonth;
    const trend = totalLast > 0 ? Math.round(((total - totalLast) / totalLast) * 100) : 0;
    res.json({ count: total, trend, label: 'Unreached Villages', includeJoshuaProject: includeJP });
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * GET /analytics/dmm-growth - DMM movement growth percentage
 */
router.get('/dmm-growth', optionalAuth, async (req, res) => {
  try {
    const [dmmNow, dmmLastMonth, totalNow] = await Promise.all([
      PeopleGroup.countDocuments({ approved: true, engagementStatus: 'dmm' }),
      PeopleGroup.countDocuments({
        approved: true,
        engagementStatus: 'dmm',
        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      PeopleGroup.countDocuments({ approved: true })
    ]);
    const growth = dmmLastMonth > 0 ? parseFloat(((dmmNow - dmmLastMonth) / dmmLastMonth * 100).toFixed(1)) : (dmmNow > 0 ? 100 : 0);
    const percentage = totalNow > 0 ? parseFloat((dmmNow / totalNow * 100).toFixed(1)) : 0;
    res.json({ growth, dmmCount: dmmNow, totalCount: totalNow, percentage });
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * GET /analytics/top-regions - Top active regions by village count
 */
router.get('/top-regions', optionalAuth, async (req, res) => {
  try {
    const regions = await Village.aggregate([
      { $match: { region: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$region',
          count: { $sum: 1 },
          country: { $first: '$country' },
        }
      },
      { $project: { region: '$_id', count: 1, country: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);
    res.json(regions);
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * GET /analytics/people-groups-stats - Rich people groups analytics
 */
router.get('/people-groups-stats', optionalAuth, async (req, res) => {
  try {
    const { region, country } = req.query;
    const baseMatch = { approved: true };
    if (country) baseMatch.country = country;
    if (region) baseMatch.region = region;

    // Run all aggregations in parallel (including distinct regions list)
    const [totalsResult, statusDist, top5, religionDist, languageDist, rawRegions] = await Promise.all([
      // Totals: count, population, believers, churches
      PeopleGroup.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalPopulation: { $sum: '$population' },
            totalBelievers: { $sum: '$believersCount' },
            totalChurches: { $sum: '$churchesCount' },
          },
        },
      ]),

      // Status distribution by engagementStatus
      PeopleGroup.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$engagementStatus',
            count: { $sum: 1 },
            totalPopulation: { $sum: '$population' },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Top 5 by population (with location for map navigation)
      PeopleGroup.find(baseMatch)
        .sort({ population: -1 })
        .limit(5)
        .select('name population engagementStatus region believersCount churchesCount location')
        .lean(),

      // Religion distribution (top 5)
      PeopleGroup.aggregate([
        { $match: { ...baseMatch, religion: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$religion', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Language distribution (top 5)
      PeopleGroup.aggregate([
        { $match: { ...baseMatch, language: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Distinct regions (always unfiltered — full list for the selector)
      PeopleGroup.distinct('region', { approved: true }),
    ]);

    const totals = totalsResult[0] || {
      totalCount: 0,
      totalPopulation: 0,
      totalBelievers: 0,
      totalChurches: 0,
    };

    const evangelismRate =
      totals.totalPopulation > 0
        ? Math.round((totals.totalBelievers / totals.totalPopulation) * 100 * 10) / 10
        : 0;

    // Normalise status distribution into a keyed map
    const statusMap = {};
    statusDist.forEach(s => {
      statusMap[s._id || 'unknown'] = {
        status: s._id || 'unknown',
        count: s.count,
        totalPopulation: s.totalPopulation,
      };
    });

    const orderedStatuses = ['unreached', 'pioneer', 'midway', 'tipping-point', 'dmm'];
    const statusDistribution = orderedStatuses.map(key => ({
      status: key,
      count: statusMap[key]?.count || 0,
      totalPopulation: statusMap[key]?.totalPopulation || 0,
    }));

    // Clean and sort the regions list
    const regions = rawRegions
      .filter(r => r != null && r !== '')
      .sort((a, b) => a.localeCompare(b));

    res.json({
      totalPeopleGroups: totals.totalCount,
      totalPopulation: totals.totalPopulation,
      totalBelievers: totals.totalBelievers,
      totalChurches: totals.totalChurches,
      evangelismRate,
      statusDistribution,
      regions,
      top5ByPopulation: top5.map(pg => ({
        name: pg.name,
        population: pg.population || 0,
        status: pg.engagementStatus || 'unknown',
        region: pg.region || '',
        believersCount: pg.believersCount || 0,
        churchesCount: pg.churchesCount || 0,
        coordinates: pg.location?.coordinates || null, // [lng, lat]
      })),
      religionDistribution: religionDist.map(r => ({ religion: r._id, count: r.count })),
      languageDistribution: languageDist.map(l => ({ language: l._id, count: l.count })),
    });
  } catch (error) {
    console.error('[Analytics] /people-groups-stats error:', error.message);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

/**
 * GET /analytics/jp-coverage
 * Combien de peuples JP sont déjà engagés par une équipe DMM ?
 */
router.get('/jp-coverage', optionalAuth, async (req, res) => {
  try {
    const { countryCode, country } = req.query
    const geoFilter = {}
    if (countryCode) geoFilter.countryCode = countryCode
    if (country)     geoFilter.country     = country

    const [jpStats, dmmByCountry, jpByStatus] = await Promise.all([
      PeopleGroup.aggregate([
        { $match: { source: 'Joshua Project', ...geoFilter } },
        { $group: {
          _id: null,
          total:        { $sum: 1 },
          frontier:     { $sum: { $cond: [{ $eq: ['$jpData.frontier',     true] }, 1, 0] } },
          leastReached: { $sum: { $cond: [{ $eq: ['$jpData.leastReached', true] }, 1, 0] } },
          totalPop:     { $sum: '$population' },
        }},
      ]),
      PeopleGroup.aggregate([
        { $match: { source: { $ne: 'Joshua Project' }, approved: true, ...geoFilter } },
        { $group: {
          _id:   '$country',
          count: { $sum: 1 },
          dmm:   { $sum: { $cond: [{ $eq: ['$engagementStatus', 'dmm'] }, 1, 0] } },
        }},
      ]),
      PeopleGroup.aggregate([
        { $match: { source: 'Joshua Project', ...geoFilter } },
        { $group: { _id: '$engagementStatus', count: { $sum: 1 } } },
      ]),
    ])

    const jp = jpStats[0] || { total: 0, frontier: 0, leastReached: 0, totalPop: 0 }
    const totalDMM = dmmByCountry.reduce((s, c) => s + c.count, 0)
    const jpStatusMap = {}
    jpByStatus.forEach(s => { jpStatusMap[s._id || 'unreached'] = s.count })
    const jpUnreachedPioneer = (jpStatusMap['unreached'] || 0) + (jpStatusMap['pioneer'] || 0)

    res.json({
      jp: {
        total: jp.total,
        frontier: jp.frontier,
        leastReached: jp.leastReached,
        totalPop: jp.totalPop,
        byStatus: jpStatusMap,
        unreachedPioneer: jpUnreachedPioneer,
      },
      dmm: {
        total: totalDMM,
        byCountry: dmmByCountry,
        countriesActive: dmmByCountry.length,
      },
      coveragePct: jp.total > 0
        ? parseFloat(((totalDMM / jp.total) * 100).toFixed(1))
        : 0,
    })
  } catch (error) {
    console.error('[Analytics] /jp-coverage error:', error.message)
    res.status(500).json({ error: 'Server error', message: error.message })
  }
})

/**
 * POST /analytics/quarterly-upload/preview
 * Lit le fichier Excel et retourne un aperçu SANS sauvegarder.
 * Utilisé pour montrer à l'utilisateur ce qui va être importé.
 */
router.post('/quarterly-upload/preview', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' })

    const filename = req.file.originalname
    const quarter = req.query.quarter || detectQuarterFromFilename(filename)
    if (!quarter) {
      return res.status(400).json({
        error: 'Trimestre non détecté',
        message: 'Nommez le fichier avec le format XXXXXXX_1Q26.xlsx ou passez ?quarter=Q1-2026',
      })
    }

    // Lire le fichier Excel depuis le buffer en mémoire
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false })
    const ws1 = workbook.Sheets['Sheet1']
    if (!ws1) return res.status(400).json({ error: 'Feuille "Sheet1" introuvable dans ce fichier' })

    const sheet1Data = XLSX.utils.sheet_to_json(ws1, { header: 1, range: 1, defval: null })
    const dataRows = sheet1Data.slice(1).filter(row => row && row[7] && String(row[7]).trim())

    // Compter les nouveaux peuples (onglet NEW PGs)
    let newPGCount = 0
    const wsNewPGs = workbook.Sheets['NEW PGs']
    if (wsNewPGs) {
      const newPGData = XLSX.utils.sheet_to_json(wsNewPGs, { header: 1, range: 0, defval: null })
      newPGCount = newPGData.slice(1).filter(r => r && r[3] && String(r[3]).trim()).length
    }

    // Stats par pays
    const byCountry = {}
    let totalChurches = 0, totalDisciples = 0, totalBaptisms = 0, totalMBB = 0

    for (const row of dataRows) {
      const country = normalizeCountry(row[7] || row[6])
      byCountry[country] = (byCountry[country] || 0) + 1
      totalChurches  += toNum(row[15])
      totalDisciples += toNum(row[18])
      totalBaptisms  += toNum(row[19])
      totalMBB       += toNum(row[22])
    }

    // Aperçu des 5 premières lignes
    const preview = dataRows.slice(0, 5).map(row => ({
      country:       normalizeCountry(row[7] || row[6]),
      name:          toStr(row[11]),
      totalChurches: toNum(row[15]),
      generation:    toNum(row[16]),
      newDisciples:  toNum(row[18]),
      newBaptisms:   toNum(row[19]),
      mbbCount:      toNum(row[22]),
      status:        calculateDMMStatus(toNum(row[15]), toNum(row[16])).status,
    }))

    // Vérifier si ce trimestre existe déjà
    const existingCount = await QuarterlyReport.countDocuments({ quarter })

    res.json({
      quarter,
      filename,
      totals: {
        peoples:    dataRows.length,
        newPGs:     newPGCount,
        churches:   totalChurches,
        disciples:  totalDisciples,
        baptisms:   totalBaptisms,
        mbb:        totalMBB,
      },
      byCountry,
      preview,
      alreadyExists: existingCount > 0,
      existingCount,
    })
  } catch (error) {
    console.error('[quarterly-upload/preview]', error.message)
    res.status(500).json({ error: 'Erreur de lecture du fichier', message: error.message })
  }
})

/**
 * POST /analytics/quarterly-upload/import
 * Importe réellement le rapport trimestriel dans MongoDB.
 */
router.post('/quarterly-upload/import', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' })

    const filename = req.file.originalname
    const quarter = req.query.quarter || detectQuarterFromFilename(filename)
    if (!quarter) return res.status(400).json({ error: 'Trimestre non détecté' })

    const qMatch = quarter.match(/^Q(\d)-(\d{4})$/)
    if (!qMatch) return res.status(400).json({ error: 'Format de trimestre invalide (attendu: Q1-2026)' })

    const quarterNumber = parseInt(qMatch[1])
    const year          = parseInt(qMatch[2])

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false })
    const ws1 = workbook.Sheets['Sheet1']
    if (!ws1) return res.status(400).json({ error: 'Feuille "Sheet1" introuvable' })

    const sheet1Data = XLSX.utils.sheet_to_json(ws1, { header: 1, range: 1, defval: null })
    const dataRows = sheet1Data.slice(1).filter(row => row && row[7] && String(row[7]).trim())

    const stats = { created: 0, updated: 0, pgUpdated: 0, errors: 0, statusChanges: [] }

    const processRow = async (rowData, isNewPG = false) => {
      const { status, level } = calculateDMMStatus(rowData.totalChurches, rowData.generation)

      // Chercher PeopleGroup existant
      let existingPG = null
      if (rowData.jpId && rowData.jpId !== '#N/A' && !isNaN(rowData.jpId)) {
        existingPG = await PeopleGroup.findOne({ 'jpData.peopleId': String(rowData.jpId), approved: true })
      }
      if (!existingPG) {
        existingPG = await PeopleGroup.findOne({
          name: { $regex: new RegExp(`^${rowData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          country: { $regex: new RegExp(`^${rowData.country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          approved: true,
        }).catch(() => null)
      }

      // Delta vs trimestre précédent
      let delta = { totalChurches: null, newDisciples: null, newBaptisms: null, mbbCount: null, statusChanged: false, previousStatus: '' }
      if (existingPG) {
        const prevQNum = quarterNumber === 1 ? 4 : quarterNumber - 1
        const prevYear = quarterNumber === 1 ? year - 1 : year
        const prevReport = await QuarterlyReport.findOne({ quarter: `Q${prevQNum}-${prevYear}`, peopleGroup: existingPG._id })
        if (prevReport) {
          delta.totalChurches  = rowData.totalChurches - (prevReport.totalChurches || 0)
          delta.newDisciples   = rowData.newDisciples  - (prevReport.newDisciples  || 0)
          delta.newBaptisms    = rowData.newBaptisms   - (prevReport.newBaptisms   || 0)
          delta.mbbCount       = rowData.mbbCount      - (prevReport.mbbCount      || 0)
          delta.previousStatus = prevReport.calculatedStatus || ''
          delta.statusChanged  = status !== prevReport.calculatedStatus && !!prevReport.calculatedStatus
        }
      }

      // Upsert QuarterlyReport
      const reportData = {
        quarter, year, quarterNumber,
        country: rowData.country, countryCode: COUNTRY_CODE_MAP[rowData.country] || '',
        region: rowData.region, peopleGroup: existingPG?._id || null,
        peopleGroupName: rowData.name, engagementName: rowData.engagementName || `${rowData.country}-${rowData.name}`,
        jpPeopleGroupId: rowData.jpId || '', ngKey: rowData.ngKey || undefined,
        dbs: rowData.dbs, com: rowData.com, cat: rowData.cat,
        totalChurches: rowData.totalChurches, churchGeneration: rowData.generation,
        avgChurchSize: rowData.avgChurchSize, newDisciples: rowData.newDisciples,
        newBaptisms: rowData.newBaptisms, mbPercent: rowData.mbPct,
        mbbCount: rowData.mbbCount, leadersInTraining: rowData.leadersTraining,
        activeTrainers: rowData.activeTrainers, lostChurches: rowData.lostChs,
        mergedChurches: rowData.mergedChs, notes: rowData.notes,
        calculatedStatus: status, calculatedLevel: level, delta,
        isNewPG, importedBy: req.user._id, sourceFile: filename,
      }

      const existing = await QuarterlyReport.findOne({ quarter, peopleGroupName: rowData.name, country: rowData.country })
      if (existing) {
        await QuarterlyReport.findByIdAndUpdate(existing._id, reportData)
        stats.updated++
      } else {
        await new QuarterlyReport(reportData).save()
        stats.created++
      }

      // Mise à jour PeopleGroup
      if (existingPG) {
        await PeopleGroup.findByIdAndUpdate(existingPG._id, {
          $set: { numberOfChurches: rowData.totalChurches, churchGeneration: rowData.generation, engagementStatus: status, engagementLevel: level, status },
        })
        stats.pgUpdated++
      }

      if (delta.statusChanged) stats.statusChanges.push({ name: rowData.name, country: rowData.country, from: delta.previousStatus, to: status })
    }

    // Traiter Sheet1
    for (const row of dataRows) {
      try {
        await processRow({
          ngKey: row[0], region: toStr(row[3] || row[4]),
          country: normalizeCountry(row[7] || row[6]),
          engagementName: toStr(row[9]), jpId: toStr(row[10]),
          name: toStr(row[11]), dbs: toNum(row[12]), com: toNum(row[13]),
          cat: toNum(row[14]), totalChurches: toNum(row[15]), generation: toNum(row[16]),
          avgChurchSize: toNum(row[17]), newDisciples: toNum(row[18]),
          newBaptisms: toNum(row[19]), mbPct: toNum(row[20]), mbbCount: toNum(row[22]),
          notes: toStr(row[23]), leadersTraining: toNum(row[24]),
          activeTrainers: toNum(row[25]), lostChs: toNum(row[33]), mergedChs: toNum(row[34]),
        })
      } catch (e) { stats.errors++ }
    }

    // Traiter NEW PGs
    const wsNewPGs = workbook.Sheets['NEW PGs']
    if (wsNewPGs) {
      const newPGData = XLSX.utils.sheet_to_json(wsNewPGs, { header: 1, range: 0, defval: null })
      for (const row of newPGData.slice(1).filter(r => r && r[3] && String(r[3]).trim())) {
        try {
          await processRow({
            region: toStr(row[1]), country: normalizeCountry(row[2]),
            name: toStr(row[3]), dbs: toNum(row[4]), com: toNum(row[5]),
            cat: toNum(row[6]), totalChurches: toNum(row[7]), generation: toNum(row[8]),
            avgChurchSize: toNum(row[9]), newDisciples: toNum(row[10]),
            newBaptisms: toNum(row[11]), mbPct: toNum(row[12]), mbbCount: toNum(row[13]),
            notes: toStr(row[14]), leadersTraining: toNum(row[15]),
            activeTrainers: toNum(row[16]), lostChs: toNum(row[17]), mergedChs: toNum(row[18]),
          }, true)
        } catch (e) { stats.errors++ }
      }
    }

    res.json({
      success: true,
      quarter,
      stats,
      message: `Import ${quarter} terminé — ${stats.created} créés, ${stats.updated} mis à jour, ${stats.statusChanges.length} percées détectées`,
    })
  } catch (error) {
    console.error('[quarterly-upload/import]', error.message)
    res.status(500).json({ error: 'Erreur lors de l\'import', message: error.message })
  }
})

/**
 * GET /analytics/quarterly-reports
 * Liste les trimestres disponibles avec leurs stats globales
 */
router.get('/quarterly-reports', optionalAuth, async (req, res) => {
  try {
    const quarters = await QuarterlyReport.aggregate([
      {
        $group: {
          _id: '$quarter',
          peoples:    { $sum: 1 },
          churches:   { $sum: '$totalChurches' },
          disciples:  { $sum: '$newDisciples' },
          baptisms:   { $sum: '$newBaptisms' },
          mbb:        { $sum: '$mbbCount' },
          coaches:    { $sum: '$activeTrainers' },
          leaders:    { $sum: '$leadersInTraining' },
          statusChanges: { $sum: { $cond: ['$delta.statusChanged', 1, 0] } },
        },
      },
      { $sort: { _id: -1 } },
    ])
    res.json(quarters.map(q => ({ ...q, quarter: q._id })))
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message })
  }
})

/**
 * GET /analytics/quarterly-pulse
 * Stats du trimestre courant vs trimestre précédent.
 * Retourne les deltas, les percées, et les tendances par pays.
 * Utilisé par le widget QuarterlyPulse du dashboard.
 */
router.get('/quarterly-pulse', optionalAuth, async (req, res) => {
  try {
    // 1. Trouver les 2 derniers trimestres importés
    const quarters = await QuarterlyReport.distinct('quarter')
    if (!quarters.length) {
      return res.json({ hasData: false, message: 'Aucun rapport trimestriel importé' })
    }

    // Trier : Q4-2026 > Q3-2026 > ... > Q1-2026
    const sorted = quarters.sort((a, b) => {
      const [qa, ya] = a.replace('Q','').split('-').map(Number)
      const [qb, yb] = b.replace('Q','').split('-').map(Number)
      return (yb * 4 + qb) - (ya * 4 + qa)
    })

    const currentQ  = sorted[0]
    const previousQ = sorted[1] || null

    // 2. Stats trimestre courant
    const currentAgg = await QuarterlyReport.aggregate([
      { $match: { quarter: currentQ } },
      {
        $group: {
          _id: null,
          peoples:       { $sum: 1 },
          churches:      { $sum: '$totalChurches' },
          disciples:     { $sum: '$newDisciples' },
          baptisms:      { $sum: '$newBaptisms' },
          mbb:           { $sum: '$mbbCount' },
          leaders:       { $sum: '$leadersInTraining' },
          coaches:       { $sum: '$activeTrainers' },
          lostChurches:  { $sum: '$lostChurches' },
          statusChanges: { $sum: { $cond: ['$delta.statusChanged', 1, 0] } },
          newPGs:        { $sum: { $cond: ['$isNewPG', 1, 0] } },
        },
      },
    ])

    // 3. Stats trimestre précédent
    let previousAgg = []
    if (previousQ) {
      previousAgg = await QuarterlyReport.aggregate([
        { $match: { quarter: previousQ } },
        {
          $group: {
            _id: null,
            peoples:   { $sum: 1 },
            churches:  { $sum: '$totalChurches' },
            disciples: { $sum: '$newDisciples' },
            baptisms:  { $sum: '$newBaptisms' },
            mbb:       { $sum: '$mbbCount' },
            leaders:   { $sum: '$leadersInTraining' },
            coaches:   { $sum: '$activeTrainers' },
          },
        },
      ])
    }

    const cur  = currentAgg[0]  || {}
    const prev = previousAgg[0] || {}

    // 4. Calcul des deltas
    const delta = (field) => {
      const c = cur[field]  || 0
      const p = prev[field] || 0
      return {
        value:   c,
        prev:    p,
        diff:    c - p,
        pct:     p > 0 ? Math.round(((c - p) / p) * 100) : null,
        up:      c >= p,
      }
    }

    // 5. Percées du trimestre courant
    const breakthroughs = await QuarterlyReport.find({
      quarter: currentQ,
      'delta.statusChanged': true,
    })
      .sort({ calculatedStatus: 1 })
      .limit(10)
      .select('peopleGroupName country delta.previousStatus calculatedStatus mbbCount')
      .lean()

    // 6. Top 5 pays par croissance (nouveaux disciples ce trimestre)
    const topCountries = await QuarterlyReport.aggregate([
      { $match: { quarter: currentQ } },
      {
        $group: {
          _id:       '$country',
          disciples: { $sum: '$newDisciples' },
          baptisms:  { $sum: '$newBaptisms' },
          churches:  { $sum: '$totalChurches' },
          peoples:   { $sum: 1 },
        },
      },
      { $sort: { disciples: -1 } },
      { $limit: 6 },
    ])

    // 7. Tendance sur les 4 derniers trimestres (pour mini graphe)
    const trendQuarters = sorted.slice(0, 4).reverse()
    const trend = await QuarterlyReport.aggregate([
      { $match: { quarter: { $in: trendQuarters } } },
      {
        $group: {
          _id:       '$quarter',
          disciples: { $sum: '$newDisciples' },
          baptisms:  { $sum: '$newBaptisms' },
          churches:  { $sum: '$totalChurches' },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // 8. Top peuples MBB (croyants d'origine musulmane)
    const topMBB = await QuarterlyReport.find({
      quarter: currentQ,
      mbbCount: { $gt: 0 },
    })
      .sort({ mbbCount: -1 })
      .limit(5)
      .select('peopleGroupName country mbbCount mbPercent')
      .lean()

    res.json({
      hasData:      true,
      currentQ,
      previousQ,
      metrics: {
        peoples:      delta('peoples'),
        churches:     delta('churches'),
        disciples:    delta('disciples'),
        baptisms:     delta('baptisms'),
        mbb:          delta('mbb'),
        leaders:      delta('leaders'),
        coaches:      delta('coaches'),
        lostChurches: { value: cur.lostChurches || 0 },
        statusChanges:{ value: cur.statusChanges || 0 },
        newPGs:       { value: cur.newPGs || 0 },
      },
      breakthroughs,
      topCountries,
      trend,
      topMBB,
    })
  } catch (error) {
    console.error('[quarterly-pulse]', error.message)
    res.status(500).json({ error: 'Server error', message: error.message })
  }
})

/**
 * GET /analytics/mbb-radar
 * Données MBB (Muslim Background Believers) par peuple pour la couche carte.
 * Retourne les peuples avec mbbCount > 0 du dernier trimestre importé,
 * avec leurs coordonnées pour affichage sur la carte.
 */
router.get('/mbb-radar', optionalAuth, async (req, res) => {
  try {
    const { quarter, country } = req.query

    // Si pas de trimestre spécifié, prendre le plus récent
    let targetQuarter = quarter
    if (!targetQuarter) {
      const quarters = await QuarterlyReport.distinct('quarter')
      if (!quarters.length) return res.json({ quarter: null, peoples: [] })
      targetQuarter = quarters.sort((a, b) => {
        const [qa, ya] = a.replace('Q','').split('-').map(Number)
        const [qb, yb] = b.replace('Q','').split('-').map(Number)
        return (yb * 4 + qb) - (ya * 4 + qa)
      })[0]
    }

    const matchFilter = { quarter: targetQuarter, mbbCount: { $gt: 0 } }
    if (country) matchFilter.country = country

    // Récupérer les peuples avec MBB, enrichis des coordonnées JP ou DMM
    const mbbReports = await QuarterlyReport.find(matchFilter)
      .sort({ mbbCount: -1 })
      .limit(200)
      .populate({
        path: 'peopleGroup',
        select: 'name location country jpData engagementStatus',
      })
      .lean()

    // Construire la réponse — ne garder que ceux avec des coordonnées
    const peoples = mbbReports
      .filter(r => r.peopleGroup?.location?.coordinates)
      .map(r => ({
        _id:             r._id,
        name:            r.peopleGroupName,
        country:         r.country,
        mbbCount:        r.mbbCount,
        mbPercent:       r.mbPercent || 0,
        totalChurches:   r.totalChurches,
        newDisciples:    r.newDisciples,
        calculatedStatus:r.calculatedStatus,
        coordinates:     r.peopleGroup.location.coordinates, // [lng, lat]
        jpScale:         r.peopleGroup.jpData?.jpScale || null,
        frontier:        r.peopleGroup.jpData?.frontier || false,
      }))

    res.json({
      quarter: targetQuarter,
      total:   peoples.length,
      peoples,
    })
  } catch (error) {
    console.error('[mbb-radar]', error.message)
    res.status(500).json({ error: 'Server error', message: error.message })
  }
})

/**
 * GET /analytics/coverage-voronoi
 * Retourne le statut DMM de chaque village pour colorier les polygones Voronoï.
 *
 * Pour chaque village (identifié par son nom), cherche s'il existe un PeopleGroup
 * DMM associé et retourne son statut d'engagement.
 *
 * Logique de statut :
 *   - Un village a un peuple DMM lié → statut du peuple le plus avancé
 *   - Aucun peuple → 'unreached' (zone blanche)
 *
 * Retourne : { [villageName]: { status, engagementLevel, peopleCount, population } }
 */
router.get('/coverage-voronoi', optionalAuth, async (req, res) => {
  try {
    const { country, countryCode } = req.query

    const matchFilter = {
      source:   'DMM',
      approved: true,
      villageName: { $ne: '', $exists: true },
    }
    if (country)     matchFilter.country     = country
    if (countryCode) matchFilter.countryCode = countryCode

    // Agréger : pour chaque village, prendre le statut le plus avancé
    const STATUS_ORDER = ['dmm', 'tipping-point', 'midway', 'pioneer', 'unreached']

    const villageStats = await PeopleGroup.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$villageName' } } },
          villageNameOriginal: { $first: '$villageName' },
          statuses:   { $push: '$engagementStatus' },
          levels:     { $push: '$engagementLevel' },
          peopleCount:{ $sum: 1 },
          population: { $sum: '$population' },
          churches:   { $sum: '$numberOfChurches' },
        },
      },
    ])

    // Calculer le statut dominant (le plus avancé) pour chaque village
    const coverageMap = {}
    for (const v of villageStats) {
      if (!v._id) continue

      // Trouver le statut le plus avancé dans la liste
      let bestStatus = 'unreached'
      for (const s of STATUS_ORDER) {
        if (v.statuses.includes(s)) { bestStatus = s; break }
      }

      coverageMap[v.villageNameOriginal] = {
        status:       bestStatus,
        peopleCount:  v.peopleCount,
        population:   v.population,
        churches:     v.churches,
      }

      // Aussi indexer par nom en minuscules pour le matching côté frontend
      if (v._id !== v.villageNameOriginal) {
        coverageMap[v._id] = coverageMap[v.villageNameOriginal]
      }
    }

    res.json({
      total:       Object.keys(coverageMap).length / 2, // divisé par 2 car double-indexé
      coverageMap,
    })
  } catch (error) {
    console.error('[coverage-voronoi]', error.message)
    res.status(500).json({ error: 'Server error', message: error.message })
  }
})

/**
 * GET /analytics/mission-corridor
 * Calcule le corridor missionnaire optimal — tournée qui relie les peuples JP
 * non-atteints dans un rayon donné en minimisant la distance totale.
 *
 * Algorithme : Plus proche voisin (greedy TSP) avec Turf.js
 * Complexité : O(n²) — rapide jusqu'à ~200 peuples
 *
 * Query params :
 *   lat        - Latitude du point de départ (requis)
 *   lng        - Longitude du point de départ (requis)
 *   radius     - Rayon de recherche en km (défaut: 200)
 *   maxStops   - Nombre maximum d'étapes (défaut: 15)
 *   country    - Filtrer par pays
 *   statuses   - Statuts à inclure (défaut: unreached,pioneer)
 *   prioritize - 'frontier' | 'population' | 'distance' (défaut: frontier)
 */
router.get('/mission-corridor', optionalAuth, async (req, res) => {
  try {
    const lat        = parseFloat(req.query.lat)
    const lng        = parseFloat(req.query.lng)
    const radius     = Math.min(parseFloat(req.query.radius) || 200, 1000) // km max 1000
    const maxStops   = Math.min(parseInt(req.query.maxStops) || 15, 30)
    const country    = req.query.country || null
    const statuses   = (req.query.statuses || 'unreached,pioneer').split(',')
    const prioritize = req.query.prioritize || 'frontier'

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: 'Paramètres requis',
        message: 'lat et lng sont obligatoires (point de départ)',
      })
    }

    // ── 1. Récupérer les peuples JP non-atteints dans le rayon ─────────────
    const startPoint = turf.point([lng, lat])

    const matchFilter = {
      source:           'Joshua Project',
      approved:         true,
      engagementStatus: { $in: statuses },
      location:         {
        $geoWithin: {
          $centerSphere: [[lng, lat], (radius / 6371)] // rayon en radians
        }
      }
    }
    if (country) matchFilter.country = country

    const candidates = await PeopleGroup.find(matchFilter)
      .select('name country population location engagementStatus jpData language religion')
      .lean()

    if (candidates.length === 0) {
      return res.json({
        startPoint: { lat, lng },
        radius,
        corridor:   [],
        totalDistance: 0,
        message: `Aucun peuple JP non-atteint dans un rayon de ${radius} km`,
      })
    }

    // ── 2. Score de priorité pour chaque peuple ─────────────────────────────
    const scored = candidates.map(pg => {
      const [pLng, pLat] = pg.location.coordinates
      const dist = turf.distance(startPoint, turf.point([pLng, pLat]), { units: 'kilometers' })

      let score = 0
      if (prioritize === 'frontier') {
        score  = (pg.jpData?.frontier     ? 100 : 0)
                + (pg.jpData?.leastReached ? 50  : 0)
                + ((pg.population || 0) / 10000)
                - dist / 10
      } else if (prioritize === 'population') {
        score  = ((pg.population || 0) / 1000) - dist / 50
      } else { // distance
        score  = -dist
      }

      return { ...pg, _dist: dist, _score: score, _pLat: pLat, _pLng: pLng }
    })

    // Trier par score et prendre les maxStops meilleurs candidats
    scored.sort((a, b) => b._score - a._score)
    const pool = scored.slice(0, Math.min(maxStops * 3, 60)) // pool élargi pour TSP

    // ── 3. Algorithme Plus Proche Voisin (Nearest Neighbor TSP) ─────────────
    const visited  = new Set()
    const corridor = []
    let currentLat = lat
    let currentLng = lng
    let totalDistance = 0

    for (let step = 0; step < maxStops && visited.size < pool.length; step++) {
      let nearest = null
      let nearestDist = Infinity

      for (const pg of pool) {
        if (visited.has(pg._id.toString())) continue

        const d = turf.distance(
          turf.point([currentLng, currentLat]),
          turf.point([pg._pLng, pg._pLat]),
          { units: 'kilometers' }
        )

        // Favoriser les peuples Frontier en réduisant leur distance effective
        const effectiveDist = pg.jpData?.frontier
          ? d * 0.6  // 40% de bonus — les peuples Frontier valent le détour
          : pg.jpData?.leastReached
            ? d * 0.8
            : d

        if (effectiveDist < nearestDist) {
          nearestDist = effectiveDist
          nearest     = { pg, realDist: d }
        }
      }

      if (!nearest) break

      const { pg, realDist } = nearest
      visited.add(pg._id.toString())
      totalDistance += realDist

      corridor.push({
        step:        corridor.length + 1,
        id:          pg._id,
        name:        pg.name,
        country:     pg.country,
        lat:         pg._pLat,
        lng:         pg._pLng,
        population:  pg.population || 0,
        language:    pg.language   || '',
        religion:    pg.religion   || '',
        status:      pg.engagementStatus,
        frontier:    pg.jpData?.frontier     || false,
        leastReached:pg.jpData?.leastReached || false,
        jpScale:     pg.jpData?.jpScale      || '',
        pctEvangel:  pg.jpData?.percentEvangelical || 0,
        distFromPrev:parseFloat(realDist.toFixed(1)),
        cumulDist:   parseFloat(totalDistance.toFixed(1)),
      })

      currentLat = pg._pLat
      currentLng = pg._pLng
    }

    // ── 4. Retour au point de départ (boucle complète optionnelle) ───────────
    const returnDist = corridor.length > 0
      ? turf.distance(
          turf.point([currentLng, currentLat]),
          turf.point([lng, lat]),
          { units: 'kilometers' }
        )
      : 0

    // ── 5. GeoJSON LineString pour affichage Leaflet ─────────────────────────
    const lineCoords = [
      [lng, lat],
      ...corridor.map(s => [s.lng, s.lat]),
    ]
    const routeLine = turf.lineString(lineCoords)

    // Stats
    const frontierCount    = corridor.filter(s => s.frontier).length
    const leastReachedCount= corridor.filter(s => s.leastReached).length
    const totalPopulation  = corridor.reduce((s, p) => s + (p.population || 0), 0)

    res.json({
      startPoint:     { lat, lng },
      radius,
      maxStops,
      prioritize,
      country:        country || 'tous',
      corridor,
      totalStops:     corridor.length,
      totalDistance:  parseFloat(totalDistance.toFixed(1)),
      returnDistance: parseFloat(returnDist.toFixed(1)),
      roundTrip:      parseFloat((totalDistance + returnDist).toFixed(1)),
      stats: {
        frontierCount,
        leastReachedCount,
        totalPopulation,
        avgDistPerStop: corridor.length > 0
          ? parseFloat((totalDistance / corridor.length).toFixed(1))
          : 0,
      },
      routeLine, // GeoJSON LineString
    })
  } catch (error) {
    console.error('[mission-corridor]', error.message)
    res.status(500).json({ error: 'Server error', message: error.message })
  }
})

module.exports = router;