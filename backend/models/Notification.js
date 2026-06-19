/**
 * Notification Model - For real-time notifications and proximity alerts
 * Supports various notification types including proximity-based notifications
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Recipient user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Notification type
    type: {
      type: String,
      enum: {
        values: [
          'proximity',           // Someone added content near user's location
          'approval-required',   // Content needs approval (for supervisors)
          'approval-granted',    // User's content was approved
          'approval-rejected',   // User's content was rejected
          'new-member',          // New member joined organization
          'content-updated',     // Content user follows was updated
          'mention',             // User was mentioned
          'system',              // System notification
          'welcome',             // Welcome message
          'reminder',            // Reminder notification
        ],
        message: 'Invalid notification type',
      },
      required: true,
    },
    // Notification title
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    // Notification message
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    // Read status
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    // Related entity (polymorphic reference)
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['Village', 'PeopleGroup', 'Church', 'Organization', 'User', 'Activity'],
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    // Location for proximity notifications
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
    // Distance in meters (for proximity notifications)
    distance: {
      type: Number,
      min: 0,
    },
    // Action URL (for click-through)
    actionUrl: {
      type: String,
      trim: true,
    },
    // Priority level
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    // Sender (if applicable)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Organization context
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    // Metadata for additional context
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Expiration (auto-delete after this date)
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ location: '2dsphere' });
notificationSchema.index({ organization: 1 });
notificationSchema.index({ createdAt: -1 });

// Mark as read
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create proximity notification
notificationSchema.statics.createProximityNotification = async function (options) {
  const {
    userId,
    title,
    message,
    location,
    distance,
    relatedEntity,
    sender,
    organization,
  } = options;

  return this.create({
    user: userId,
    type: 'proximity',
    title,
    message,
    location,
    distance,
    relatedEntity,
    sender,
    organization,
    priority: 'normal',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ user: userId, read: false });
};

// Static method to get notifications for user
notificationSchema.statics.getForUser = function (userId, options = {}) {
  const { limit = 20, skip = 0, type, unreadOnly = false } = options;
  
  const query = { user: userId };
  if (type) query.type = type;
  if (unreadOnly) query.read = false;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name avatar')
    .populate('organization', 'name');
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

// Static method to delete old notifications
notificationSchema.statics.deleteOld = function (daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({ createdAt: { $lt: cutoffDate }, read: true });
};

// Static method to notify users near a location
notificationSchema.statics.notifyNearbyUsers = async function (options) {
  const {
    coordinates,
    maxDistance = 10000, // 10km default
    title,
    message,
    relatedEntity,
    sender,
    organization,
    excludeUserId,
  } = options;

  const User = mongoose.model('User');
  
  // Find users near the location who have proximity notifications enabled
  const nearbyUsers = await User.find({
    lastKnownLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates,
        },
        $maxDistance: maxDistance,
      },
    },
    'notificationPreferences.proximity': true,
    isActive: true,
    _id: { $ne: excludeUserId },
  });

  // Create notifications for each nearby user
  const notifications = nearbyUsers.map(user => ({
    user: user._id,
    type: 'proximity',
    title,
    message,
    location: {
      type: 'Point',
      coordinates: coordinates,
    },
    relatedEntity,
    sender,
    organization,
    priority: 'normal',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }));

  if (notifications.length > 0) {
    return this.insertMany(notifications);
  }
  return [];
};

module.exports = mongoose.model('Notification', notificationSchema);
