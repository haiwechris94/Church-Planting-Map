/**
 * Dashboard Routes
 * Provides API endpoints for dashboard KPIs, charts, and hierarchical data
 */

const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const {
  getKPISummary,
  getStatusDistribution,
  getCoverageGauge,
  getHierarchicalData,
  getVillageDetails,
  getVillageDetailsByName
} = require('../controllers/dashboardController');

/**
 * @route   GET /api/dashboard/kpi-summary
 * @desc    Get KPI summary with status counts and percentages
 * @access  Public (with optional auth)
 */
router.get('/kpi-summary', optionalAuth, getKPISummary);

/**
 * @route   GET /api/dashboard/status-distribution
 * @desc    Get status distribution for donut chart
 * @access  Public (with optional auth)
 */
router.get('/status-distribution', optionalAuth, getStatusDistribution);

/**
 * @route   GET /api/dashboard/coverage-gauge
 * @desc    Get coverage gauge data
 * @access  Public (with optional auth)
 */
router.get('/coverage-gauge', optionalAuth, getCoverageGauge);

/**
 * @route   GET /api/dashboard/hierarchical-data
 * @desc    Get hierarchical data for drill-down table
 * @query   level - Hierarchy level (country, region, department, district, village)
 * @query   parent - Parent name for filtering
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 * @query   sortBy - Sort field (default: name)
 * @query   sortOrder - Sort order (asc/desc, default: asc)
 * @access  Public (with optional auth)
 */
router.get('/hierarchical-data', optionalAuth, getHierarchicalData);

module.exports = router;
