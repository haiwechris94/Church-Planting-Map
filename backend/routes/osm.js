/**
 * OSM Routes - API endpoints for OSM.pbf village extraction
 * 
 * Routes:
 * - POST /api/osm/extract-villages/:countryCode - Extract villages for a single country
 * - POST /api/osm/extract-all-africa - Extract villages for all Central African countries
 * - GET /api/osm/status/:jobId - Get job status
 * - GET /api/osm/countries - Get list of supported countries
 * - DELETE /api/osm/villages/:countryCode - Delete OSM villages for a country
 * - GET /api/osm/jobs - Get list of extraction jobs
 * - POST /api/osm/jobs/:jobId/cancel - Cancel a pending job
 * - GET /api/osm/stats - Get OSM extraction statistics
 */

const express = require('express');
const router = express.Router();
const osmController = require('../controllers/osmController');
const { auth, optionalAuth } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES (no authentication required)
// ============================================

/**
 * GET /api/osm/countries
 * Get list of supported Central African countries with village counts
 * 
 * Response:
 * {
 *   region: "Central Africa",
 *   totalCountries: 11,
 *   totalOsmVillages: 12345,
 *   countries: [
 *     { code: "CM", name: "Cameroon", nameFr: "Cameroun", bbox: [...], villageCount: 1234 },
 *     ...
 *   ]
 * }
 */
router.get('/countries', optionalAuth, osmController.getCountries);

/**
 * GET /api/osm/status/:jobId
 * Get status of an extraction job
 * 
 * Response:
 * {
 *   job: {
 *     jobId: "osm-CM-1234567890",
 *     status: "processing",
 *     progress: { current: 500, total: 1000, percentage: 50 },
 *     ...
 *   },
 *   queue: { isProcessing: true, queueLength: 2, ... }
 * }
 */
router.get('/status/:jobId', optionalAuth, osmController.getJobStatus);

/**
 * GET /api/osm/jobs
 * Get list of recent extraction jobs
 * 
 * Query params:
 * - limit: Number of jobs to return (default: 10)
 * - status: Filter by status (pending, processing, completed, failed, cancelled)
 */
router.get('/jobs', optionalAuth, osmController.getJobs);

/**
 * GET /api/osm/stats
 * Get OSM extraction statistics
 * 
 * Query params:
 * - countryCode: Filter by country (optional)
 */
router.get('/stats', optionalAuth, osmController.getStats);

// ============================================
// PROTECTED ROUTES (authentication required)
// ============================================

/**
 * POST /api/osm/extract-villages/:countryCode
 * Start extraction job for a single country
 * 
 * Params:
 * - countryCode: ISO 3166-1 alpha-2 country code (e.g., CM, CF, CD)
 * 
 * Body (optional):
 * {
 *   placeTypes: ["village", "hamlet", "town", "city"],
 *   minPopulation: 0
 * }
 * 
 * Response:
 * {
 *   message: "Extraction job started for Cameroon",
 *   job: { jobId: "osm-CM-1234567890", status: "pending", ... },
 *   statusUrl: "/api/osm/status/osm-CM-1234567890"
 * }
 */
router.post('/extract-villages/:countryCode', auth, osmController.extractVillagesForCountry);

/**
 * POST /api/osm/extract-all-africa
 * Start batch extraction job for all Central African countries
 * 
 * Body (optional):
 * {
 *   placeTypes: ["village", "hamlet", "town", "city"],
 *   minPopulation: 0
 * }
 * 
 * Response:
 * {
 *   message: "Batch extraction job started for all Central African countries",
 *   job: { jobId: "osm-ALL-AFRICA-1234567890", totalCountries: 11, ... },
 *   statusUrl: "/api/osm/status/osm-ALL-AFRICA-1234567890"
 * }
 */
router.post('/extract-all-africa', auth, osmController.extractAllAfrica);

/**
 * DELETE /api/osm/villages/:countryCode
 * Delete all OSM-sourced villages for a country
 * 
 * Params:
 * - countryCode: ISO 3166-1 alpha-2 country code
 * 
 * Response:
 * {
 *   message: "Successfully deleted OSM villages for Cameroon",
 *   result: { countryCode: "CM", countryName: "Cameroon", deletedCount: 1234 }
 * }
 */
router.delete('/villages/:countryCode', auth, osmController.deleteVillagesByCountry);

/**
 * POST /api/osm/jobs/:jobId/cancel
 * Cancel a pending job
 * 
 * Response:
 * {
 *   message: "Job osm-CM-1234567890 has been cancelled",
 *   job: { jobId: "...", status: "cancelled", ... }
 * }
 */
router.post('/jobs/:jobId/cancel', auth, osmController.cancelJob);

module.exports = router;
