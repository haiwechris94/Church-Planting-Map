/**
 * Organization Model - For team management and collaborative mapping
 * Supports member management, settings, and organization-level permissions
 */
const mongoose = require('mongoose');

// Member schema for organization members
const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer'],
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: false });

// Invitation schema for pending invitations
const invitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member',
  },
  token: {
    type: String,
    required: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Organization name must be at least 2 characters'],
      maxlength: [200, 'Organization name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    logo: {
      type: String,
      default: null,
    },
    // Contact information
    contact: {
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
      phone: String,
      website: String,
      address: String,
    },
    // Members array
    members: [memberSchema],
    // Pending invitations
    invitations: [invitationSchema],
    // Organization settings
    settings: {
      // Default visibility for new items
      defaultVisibility: {
        type: String,
        enum: ['public', 'organization', 'private'],
        default: 'organization',
      },
      // Require approval for new additions
      requireApproval: {
        type: Boolean,
        default: true,
      },
      // Allow guests to view
      allowGuestView: {
        type: Boolean,
        default: true,
      },
      // Notification settings
      notifications: {
        newMember: { type: Boolean, default: true },
        newContent: { type: Boolean, default: true },
        approvalRequired: { type: Boolean, default: true },
      },
      // Map settings
      mapSettings: {
        defaultCenter: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
        defaultZoom: {
          type: Number,
          default: 5,
        },
        clusteringEnabled: {
          type: Boolean,
          default: true,
        },
      },
    },
    // Geographic focus area
    focusArea: {
      regions: [String],
      countries: [String],
    },
    // Statistics (cached for performance)
    stats: {
      memberCount: { type: Number, default: 0 },
      villageCount: { type: Number, default: 0 },
      peopleGroupCount: { type: Number, default: 0 },
      churchCount: { type: Number, default: 0 },
      lastUpdated: Date,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Creator
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// Note: slug already has unique: true in field definition (which creates an index)
organizationSchema.index({ name: 'text', description: 'text' });
organizationSchema.index({ 'members.user': 1 });
organizationSchema.index({ isActive: 1 });
organizationSchema.index({ 'focusArea.countries': 1 });

// Generate slug from name before saving
organizationSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  // Update member count
  this.stats.memberCount = this.members.length;
  next();
});

// Check if user is a member
organizationSchema.methods.isMember = function (userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

// Get member role
organizationSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Check if user can manage organization
organizationSchema.methods.canManage = function (userId) {
  const role = this.getMemberRole(userId);
  return role === 'owner' || role === 'admin';
};

// Add member
organizationSchema.methods.addMember = function (userId, role = 'member', invitedBy = null) {
  if (!this.isMember(userId)) {
    this.members.push({
      user: userId,
      role,
      invitedBy,
      joinedAt: new Date(),
    });
  }
};

// Remove member
organizationSchema.methods.removeMember = function (userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
};

// Update member role
organizationSchema.methods.updateMemberRole = function (userId, newRole) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = newRole;
  }
};

// Static method to find organizations by user
organizationSchema.statics.findByUser = function (userId) {
  return this.find({
    'members.user': userId,
    isActive: true,
  });
};

// Static method to find organization by slug
organizationSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, isActive: true });
};

module.exports = mongoose.model('Organization', organizationSchema);
