const express = require('express');
const Activity = require('../models/Activity');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /activities - List all activities with filtering, pagination, sorting
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      type,
      village,
      church,
      user,
      startDate,
      endDate,
      limit = 50,
      skip = 0,
      sort = '-date',
      search
    } = req.query;

    // Build query
    const query = {};

    if (type) {
      query.type = type;
    }

    if (village) {
      query.village = village;
    }

    if (church) {
      query.church = church;
    }

    if (user) {
      query.user = user;
    }

    // Date range filtering
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Parse sort parameter
    const sortOptions = {};
    if (sort.startsWith('-')) {
      sortOptions[sort.substring(1)] = -1;
    } else {
      sortOptions[sort] = 1;
    }

    const activities = await Activity.find(query)
      .populate('user', 'name email')
      .populate('village', 'name region')
      .populate('church', 'name')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort(sortOptions);

    const total = await Activity.countDocuments(query);

    res.json({
      activities,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
      hasMore: parseInt(skip) + activities.length < total
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// GET /activities/:id - Get single activity
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('user', 'name email')
      .populate('village', 'name region country location')
      .populate('church', 'name');

    if (!activity) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Activity not found'
      });
    }

    res.json(activity);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'The activity ID is invalid'
      });
    }
    console.error('Error fetching activity:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// POST /activities - Create new activity
router.post('/', auth, async (req, res) => {
  try {
    const {
      type,
      description,
      date,
      village,
      church,
      participants,
      notes,
      attachments
    } = req.body;

    const activityData = {
      type,
      description,
      date: date || new Date(),
      user: req.user._id, // From auth middleware
      participants
    };

    // Optional fields
    if (village) activityData.village = village;
    if (church) activityData.church = church;
    if (notes) activityData.notes = notes;
    if (attachments) activityData.attachments = attachments;

    const activity = new Activity(activityData);
    await activity.save();

    // Populate references for response
    await activity.populate('user', 'name email');
    if (activity.village) await activity.populate('village', 'name region');
    if (activity.church) await activity.populate('church', 'name');

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to('map').emit('activity-added', activity);
    }

    res.status(201).json({
      message: 'Activity created successfully',
      activity
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(400).json({
      error: 'Creation failed',
      message: error.message
    });
  }
});

// PUT /activities/:id - Update activity
router.put('/:id', auth, async (req, res) => {
  try {
    const allowedUpdates = ['type', 'description', 'date', 'village', 'church', 'participants', 'notes', 'attachments'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Activity not found'
      });
    }

    // Check if user owns this activity or is admin
    if (activity.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own activities'
      });
    }

    const updatedActivity = await Activity.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('village', 'name region')
      .populate('church', 'name');

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to('map').emit('activity-updated', updatedActivity);
    }

    res.json({
      message: 'Activity updated successfully',
      activity: updatedActivity
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'The activity ID is invalid'
      });
    }
    console.error('Error updating activity:', error);
    res.status(400).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

// DELETE /activities/:id - Delete activity
router.delete('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Activity not found'
      });
    }

    // Check if user owns this activity or is admin
    if (activity.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own activities'
      });
    }

    await Activity.findByIdAndDelete(req.params.id);

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to('map').emit('activity-deleted', { id: req.params.id });
    }

    res.json({
      message: 'Activity deleted successfully',
      id: req.params.id
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'The activity ID is invalid'
      });
    }
    console.error('Error deleting activity:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// PATCH /activities/:id/archive - Archive or unarchive an activity
router.patch('/:id/archive', auth, async (req, res) => {
  try {
    const { archived } = req.body;

    if (typeof archived !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'archived field must be a boolean'
      });
    }

    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Activity not found'
      });
    }

    // Check if user owns this activity or is admin/supervisor
    if (activity.user.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        req.user.role !== 'supervisor') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only archive your own activities'
      });
    }

    const updatedActivity = await Activity.findByIdAndUpdate(
      req.params.id,
      { archived },
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('village', 'name region')
      .populate('church', 'name');

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to('map').emit('activity-archived', updatedActivity);
    }

    res.json({
      message: archived ? 'Activity archived successfully' : 'Activity unarchived successfully',
      activity: updatedActivity
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'The activity ID is invalid'
      });
    }
    console.error('Error archiving activity:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router;
