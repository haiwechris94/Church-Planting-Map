/**
 * People Routes - API endpoints for peoples/population management
 * Includes role-based access control for Admin and Supervisor roles
 */
const express = require('express');
const router = express.Router();

// Import middleware
const { auth, optionalAuth } = require('../middleware/auth');
const { isAdmin, isSupervisorOrAdmin } = require('../middleware/roles');

// Import controller
const {
  getAllPeoples,
  getPeopleById,
  createPeople,
  updatePeople,
  deletePeople,
  getPeoplesByPolygon,
  approvePeople,
  getPopulationStats,
} = require('../controllers/peopleController');

/**
 * @route   GET /api/peoples
 * @desc    Get all peoples with pagination and filtering
 * @access  Public (with optional auth for more data)
 * @query   page, limit, status, region, villageName, polygonId, approved, sortBy, sortOrder, search
 */
router.get('/', optionalAuth, getAllPeoples);

/**
 * @route   GET /api/peoples/stats
 * @desc    Get population statistics
 * @access  Public
 * @query   region, status
 */
router.get('/stats', optionalAuth, getPopulationStats);

/**
 * @route   GET /api/peoples/polygon/:polygonId
 * @desc    Get peoples by polygon ID or village name
 * @access  Public
 * @param   polygonId - The polygon ID or village name
 */
router.get('/polygon/:polygonId', optionalAuth, getPeoplesByPolygon);

/**
 * @route   GET /api/peoples/:id
 * @desc    Get a single people by ID
 * @access  Public
 * @param   id - The people record ID
 */
router.get('/:id', optionalAuth, getPeopleById);

/**
 * @route   POST /api/peoples
 * @desc    Create a new people record
 * @access  Admin, Supervisor only
 * @body    name, villageName, village, polygonId, population, households, location,
 *          demographics, language, religion, ethnicity, description, region,
 *          departement, arrondissement, country, status, believersCount,
 *          churchesCount, organization, dataSource, dataYear, isPublic
 */
router.post('/', auth, isSupervisorOrAdmin, createPeople);

/**
 * @route   PUT /api/peoples/:id
 * @desc    Update a people record
 * @access  Admin, Supervisor only
 * @param   id - The people record ID
 * @body    Same as POST
 */
router.put('/:id', auth, isSupervisorOrAdmin, updatePeople);

/**
 * @route   DELETE /api/peoples/:id
 * @desc    Delete a people record
 * @access  Admin only
 * @param   id - The people record ID
 */
router.delete('/:id', auth, isAdmin, deletePeople);

/**
 * @route   POST /api/peoples/:id/approve
 * @desc    Approve a people record
 * @access  Admin, Supervisor only
 * @param   id - The people record ID
 */
router.post('/:id/approve', auth, isSupervisorOrAdmin, approvePeople);

module.exports = router;
