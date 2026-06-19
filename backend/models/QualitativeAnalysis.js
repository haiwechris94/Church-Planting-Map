/**
 * QualitativeAnalysis Model
 * Stores qualitative analysis results for people groups based on DMM DNA criteria
 */
const mongoose = require('mongoose');

// DMM DNA Criteria schema
const criteriaScoreSchema = new mongoose.Schema({
  criterionId: {
    type: String,
    required: true,
  },
  criterionName: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  weight: {
    type: Number,
    default: 1,
  },
}, { _id: false });

const qualitativeAnalysisSchema = new mongoose.Schema({
  // Reference to the people group being analyzed
  peopleGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PeopleGroup',
    required: true,
  },
  // People group name (denormalized for easier querying)
  peopleGroupName: {
    type: String,
    required: true,
    trim: true,
  },
  // Village name
  villageName: {
    type: String,
    trim: true,
  },
  // Country code
  country: {
    type: String,
    trim: true,
  },
  // DMM DNA Criteria scores
  criteriaScores: [criteriaScoreSchema],
  // Calculated overall score (percentage)
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
  // Priority level based on score
  priorityLevel: {
    type: String,
    enum: ['critical', 'very-high', 'high', 'moderate', 'low'],
    required: true,
  },
  // User remarks
  remarks: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  // User recommendations
  recommendations: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  // DeepSeek AI interpretation
  aiInterpretation: {
    type: String,
    trim: true,
    maxlength: 5000,
  },
  // DeepSeek AI recommendations
  aiRecommendations: {
    type: String,
    trim: true,
    maxlength: 5000,
  },
  // Analysis metadata
  analyzedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  analyzedAt: {
    type: Date,
    default: Date.now,
  },
  // Version for tracking updates
  version: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
qualitativeAnalysisSchema.index({ peopleGroup: 1 });
qualitativeAnalysisSchema.index({ country: 1 });
qualitativeAnalysisSchema.index({ overallScore: 1 });
qualitativeAnalysisSchema.index({ priorityLevel: 1 });
qualitativeAnalysisSchema.index({ analyzedAt: -1 });
qualitativeAnalysisSchema.index({ peopleGroupName: 'text', villageName: 'text' });

// Static method to get analyses by country
qualitativeAnalysisSchema.statics.getByCountry = async function(country) {
  return this.find({ country })
    .populate('peopleGroup', 'name villageName engagementStatus numberOfChurches')
    .populate('analyzedBy', 'name email')
    .sort({ analyzedAt: -1 });
};

// Static method to get latest analysis for a people group
qualitativeAnalysisSchema.statics.getLatestForPeopleGroup = async function(peopleGroupId) {
  return this.findOne({ peopleGroup: peopleGroupId })
    .populate('peopleGroup', 'name villageName engagementStatus numberOfChurches')
    .populate('analyzedBy', 'name email')
    .sort({ analyzedAt: -1 });
};

// Static method to get all analyses grouped by country
qualitativeAnalysisSchema.statics.getAllGroupedByCountry = async function() {
  return this.aggregate([
    {
      $sort: { analyzedAt: -1 }
    },
    {
      $group: {
        _id: '$country',
        analyses: { $push: '$$ROOT' },
        count: { $sum: 1 },
        avgScore: { $avg: '$overallScore' },
      }
    },
    {
      $project: {
        country: '$_id',
        analyses: { $slice: ['$analyses', 50] }, // Limit to 50 per country
        count: 1,
        avgScore: { $round: ['$avgScore', 1] },
        _id: 0,
      }
    },
    {
      $sort: { country: 1 }
    }
  ]);
};

// Virtual for priority display
qualitativeAnalysisSchema.virtual('priorityDisplay').get(function() {
  const displayNames = {
    'critical': 'Critique',
    'very-high': 'Très élevée',
    'high': 'Élevée',
    'moderate': 'Modérée',
    'low': 'Faible',
  };
  return displayNames[this.priorityLevel] || this.priorityLevel;
});

// Enable virtuals in JSON output
qualitativeAnalysisSchema.set('toJSON', { virtuals: true });
qualitativeAnalysisSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('QualitativeAnalysis', qualitativeAnalysisSchema);
