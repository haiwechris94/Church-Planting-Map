/**
 * ActivityLog Model - For analytics and audit trail
 * Tracks all user actions for reporting and analytics
 */
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    // User who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // Action type
    action: {
      type: String,
      enum: {
        values: [
          // CRUD operations
          'create',
          'read',
          'update',
          'delete',
          // Approval workflow
          'approve',
          'reject',
          // User actions
          'login',
          'logout',
          'register',
          'password-reset',
          'profile-update',
          // Organization actions
          'org-create',
          'org-join',
          'org-leave',
          'org-invite',
          'member-add',
          'member-remove',
          'role-change',
          // Export actions
          'export-geojson',
          'export-kml',
          'export-excel',
          // Map interactions
          'map-view',
          'search',
          'filter',
          // Other
          'share',
          'comment',
          'upload',
        ],
        message: 'Invalid action type',
      },
      required: true,
    },
    // Entity type affected
    entityType: {
      type: String,
      enum: ['Village', 'PeopleGroup', 'Church', 'Organization', 'User', 'Activity', 'Export'],
      required: true,
    },
    // Entity ID affected
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Entity name (for display without lookup)
    entityName: {
      type: String,
      trim: true,
    },
    // Description of the action
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Changes made (for update actions)
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      fields: [String], // List of changed fields
    },
    // Location where action was performed
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
      }
    },
    // Organization context
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    // IP address (for security auditing)
    ipAddress: {
      type: String,
      trim: true,
    },
    // User agent (for analytics)
    userAgent: {
      type: String,
      trim: true,
    },
    // Session ID
    sessionId: {
      type: String,
      trim: true,
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Region/Country for geographic analytics
    region: String,
    country: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ organization: 1, createdAt: -1 });
activityLogSchema.index({ location: '2dsphere' });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ region: 1, country: 1 });

// Static method to log an activity
activityLogSchema.statics.log = async function (options) {
  const {
    user,
    action,
    entityType,
    entityId,
    entityName,
    description,
    changes,
    location,
    organization,
    ipAddress,
    userAgent,
    sessionId,
    metadata,
    region,
    country,
  } = options;

  return this.create({
    user,
    action,
    entityType,
    entityId,
    entityName,
    description,
    changes,
    location,
    organization,
    ipAddress,
    userAgent,
    sessionId,
    metadata,
    region,
    country,
  });
};

// Static method to get activity timeline
activityLogSchema.statics.getTimeline = function (options = {}) {
  const {
    userId,
    organization,
    entityType,
    action,
    startDate,
    endDate,
    limit = 50,
    skip = 0,
  } = options;

  const query = {};
  if (userId) query.user = userId;
  if (organization) query.organization = organization;
  if (entityType) query.entityType = entityType;
  if (action) query.action = action;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name email avatar')
    .populate('organization', 'name');
};

// Static method to get activity statistics
activityLogSchema.statics.getStats = async function (options = {}) {
  const { organization, startDate, endDate, groupBy = 'action' } = options;

  const matchStage = {};
  if (organization) matchStage.organization = mongoose.Types.ObjectId(organization);
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const groupField = `$${groupBy}`;

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupField,
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
      },
    },
    {
      $project: {
        [groupBy]: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        _id: 0,
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get daily activity counts
activityLogSchema.statics.getDailyActivity = async function (options = {}) {
  const { organization, days = 30 } = options;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchStage = { createdAt: { $gte: startDate } };
  if (organization) matchStage.organization = mongoose.Types.ObjectId(organization);

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        count: { $sum: 1 },
        actions: { $push: '$action' },
      },
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
          },
        },
        count: 1,
        actionBreakdown: {
          $reduce: {
            input: '$actions',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                { $literal: { '$$this': 1 } },
              ],
            },
          },
        },
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);
};

// Static method to get user activity summary
activityLogSchema.statics.getUserActivitySummary = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' },
      },
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        lastActivity: 1,
        _id: 0,
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get geographic activity distribution
activityLogSchema.statics.getGeographicDistribution = async function (options = {}) {
  const { organization, startDate, endDate } = options;

  const matchStage = {};
  if (organization) matchStage.organization = mongoose.Types.ObjectId(organization);
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: { ...matchStage, country: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: { country: '$country', region: '$region' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        country: '$_id.country',
        region: '$_id.region',
        count: 1,
        _id: 0,
      },
    },
    { $sort: { count: -1 } },
  ]);
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
