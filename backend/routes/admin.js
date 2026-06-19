/**
 * Admin Routes - User Management
 * All routes require admin role
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

// All routes require authentication and admin role
router.use(auth);
router.use(isAdmin);

/**
 * GET /admin/users
 * List all users (no organization restriction unlike supervisor)
 */
router.get('/users', async (req, res) => {
  try {
    const { search, role, isActive, page = 1, limit = 50 } = req.query;
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -verificationToken -resetPasswordToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);
    
    res.json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasMore: skip + users.length < total
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to list users'
    });
  }
});

/**
 * POST /admin/users
 * Create a new user with any role (admin can create admins, supervisors, etc.)
 */
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, organizationName } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name, email, and password are required'
      });
    }
    
    // Validate role
    const validRoles = ['admin', 'supervisor', 'missionary', 'guest'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'A user with this email already exists'
      });
    }
    
    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'missionary',
      organizationName: organizationName || '',
      isActive: true,
      isVerified: true // Admin-created users are auto-verified
    });
    
    await user.save();
    
    // Remove password from response
    const userResponse = user.toJSON();
    
    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'A user with this email already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create user'
    });
  }
});

/**
 * PUT /admin/users/:userId
 * Update user details (name, email, organizationName)
 */
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, organizationName } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }
    
    // Check if email is being changed and if it's already taken
    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'A user with this email already exists'
        });
      }
      user.email = email.toLowerCase();
    }
    
    if (name) user.name = name;
    if (organizationName !== undefined) user.organizationName = organizationName;
    
    await user.save();
    
    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update user'
    });
  }
});

/**
 * PUT /admin/users/:userId/role
 * Change user role (admin-only version)
 */
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Validate role
    const validRoles = ['admin', 'supervisor', 'missionary', 'guest'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }
    
    // Prevent removing your own admin role
    if (userId === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({
        error: 'Forbidden',
        message: 'You cannot remove your own admin role'
      });
    }
    
    const previousRole = user.role;
    user.role = role;
    await user.save();
    
    res.json({
      message: `User role changed from ${previousRole} to ${role}`,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error changing user role:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to change user role'
    });
  }
});

/**
 * PUT /admin/users/:userId/toggle-active
 * Toggle user's isActive status (block/unblock)
 */
router.put('/users/:userId/toggle-active', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent blocking yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Forbidden',
        message: 'You cannot block your own account'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({
      message: user.isActive ? 'User unblocked successfully' : 'User blocked successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error toggling user active status:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to toggle user status'
    });
  }
});

/**
 * DELETE /admin/users/:userId
 * Delete a user (cannot delete yourself)
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent deleting yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Forbidden',
        message: 'You cannot delete your own account'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }
    
    await User.findByIdAndDelete(userId);
    
    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete user'
    });
  }
});

module.exports = router;
