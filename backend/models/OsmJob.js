/**
 * OSM Job Model - Tracks OSM extraction jobs for villages
 * Used for batch processing of African countries from OSM.pbf files
 */
const mongoose = require('mongoose');

const osmJobSchema = new mongoose.Schema(
  {
    // Job identification
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Job type: 'single-country' or 'all-africa'
    jobType: {
      type: String,
      enum: ['single-country', 'all-africa'],
      required: true,
    },
    
    // Target country code (ISO 3166-1 alpha-2) or 'ALL' for all Africa
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    
    // Country name for display
    countryName: {
      type: String,
    },
    
    // Job status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    
    // Progress tracking
    progress: {
      current: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
      currentCountry: {
        type: String,
        default: '',
      },
      processedCountries: [{
        code: String,
        name: String,
        villagesFound: Number,
        status: String,
      }],
    },
    
    // Results
    results: {
      totalVillagesExtracted: {
        type: Number,
        default: 0,
      },
      totalVillagesSaved: {
        type: Number,
        default: 0,
      },
      duplicatesSkipped: {
        type: Number,
        default: 0,
      },
      errors: [{
        country: String,
        message: String,
        timestamp: Date,
      }],
    },
    
    // Timing
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    estimatedTimeRemaining: {
      type: Number, // in seconds
    },
    
    // User who initiated the job
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Error message if failed
    errorMessage: {
      type: String,
    },
    
    // Configuration used for extraction
    config: {
      placeTypes: {
        type: [String],
        default: ['village', 'hamlet', 'town', 'city'],
      },
      minPopulation: {
        type: Number,
        default: 0,
      },
      osmPbfPath: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
osmJobSchema.index({ status: 1, createdAt: -1 });
osmJobSchema.index({ countryCode: 1, status: 1 });
osmJobSchema.index({ createdBy: 1, createdAt: -1 });

// Virtual for duration calculation
osmJobSchema.virtual('duration').get(function () {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / 1000); // in seconds
  }
  if (this.startedAt) {
    return Math.round((new Date() - this.startedAt) / 1000);
  }
  return 0;
});

// Method to update progress
osmJobSchema.methods.updateProgress = async function (current, total, currentCountry = '') {
  this.progress.current = current;
  this.progress.total = total;
  this.progress.percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  if (currentCountry) {
    this.progress.currentCountry = currentCountry;
  }
  await this.save();
};

// Method to add processed country
osmJobSchema.methods.addProcessedCountry = async function (countryData) {
  this.progress.processedCountries.push(countryData);
  await this.save();
};

// Method to mark as completed
osmJobSchema.methods.markCompleted = async function (results) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.results = { ...this.results, ...results };
  this.progress.percentage = 100;
  await this.save();
};

// Method to mark as failed
osmJobSchema.methods.markFailed = async function (errorMessage) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = errorMessage;
  await this.save();
};

// Static method to get active jobs
osmJobSchema.statics.getActiveJobs = function () {
  return this.find({ status: { $in: ['pending', 'processing'] } })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');
};

// Static method to get job by ID
osmJobSchema.statics.getJobById = function (jobId) {
  return this.findOne({ jobId })
    .populate('createdBy', 'name email');
};

// Enable virtuals in JSON output
osmJobSchema.set('toJSON', { virtuals: true });
osmJobSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('OsmJob', osmJobSchema);
