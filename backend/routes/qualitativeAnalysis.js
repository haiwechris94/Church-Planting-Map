/**
 * Qualitative Analysis Routes
 * API endpoints for saving and retrieving DMM DNA qualitative analysis results
 */
const express = require('express');
const QualitativeAnalysis = require('../models/QualitativeAnalysis');
const PeopleGroup = require('../models/PeopleGroup');
const { auth, optionalAuth } = require('../middleware/auth');
const { generateAnalysisInsights, DMM_DNA_CRITERIA } = require('../services/deepseekService');

const router = express.Router();

/**
 * Get DMM DNA criteria definitions
 * @route GET /api/qualitative-analysis/criteria
 * @access Public
 */
router.get('/criteria', (req, res) => {
  res.json({
    success: true,
    criteria: DMM_DNA_CRITERIA,
  });
});

/**
 * Generate AI insights for analysis data (without saving)
 * @route POST /api/qualitative-analysis/ai-insights
 * @access Authenticated
 */
router.post('/ai-insights', auth, async (req, res) => {
  try {
    const { peopleGroupName, villageName, country, criteriaScores, overallScore, priorityLevel, remarks, recommendations } = req.body;

    if (!criteriaScores || criteriaScores.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Criteria scores are required',
      });
    }

    const insights = await generateAnalysisInsights({
      peopleGroupName,
      villageName,
      country,
      criteriaScores,
      overallScore,
      priorityLevel,
      remarks,
      recommendations,
    });

    res.json({
      success: true,
      ...insights,
    });
  } catch (error) {
    console.error('[QualitativeAnalysis] Error generating AI insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI insights',
      message: error.message,
    });
  }
});

/**
 * Save a new qualitative analysis
 * @route POST /api/qualitative-analysis
 * @access Authenticated
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      peopleGroupId,
      peopleGroupName,
      villageName,
      country,
      criteriaScores,
      overallScore,
      priorityLevel,
      remarks,
      recommendations,
      aiInterpretation,
      aiRecommendations,
    } = req.body;

    // Validate required fields
    if (!peopleGroupId || !peopleGroupName || !criteriaScores || criteriaScores.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'peopleGroupId, peopleGroupName, and criteriaScores are required',
      });
    }

    // Verify people group exists
    const peopleGroup = await PeopleGroup.findById(peopleGroupId);
    if (!peopleGroup) {
      return res.status(404).json({
        success: false,
        error: 'People group not found',
      });
    }

    // Check if analysis already exists for this people group
    const existingAnalysis = await QualitativeAnalysis.findOne({ peopleGroup: peopleGroupId });
    
    let analysis;
    if (existingAnalysis) {
      // Update existing analysis
      existingAnalysis.criteriaScores = criteriaScores;
      existingAnalysis.overallScore = overallScore;
      existingAnalysis.priorityLevel = priorityLevel;
      existingAnalysis.remarks = remarks;
      existingAnalysis.recommendations = recommendations;
      existingAnalysis.aiInterpretation = aiInterpretation;
      existingAnalysis.aiRecommendations = aiRecommendations;
      existingAnalysis.analyzedBy = req.user._id;
      existingAnalysis.analyzedAt = new Date();
      existingAnalysis.version += 1;
      
      analysis = await existingAnalysis.save();
    } else {
      // Create new analysis
      analysis = new QualitativeAnalysis({
        peopleGroup: peopleGroupId,
        peopleGroupName,
        villageName,
        country,
        criteriaScores,
        overallScore,
        priorityLevel,
        remarks,
        recommendations,
        aiInterpretation,
        aiRecommendations,
        analyzedBy: req.user._id,
      });
      
      await analysis.save();
    }

    // Populate references
    await analysis.populate('peopleGroup', 'name villageName engagementStatus numberOfChurches');
    await analysis.populate('analyzedBy', 'name email');

    res.status(existingAnalysis ? 200 : 201).json({
      success: true,
      message: existingAnalysis ? 'Analysis updated successfully' : 'Analysis saved successfully',
      analysis,
    });
  } catch (error) {
    console.error('[QualitativeAnalysis] Error saving analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save analysis',
      message: error.message,
    });
  }
});

/**
 * Get analysis by people group ID
 * @route GET /api/qualitative-analysis/people-group/:id
 * @access Public
 */
router.get('/people-group/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await QualitativeAnalysis.findOne({ peopleGroup: id })
      .populate('peopleGroup', 'name villageName engagementStatus numberOfChurches churchGeneration')
      .populate('analyzedBy', 'name email')
      .sort({ analyzedAt: -1 });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'No analysis found for this people group',
      });
    }

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('[QualitativeAnalysis] Error fetching analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis',
      message: error.message,
    });
  }
});

/**
 * Get all analyses grouped by country
 * @route GET /api/qualitative-analysis/by-country
 * @access Public
 */
router.get('/by-country', optionalAuth, async (req, res) => {
  try {
    const groupedAnalyses = await QualitativeAnalysis.getAllGroupedByCountry();

    // Populate people group and user references
    for (const group of groupedAnalyses) {
      for (let i = 0; i < group.analyses.length; i++) {
        const analysis = await QualitativeAnalysis.findById(group.analyses[i]._id)
          .populate('peopleGroup', 'name villageName engagementStatus numberOfChurches')
          .populate('analyzedBy', 'name email');
        group.analyses[i] = analysis;
      }
    }

    res.json({
      success: true,
      data: groupedAnalyses,
    });
  } catch (error) {
    console.error('[QualitativeAnalysis] Error fetching analyses by country:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analyses',
      message: error.message,
    });
  }
});

/**
 * Get all analyses for a specific country
 * @route GET /api/qualitative-analysis/country/:countryCode
 * @access Public
 */
router.get('/country/:countryCode', optionalAuth, async (req, res) => {
  try {
    const { countryCode } = req.params;

    const analyses = await QualitativeAnalysis.find({ country: countryCode })
      .populate('peopleGroup', 'name villageName engagementStatus numberOfChurches churchGeneration')
      .populate('analyzedBy', 'name email')
      .sort({ analyzedAt: -1 });

    res.json({
      success: true,
      country: countryCode,
      count: analyses.length,
      analyses,
    });
  } catch (error) {
    console.error('[QualitativeAnalysis] Error fetching analyses for country:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analyses',
      message: error.message,
    });
  }
});

/**
 * Get analysis statistics
 * @route GET /api/qualitative-analysis/stats
 * @access Public
 */
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const stats = await QualitativeAnalysis.aggregate([
      {
        $group: {
          _id: null,
          totalAnalyses: { $sum: 1 },
          avgScore: { $avg: '$overallScore' },
          criticalCount: { $sum: { $cond: [{ $eq: ['$priorityLevel', 'critical'] }, 1, 0] } },
          veryHighCount: { $sum: { $cond: [{ $eq: ['$priorityLevel', 'very-high'] }, 1, 0] } },
          highCount: { $sum: { $cond: [{ $eq: ['$priorityLevel', 'high'] }, 1, 0] } },
          moderateCount: { $sum: { $cond: [{ $eq: ['$priorityLevel', 'moderate'] }, 1, 0] } },
          lowCount: { $sum: { $cond: [{ $eq: ['$priorityLevel', 'low'] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalAnalyses: 1,
          avgScore: { $round: ['$avgScore', 1] },
          byPriority: {
            critical: '$criticalCount',
            veryHigh: '$veryHighCount',
            high: '$highCount',
            moderate: '$moderateCount',
            low: '$lowCount',
          },
        },
      },
    ]);

    const countryStats = await QualitativeAnalysis.aggregate([
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 },
          avgScore: { $avg: '$overallScore' },
        },
      },
      {
        $project: {
          country: '$_id',
          count: 1,
          avgScore: { $round: ['$avgScore', 1] },
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalAnalyses: 0,
        avgScore: 0,
        byPriority: { critical: 0, veryHigh: 0, high: 0, moderate: 0, low: 0 },
      },
      byCountry: countryStats,
    });
  } catch (error) {
    console.error('[QualitativeAnalysis] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message,
    });
  }
});

/**
 * Delete an analysis
 * @route DELETE /api/qualitative-analysis/:id
 * @access Authenticated (Admin/Supervisor)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check user role
    if (!['admin', 'supervisor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only admins and supervisors can delete analyses',
      });
    }

    const analysis = await QualitativeAnalysis.findByIdAndDelete(id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found',
      });
    }

    res.json({
      success: true,
      message: 'Analysis deleted successfully',
    });
  } catch (error) {
    console.error('[QualitativeAnalysis] Error deleting analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete analysis',
      message: error.message,
    });
  }
});

module.exports = router;
