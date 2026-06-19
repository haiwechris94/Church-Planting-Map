/**
 * Role-Based Access Control Middleware
 * Provides role checking and permission validation
 */
const User = require('../models/User');

/**
 * Check if user has one of the required roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
        requiredRoles: roles,
        currentRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = checkRole('admin');

/**
 * Check if user is supervisor or admin
 */
const isSupervisorOrAdmin = checkRole('admin', 'supervisor');

/**
 * Check if user is at least a missionary (not guest)
 */
const isMissionary = checkRole('admin', 'supervisor', 'missionary');

/**
 * Check if user can edit a resource
 * Admins and supervisors can edit anything
 * Missionaries can only edit their own content
 */
const canEdit = (getResourceFn) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to edit this resource',
      });
    }

    // Admins and supervisors can edit anything
    if (req.user.role === 'admin' || req.user.role === 'supervisor') {
      return next();
    }

    // Guests cannot edit
    if (req.user.role === 'guest') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Guests cannot edit resources',
      });
    }

    try {
      // Get the resource to check ownership
      const resource = await getResourceFn(req);
      
      if (!resource) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Resource not found',
        });
      }

      // Check if user owns the resource
      const createdBy = resource.createdBy?.toString() || resource.user?.toString();
      if (createdBy !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only edit your own content',
        });
      }

      // Attach resource to request for later use
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Error in canEdit middleware:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Error checking edit permissions',
      });
    }
  };
};

/**
 * Check if user can approve content (supervisors and admins only)
 */
const canApprove = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to approve content',
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only supervisors and admins can approve content',
    });
  }

  next();
};

/**
 * Check if user can export data
 * All authenticated users except guests can export
 */
const canExport = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to export data',
    });
  }

  if (req.user.role === 'guest') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Guests cannot export data',
    });
  }

  next();
};

/**
 * Check if user can delete a resource
 * Admins can delete anything
 * Supervisors can delete within their organization
 * Missionaries can only delete their own content
 */
const canDelete = (getResourceFn) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to delete this resource',
      });
    }

    // Admins can delete anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Guests cannot delete
    if (req.user.role === 'guest') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Guests cannot delete resources',
      });
    }

    try {
      const resource = await getResourceFn(req);
      
      if (!resource) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Resource not found',
        });
      }

      // Supervisors can delete if in same organization
      if (req.user.role === 'supervisor') {
        const userOrg = req.user.organization?.toString();
        const resourceOrg = resource.organization?.toString();
        
        if (userOrg && resourceOrg && userOrg === resourceOrg) {
          req.resource = resource;
          return next();
        }
      }

      // Check ownership for missionaries
      const createdBy = resource.createdBy?.toString() || resource.user?.toString();
      if (createdBy !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete your own content',
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Error in canDelete middleware:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Error checking delete permissions',
      });
    }
  };
};

/**
 * Check if user can manage organization
 */
const canManageOrganization = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to manage organizations',
    });
  }

  // Admins can manage any organization
  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const Organization = require('../models/Organization');
    const orgId = req.params.orgId || req.params.id;
    
    if (!orgId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Organization ID is required',
      });
    }

    const organization = await Organization.findById(orgId);
    
    if (!organization) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Organization not found',
      });
    }

    // Check if user can manage this organization
    if (!organization.canManage(req.user._id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to manage this organization',
      });
    }

    req.organization = organization;
    next();
  } catch (error) {
    console.error('Error in canManageOrganization middleware:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Error checking organization permissions',
    });
  }
};

/**
 * Check if user is member of organization
 */
const isOrganizationMember = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in',
    });
  }

  // Admins have access to all organizations
  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const Organization = require('../models/Organization');
    const orgId = req.params.orgId || req.params.id || req.body.organization;
    
    if (!orgId) {
      return next(); // No organization specified, continue
    }

    const organization = await Organization.findById(orgId);
    
    if (!organization) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Organization not found',
      });
    }

    if (!organization.isMember(req.user._id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this organization',
      });
    }

    req.organization = organization;
    req.memberRole = organization.getMemberRole(req.user._id);
    next();
  } catch (error) {
    console.error('Error in isOrganizationMember middleware:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Error checking organization membership',
    });
  }
};

/**
 * Check specific permission
 */
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in',
      });
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `You do not have the '${permission}' permission`,
        requiredPermission: permission,
      });
    }

    next();
  };
};

module.exports = {
  checkRole,
  isAdmin,
  isSupervisorOrAdmin,
  isMissionary,
  canEdit,
  canApprove,
  canExport,
  canDelete,
  canManageOrganization,
  isOrganizationMember,
  hasPermission,
};
