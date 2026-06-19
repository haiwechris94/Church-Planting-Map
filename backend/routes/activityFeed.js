/**
 * Activity Feed Routes — Recent missionary activities
 */
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');

// Try to load Activity or ActivityLog model
let ActivityModel;
try {
  ActivityModel = require('../models/Activity');
} catch (e) {
  try {
    ActivityModel = require('../models/ActivityLog');
  } catch (e2) {
    ActivityModel = null;
  }
}

/**
 * GET /activity/recent
 */
router.get('/recent', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    if (ActivityModel) {
      const activities = await ActivityModel.find()
        .sort({ createdAt: -1, date: -1 })
        .limit(limit)
        .populate('user', 'name firstName lastName')
        .lean();

      const formatted = activities.map((a, i) => {
        const user = a.user;
        let name = 'Unknown';
        if (user) {
          name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
        }
        const createdAt = a.createdAt || a.date || new Date();
        const diffMs = Date.now() - new Date(createdAt).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        let dateLabel = 'Today';
        if (diffDays === 1) dateLabel = 'Yesterday';
        else if (diffDays > 1) dateLabel = `${diffDays} days ago`;

        return {
          id: a._id,
          name,
          action: a.action || a.type || a.description || 'Activity recorded',
          date: dateLabel,
          status: a.status || 'completed',
          avatar: name.charAt(0).toUpperCase(),
        };
      });

      return res.json(formatted);
    }

    // Mock fallback
    res.json([
      { id: 1, name: 'John Smith', action: 'Visited village', date: 'Today', status: 'completed', avatar: 'J' },
      { id: 2, name: 'Mary Doe', action: 'New DMM group created', date: '2 days ago', status: 'completed', avatar: 'M' },
      { id: 3, name: 'Paul Ngom', action: 'Training session held', date: '3 days ago', status: 'in-progress', avatar: 'P' },
      { id: 4, name: 'Sarah Bello', action: 'Church planted', date: '4 days ago', status: 'completed', avatar: 'S' },
      { id: 5, name: 'David Kone', action: 'Village survey completed', date: '5 days ago', status: 'completed', avatar: 'D' },
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
