/**
 * Notifications Routes - Get and manage user notifications
 */
const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /notifications - Get notifications for current user
 */
router.get('/', auth, async (req, res) => {
  try {
    const { type, unreadOnly, limit = 20, skip = 0 } = req.query;

    const notifications = await Notification.getForUser(req.user._id, {
      type,
      unreadOnly: unreadOnly === 'true',
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    const total = await Notification.countDocuments({ user: req.user._id });
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      data: notifications,
      total,
      unreadCount,
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
 * GET /notifications/unread-count - Get unread notification count
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * GET /notifications/:id - Get a single notification
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate('sender', 'name avatar')
      .populate('organization', 'name');

    if (!notification) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Notification not found'
      });
    }

    res.json(notification);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'The notification ID is invalid'
      });
    }
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * PUT /notifications/:id/read - Mark notification as read
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    res.status(400).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * PUT /notifications/read-all - Mark all notifications as read
 */
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(400).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * DELETE /notifications/:id - Delete a notification
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Notification not found'
      });
    }

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

/**
 * DELETE /notifications - Delete all read notifications
 */
router.delete('/', auth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id,
      read: true,
    });

    res.json({
      message: 'Read notifications deleted',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

/**
 * POST /notifications/test-proximity - Test proximity notification (dev only)
 */
router.post('/test-proximity', auth, async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      error: 'Not allowed',
      message: 'This endpoint is only available in development'
    });
  }

  try {
    const { coordinates, message } = req.body;

    const notifications = await Notification.notifyNearbyUsers({
      coordinates: coordinates || req.user.lastKnownLocation?.coordinates,
      maxDistance: 50000, // 50km for testing
      title: 'Test Proximity Notification',
      message: message || 'This is a test proximity notification',
      sender: req.user._id,
      excludeUserId: req.user._id,
    });

    res.json({
      message: 'Test notifications sent',
      notificationsSent: notifications.length
    });
  } catch (error) {
    res.status(400).json({
      error: 'Test failed',
      message: error.message
    });
  }
});

module.exports = router;
