/**
 * Activity Logging Middleware
 * Automatically logs user activities for analytics
 */
const ActivityLog = require('../models/ActivityLog');

/**
 * Log activity middleware factory
 * @param {string} action - Action type
 * @param {string} entityType - Entity type
 * @param {Function} getEntityInfo - Function to extract entity info from request
 */
const logActivity = (action, entityType, getEntityInfo = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after successful response
    res.json = function (data) {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            let entityId, entityName;
            
            if (getEntityInfo) {
              const info = getEntityInfo(req, data);
              entityId = info.entityId;
              entityName = info.entityName;
            } else {
              // Try to extract from response data
              entityId = data?.id || data?._id || req.params.id;
              entityName = data?.name || data?.title;
            }

            await ActivityLog.log({
              user: req.user?._id,
              action,
              entityType,
              entityId,
              entityName,
              description: `${action} ${entityType}: ${entityName || entityId || 'unknown'}`,
              ipAddress: req.ip || req.connection?.remoteAddress,
              userAgent: req.get('User-Agent'),
              sessionId: req.sessionID,
              organization: req.user?.organization,
              metadata: {
                method: req.method,
                path: req.originalUrl,
                query: req.query,
              },
            });
          } catch (error) {
            console.error('Error logging activity:', error);
          }
        });
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Log search activity
 */
const logSearch = async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      setImmediate(async () => {
        try {
          await ActivityLog.log({
            user: req.user?._id,
            action: 'search',
            entityType: req.query.type || 'Village',
            description: `Search: "${req.query.q || ''}"`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            organization: req.user?.organization,
            metadata: {
              query: req.query.q,
              type: req.query.type,
              resultsCount: data?.total || data?.length || 0,
            },
          });
        } catch (error) {
          console.error('Error logging search:', error);
        }
      });
    }

    return originalJson(data);
  };

  next();
};

/**
 * Log export activity
 */
const logExport = (format) => {
  return async (req, res, next) => {
    // Log before sending file
    try {
      await ActivityLog.log({
        user: req.user?._id,
        action: `export-${format}`,
        entityType: 'Export',
        description: `Exported data as ${format.toUpperCase()}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        organization: req.user?.organization,
        metadata: {
          format,
          filters: req.query,
        },
      });
    } catch (error) {
      console.error('Error logging export:', error);
    }

    next();
  };
};

/**
 * Log map view activity (for analytics)
 */
const logMapView = async (req, res, next) => {
  setImmediate(async () => {
    try {
      const { bounds, zoom, center } = req.query;
      
      await ActivityLog.log({
        user: req.user?._id,
        action: 'map-view',
        entityType: 'Village',
        description: 'Viewed map',
        location: center ? {
          type: 'Point',
          coordinates: center.split(',').map(Number),
        } : undefined,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        organization: req.user?.organization,
        metadata: {
          bounds,
          zoom,
          center,
        },
      });
    } catch (error) {
      console.error('Error logging map view:', error);
    }
  });

  next();
};

/**
 * Log authentication events
 */
const logAuth = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      setImmediate(async () => {
        try {
          const userId = data?.user?._id || data?.user?.id || req.user?._id;
          const success = res.statusCode >= 200 && res.statusCode < 300;

          await ActivityLog.log({
            user: userId,
            action,
            entityType: 'User',
            entityId: userId,
            entityName: data?.user?.name || data?.user?.email,
            description: `${action}: ${success ? 'success' : 'failed'}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            metadata: {
              success,
              email: req.body?.email,
            },
          });
        } catch (error) {
          console.error('Error logging auth:', error);
        }
      });

      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  logActivity,
  logSearch,
  logExport,
  logMapView,
  logAuth,
};
