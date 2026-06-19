const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: {
        values: [
          'visit',
          'evangelism',
          'training',
          'baptism',
          'church-plant',
          'meeting',
          'prayer',
          'outreach',
          'follow-up',
          'coaching-igrow',
          'other',
        ],
        message: 'Invalid activity type',
      },
    },
    // Coaching iGROW specific fields
    coachingDetails: {
      conversationWith: {
        type: String,
        enum: ['leader', 'church-planter', 'other'],
      },
      conversationTheme: {
        type: String,
        trim: true,
        maxlength: [500, 'Conversation theme cannot exceed 500 characters'],
      },
      duration: {
        type: Number, // Duration in minutes
        min: [0, 'Duration cannot be negative'],
      },
    },
    description: {
      type: String,
      required: [true, 'Activity description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Activity date is required'],
      default: Date.now,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      index: true,
    },
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Church',
      index: true,
    },
    peopleGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PeopleGroup',
      index: true,
    },
    participants: {
      type: Number,
      min: [0, 'Participants count cannot be negative'],
      default: 1,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for date-based queries
activitySchema.index({ date: -1 });

// Index for type filtering
activitySchema.index({ type: 1 });

// Compound index for user activities by date
activitySchema.index({ user: 1, date: -1 });

// Compound index for village activities
activitySchema.index({ village: 1, date: -1 });

// Compound index for people group activities
activitySchema.index({ peopleGroup: 1, date: -1 });

// Text index for searching descriptions
activitySchema.index({ description: 'text', notes: 'text' });

module.exports = mongoose.model('Activity', activitySchema);
