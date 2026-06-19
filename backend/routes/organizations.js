/**
 * Organizations Routes - CRUD and member management
 */
const express = require('express');
const crypto = require('crypto');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { isAdmin, canManageOrganization, isOrganizationMember } = require('../middleware/roles');
const { logActivity } = require('../middleware/activityLogger');
const { uploadSinglePhoto, processUploadedFiles } = require('../middleware/upload');

const router = express.Router();

/**
 * GET /organizations - Get all organizations
 */
router.get('/', auth, async (req, res) => {
  try {
    const { search, limit = 50, skip = 0 } = req.query;

    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Non-admins only see their own organizations
    if (req.user.role !== 'admin') {
      query['members.user'] = req.user._id;
    }

    const organizations = await Organization.find(query)
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ name: 1 });

    const total = await Organization.countDocuments(query);

    res.json({
      data: organizations,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /organizations/:id - Get organization by ID
 */
router.get('/:id', auth, isOrganizationMember, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .populate('members.user', 'name email avatar role')
      .populate('members.invitedBy', 'name')
      .populate('createdBy', 'name email');

    if (!organization) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Organization not found'
      });
    }

    res.json(organization);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'The organization ID is invalid'
      });
    }
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /organizations/slug/:slug - Get organization by slug
 */
router.get('/slug/:slug', auth, async (req, res) => {
  try {
    const organization = await Organization.findBySlug(req.params.slug)
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name');

    if (!organization) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Organization not found'
      });
    }

    // Check membership for non-admins
    if (req.user.role !== 'admin' && !organization.isMember(req.user._id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this organization'
      });
    }

    res.json(organization);
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * POST /organizations - Create a new organization
 */
router.post('/', auth, 
  logActivity('org-create', 'Organization', (req, data) => ({ entityId: data._id, entityName: data.name })),
  async (req, res) => {
  try {
    const { name, description, contact, settings, focusArea } = req.body;

    // Check if slug already exists
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return res.status(400).json({
        error: 'Name taken',
        message: 'An organization with a similar name already exists'
      });
    }

    const organization = new Organization({
      name,
      description,
      contact,
      settings,
      focusArea,
      createdBy: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner',
        joinedAt: new Date(),
      }],
    });

    await organization.save();

    // Update user's organization reference
    await User.findByIdAndUpdate(req.user._id, { organization: organization._id });

    res.status(201).json({
      message: 'Organization created successfully',
      ...organization.toJSON()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Creation failed',
      message: error.message
    });
  }
});

/**
 * PUT /organizations/:id - Update organization
 */
router.put('/:id', auth, canManageOrganization, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'description', 'contact', 'settings', 'focusArea'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('members.user', 'name email avatar');

    if (!organization) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Organization not found'
      });
    }

    res.json({
      message: 'Organization updated successfully',
      ...organization.toJSON()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * PUT /organizations/:id/logo - Update organization logo
 */
router.put('/:id/logo', auth, canManageOrganization, uploadSinglePhoto, processUploadedFiles, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Upload failed',
        message: 'No file provided'
      });
    }

    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { logo: req.file.url },
      { new: true }
    );

    res.json({
      message: 'Logo updated successfully',
      logo: organization.logo
    });
  } catch (error) {
    res.status(400).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

/**
 * POST /organizations/:id/members - Add member to organization
 */
router.post('/:id/members', auth, canManageOrganization,
  logActivity('member-add', 'Organization', (req, data) => ({ entityId: req.params.id })),
  async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    const organization = req.organization;

    if (organization.isMember(userId)) {
      return res.status(400).json({
        error: 'Already member',
        message: 'User is already a member of this organization'
      });
    }

    organization.addMember(userId, role, req.user._id);
    await organization.save();

    // Update user's organization reference
    await User.findByIdAndUpdate(userId, { organization: organization._id });

    await organization.populate('members.user', 'name email avatar');

    res.json({
      message: 'Member added successfully',
      members: organization.members
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to add member',
      message: error.message
    });
  }
});

/**
 * PUT /organizations/:id/members/:userId - Update member role
 */
router.put('/:id/members/:userId', auth, canManageOrganization,
  logActivity('role-change', 'Organization', (req) => ({ entityId: req.params.id })),
  async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }

    const organization = req.organization;

    // Cannot change owner's role
    const member = organization.members.find(m => m.user.toString() === userId);
    if (member && member.role === 'owner') {
      return res.status(400).json({
        error: 'Cannot change owner',
        message: 'Cannot change the role of the organization owner'
      });
    }

    organization.updateMemberRole(userId, role);
    await organization.save();

    await organization.populate('members.user', 'name email avatar');

    res.json({
      message: 'Member role updated successfully',
      members: organization.members
    });
  } catch (error) {
    res.status(400).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * DELETE /organizations/:id/members/:userId - Remove member from organization
 */
router.delete('/:id/members/:userId', auth, canManageOrganization,
  logActivity('member-remove', 'Organization', (req) => ({ entityId: req.params.id })),
  async (req, res) => {
  try {
    const { userId } = req.params;
    const organization = req.organization;

    // Cannot remove owner
    const member = organization.members.find(m => m.user.toString() === userId);
    if (member && member.role === 'owner') {
      return res.status(400).json({
        error: 'Cannot remove owner',
        message: 'Cannot remove the organization owner'
      });
    }

    organization.removeMember(userId);
    await organization.save();

    // Remove organization reference from user
    await User.findByIdAndUpdate(userId, { $unset: { organization: 1 } });

    res.json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Remove failed',
      message: error.message
    });
  }
});

/**
 * POST /organizations/:id/leave - Leave organization
 */
router.post('/:id/leave', auth, isOrganizationMember,
  logActivity('org-leave', 'Organization', (req) => ({ entityId: req.params.id })),
  async (req, res) => {
  try {
    const organization = req.organization;

    // Owner cannot leave
    const member = organization.members.find(m => m.user.toString() === req.user._id.toString());
    if (member && member.role === 'owner') {
      return res.status(400).json({
        error: 'Cannot leave',
        message: 'Organization owner cannot leave. Transfer ownership first.'
      });
    }

    organization.removeMember(req.user._id);
    await organization.save();

    // Remove organization reference from user
    await User.findByIdAndUpdate(req.user._id, { $unset: { organization: 1 } });

    res.json({
      message: 'Left organization successfully'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Leave failed',
      message: error.message
    });
  }
});

/**
 * POST /organizations/:id/invite - Send invitation
 */
router.post('/:id/invite', auth, canManageOrganization,
  logActivity('org-invite', 'Organization', (req) => ({ entityId: req.params.id })),
  async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const organization = req.organization;

    // Check if already invited
    const existingInvite = organization.invitations.find(i => i.email === email.toLowerCase());
    if (existingInvite) {
      return res.status(400).json({
        error: 'Already invited',
        message: 'An invitation has already been sent to this email'
      });
    }

    // Check if already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && organization.isMember(existingUser._id)) {
      return res.status(400).json({
        error: 'Already member',
        message: 'This user is already a member of the organization'
      });
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    organization.invitations.push({
      email: email.toLowerCase(),
      role,
      token,
      invitedBy: req.user._id,
      expiresAt,
    });

    await organization.save();

    // TODO: Send invitation email

    res.json({
      message: 'Invitation sent successfully',
      invitation: {
        email,
        role,
        expiresAt,
        // Include token for testing (remove in production)
        token: process.env.NODE_ENV === 'development' ? token : undefined,
      }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Invitation failed',
      message: error.message
    });
  }
});

/**
 * POST /organizations/join/:token - Accept invitation
 */
router.post('/join/:token', auth, async (req, res) => {
  try {
    const { token } = req.params;

    const organization = await Organization.findOne({
      'invitations.token': token,
      'invitations.expiresAt': { $gt: new Date() },
    });

    if (!organization) {
      return res.status(400).json({
        error: 'Invalid invitation',
        message: 'Invitation is invalid or has expired'
      });
    }

    const invitation = organization.invitations.find(i => i.token === token);

    // Check if email matches
    if (invitation.email !== req.user.email.toLowerCase()) {
      return res.status(400).json({
        error: 'Email mismatch',
        message: 'This invitation was sent to a different email address'
      });
    }

    // Add user as member
    organization.addMember(req.user._id, invitation.role, invitation.invitedBy);
    
    // Remove invitation
    organization.invitations = organization.invitations.filter(i => i.token !== token);
    
    await organization.save();

    // Update user's organization reference
    await User.findByIdAndUpdate(req.user._id, { organization: organization._id });

    res.json({
      message: 'Joined organization successfully',
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
      }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Join failed',
      message: error.message
    });
  }
});

/**
 * DELETE /organizations/:id - Delete organization (owner only)
 */
router.delete('/:id', auth, canManageOrganization, async (req, res) => {
  try {
    const organization = req.organization;

    // Only owner can delete
    const member = organization.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the organization owner can delete it'
      });
    }

    // Remove organization reference from all members
    await User.updateMany(
      { organization: organization._id },
      { $unset: { organization: 1 } }
    );

    await Organization.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

module.exports = router;
