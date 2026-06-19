/**
 * RejectedPeopleGroup Model - Stores rejected people groups with rejection details
 * Keeps a record of rejected submissions for review and potential resubmission
 */
const mongoose = require('mongoose');

const rejectedPeopleGroupSchema = new mongoose.Schema({
  // Original people group data
  name: {
    type: String,
    required: [true, 'People group name is required'],
    trim: true,
  },
  villageName: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  numberOfChurches: {
    type: Number,
    default: 0,
  },
  churchGeneration: {
    type: Number,
    default: 0,
  },
  engagementStatus: {
    type: String,
    enum: ['unreached', 'pioneer', 'midway', 'tipping-point', 'dmm'],
    default: 'unreached',
  },
  engagementLevel: {
    type: String,
    enum: ['I', 'II', 'III', 'IV', ''],
    default: '',
  },
  status: {
    type: String,
    enum: ['unreached', 'pioneer', 'mid-journey', 'tipping-point', 'movement'],
    default: 'unreached',
  },
  // GeoJSON Point location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
    },
  },
  // Demographics
  population: {
    type: Number,
    default: 0,
  },
  language: {
    type: String,
    trim: true,
  },
  religion: {
    type: String,
    trim: true,
  },
  believersCount: {
    type: Number,
    default: 0,
  },
  churchesCount: {
    type: Number,
    default: 0,
  },
  region: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  // Photos from original submission
  photos: [{
    url: String,
    filename: String,
    caption: String,
  }],
  // Original submission info
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  originalCreatedAt: {
    type: Date,
  },
  // Rejection info
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  rejectedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  rejectionReason: {
    type: String,
    required: [true, 'Rejection reason is required'],
    trim: true,
    maxlength: [2000, 'Rejection reason cannot exceed 2000 characters'],
  },
  // Status for resubmission workflow
  resubmissionStatus: {
    type: String,
    enum: ['rejected', 'resubmitted', 'archived'],
    default: 'rejected',
  },
  // If resubmitted, link to new people group
  resubmittedAs: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PeopleGroup',
  },
  resubmittedAt: {
    type: Date,
  },
  // Email notification status
  notificationSent: {
    type: Boolean,
    default: false,
  },
  notificationSentAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
rejectedPeopleGroupSchema.index({ createdBy: 1, rejectedAt: -1 });
rejectedPeopleGroupSchema.index({ rejectedBy: 1, rejectedAt: -1 });
rejectedPeopleGroupSchema.index({ resubmissionStatus: 1 });
rejectedPeopleGroupSchema.index({ location: '2dsphere' });

// Static method to get rejected people groups for a user
rejectedPeopleGroupSchema.statics.getForUser = function(userId, options = {}) {
  const { limit = 20, skip = 0, status } = options;
  
  const query = { createdBy: userId };
  if (status) query.resubmissionStatus = status;
  
  return this.find(query)
    .sort({ rejectedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('rejectedBy', 'name email')
    .populate('createdBy', 'name email');
};

// Static method to get all rejected people groups (for admins)
rejectedPeopleGroupSchema.statics.getAll = function(options = {}) {
  const { limit = 50, skip = 0, status, search } = options;
  
  const query = {};
  if (status) query.resubmissionStatus = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { villageName: { $regex: search, $options: 'i' } },
    ];
  }
  
  return this.find(query)
    .sort({ rejectedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('rejectedBy', 'name email avatar')
    .populate('createdBy', 'name email avatar');
};

// Static method to count rejected people groups
rejectedPeopleGroupSchema.statics.getCount = function(filters = {}) {
  return this.countDocuments(filters);
};

module.exports = mongoose.model('RejectedPeopleGroup', rejectedPeopleGroupSchema);
