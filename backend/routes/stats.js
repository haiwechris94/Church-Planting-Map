const express = require('express');
const Village = require('../models/Village');
const Church = require('../models/Church');
const Activity = require('../models/Activity');
const PeopleGroup = require('../models/PeopleGroup');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /stats/dashboard - Return dashboard statistics
router.get('/dashboard', optionalAuth, async (req, res) => {
  try {
    // Get total counts in parallel
    const [
      totalVillages,
      totalChurches,
      totalActivities,
      totalPeopleGroups,
      recentActivities,
      villagesByStatus,
      activitiesByType,
      churchesByStatus
    ] = await Promise.all([
      // Total villages
      Village.countDocuments(),
      
      // Total churches
      Church.countDocuments(),
      
      // Total activities
      Activity.countDocuments(),
      
      // Total people groups
      PeopleGroup.countDocuments(),
      
      // Recent activities (last 10)
      Activity.find()
        .populate('user', 'name')
        .populate('village', 'name')
        .populate('church', 'name')
        .sort({ date: -1 })
        .limit(10)
        .lean(),
      
      // Villages grouped by status
      Village.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),
      
      // Activities grouped by type
      Activity.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),
      
      // Churches grouped by status (if status field exists)
      Church.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
    ]);

    // Calculate additional metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      activitiesLast30Days,
      newVillagesLast30Days,
      newChurchesLast30Days
    ] = await Promise.all([
      Activity.countDocuments({ date: { $gte: thirtyDaysAgo } }),
      Village.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Church.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);

    // Format villages by status into object
    const villageStatusCounts = {};
    villagesByStatus.forEach(item => {
      villageStatusCounts[item._id || 'unknown'] = item.count;
    });

    // Format activities by type into object
    const activityTypeCounts = {};
    activitiesByType.forEach(item => {
      activityTypeCounts[item._id || 'unknown'] = item.count;
    });

    // Format churches by status into object
    const churchStatusCounts = {};
    churchesByStatus.forEach(item => {
      churchStatusCounts[item._id || 'unknown'] = item.count;
    });

    res.json({
      totals: {
        villages: totalVillages,
        churches: totalChurches,
        activities: totalActivities,
        peopleGroups: totalPeopleGroups
      },
      last30Days: {
        activities: activitiesLast30Days,
        newVillages: newVillagesLast30Days,
        newChurches: newChurchesLast30Days
      },
      breakdown: {
        villagesByStatus: villageStatusCounts,
        activitiesByType: activityTypeCounts,
        churchesByStatus: churchStatusCounts
      },
      recentActivities: recentActivities.map(activity => ({
        _id: activity._id,
        type: activity.type,
        description: activity.description,
        date: activity.date,
        user: activity.user?.name || 'Unknown',
        village: activity.village?.name || null,
        church: activity.church?.name || null,
        participants: activity.participants
      })),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router;
