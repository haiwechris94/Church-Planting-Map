/**
 * OSM Controller - Handles OSM.pbf extraction endpoints
 * 
 * Endpoints:
 * 1. POST /api/osm/extract-villages/:countryCode - Extract villages for a single country
 * 2. POST /api/osm/extract-all-africa - Extract villages for all Central African countries
 * 3. GET /api/osm/status/:jobId - Get job status
 * 4. GET /api/osm/countries - Get list of supported countries
 * 5. DELETE /api/osm/villages/:countryCode - Delete OSM villages for a country
 */

const osmService = require('../services/osmService');
const jobQueueService = require('../services/jobQueueService');
const Village = require('../models/Village');
const OsmJob = require('../models/OsmJob');

/**
 * POST /api/osm/extract-villages/:countryCode
 * Start extraction job for a single country
 */
exports.extractVillagesForCountry = async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { placeTypes, minPopulation } = req.body;
    const userId = req.user?._id;

    console.log(`[OsmController] Extract villages request for ${countryCode}`);

    // Validate country code
    const countryInfo = osmService.getCountryInfo(countryCode);
    if (!countryInfo) {
      return res.status(400).json({
        error: 'Invalid country code',
        message: `Country code '${countryCode}' is not supported. Use GET /api/osm/countries to see available countries.`,
        supportedCountries: osmService.getCentralAfricanCountries().map(c => c.code),
      });
    }

    // Check for existing active job for this country
    const activeJobs = await OsmJob.find({
      countryCode: countryCode.toUpperCase(),
      status: { $in: ['pending', 'processing'] },
    });

    if (activeJobs.length > 0) {
      return res.status(409).json({
        error: 'Job already in progress',
        message: `An extraction job for ${countryInfo.name} is already running.`,
        existingJob: {
          jobId: activeJobs[0].jobId,
          status: activeJobs[0].status,
          progress: activeJobs[0].progress,
        },
      });
    }

    // Create extraction job
    const job = await jobQueueService.createSingleCountryJob(countryCode, userId, {
      placeTypes,
      minPopulation,
    });

    res.status(202).json({
      message: `Extraction job started for ${countryInfo.name}`,
      job: {
        jobId: job.jobId,
        countryCode: job.countryCode,
        countryName: job.countryName,
        status: job.status,
        createdAt: job.createdAt,
      },
      statusUrl: `/api/osm/status/${job.jobId}`,
    });

  } catch (error) {
    console.error('[OsmController] Error starting extraction:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * POST /api/osm/extract-all-africa
 * Start batch extraction job for all Central African countries
 */
exports.extractAllAfrica = async (req, res) => {
  try {
    const { placeTypes, minPopulation } = req.body;
    const userId = req.user?._id;

    console.log('[OsmController] Extract all Central Africa request');

    // Check for existing active batch job
    const activeJobs = await OsmJob.find({
      jobType: 'all-africa',
      status: { $in: ['pending', 'processing'] },
    });

    if (activeJobs.length > 0) {
      return res.status(409).json({
        error: 'Batch job already in progress',
        message: 'A batch extraction job for all Central African countries is already running.',
        existingJob: {
          jobId: activeJobs[0].jobId,
          status: activeJobs[0].status,
          progress: activeJobs[0].progress,
        },
      });
    }

    // Create batch job
    const job = await jobQueueService.createAllAfricaJob(userId, {
      placeTypes,
      minPopulation,
    });

    const countries = osmService.getCentralAfricanCountries();

    res.status(202).json({
      message: 'Batch extraction job started for all Central African countries',
      job: {
        jobId: job.jobId,
        jobType: job.jobType,
        status: job.status,
        totalCountries: countries.length,
        countries: countries.map(c => ({ code: c.code, name: c.name })),
        createdAt: job.createdAt,
      },
      statusUrl: `/api/osm/status/${job.jobId}`,
    });

  } catch (error) {
    console.error('[OsmController] Error starting batch extraction:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * GET /api/osm/status/:jobId
 * Get status of an extraction job
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    console.log(`[OsmController] Get job status for ${jobId}`);

    const jobStatus = await jobQueueService.getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({
        error: 'Job not found',
        message: `No job found with ID: ${jobId}`,
      });
    }

    // Add queue status
    const queueStatus = jobQueueService.getQueueStatus();

    res.json({
      job: jobStatus,
      queue: queueStatus,
    });

  } catch (error) {
    console.error('[OsmController] Error getting job status:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * GET /api/osm/countries
 * Get list of supported Central African countries
 */
exports.getCountries = async (req, res) => {
  try {
    const countries = osmService.getCentralAfricanCountries();

    // Get village counts for each country
    const countriesWithStats = await Promise.all(
      countries.map(async (country) => {
        const count = await Village.countDocuments({
          source: 'osm',
          $or: [
            { country: country.name },
            { 'osmData.countryCode': country.code },
          ],
        });

        return {
          ...country,
          villageCount: count,
        };
      })
    );

    // Get total OSM villages
    const totalOsmVillages = await Village.countDocuments({ source: 'osm' });

    res.json({
      region: 'Central Africa',
      totalCountries: countries.length,
      totalOsmVillages,
      countries: countriesWithStats,
    });

  } catch (error) {
    console.error('[OsmController] Error getting countries:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/osm/villages/:countryCode
 * Delete all OSM-sourced villages for a country
 */
exports.deleteVillagesByCountry = async (req, res) => {
  try {
    const { countryCode } = req.params;

    console.log(`[OsmController] Delete OSM villages for ${countryCode}`);

    // Validate country code
    const countryInfo = osmService.getCountryInfo(countryCode);
    if (!countryInfo) {
      return res.status(400).json({
        error: 'Invalid country code',
        message: `Country code '${countryCode}' is not supported.`,
        supportedCountries: osmService.getCentralAfricanCountries().map(c => c.code),
      });
    }

    // Check for active jobs
    const activeJobs = await OsmJob.find({
      countryCode: countryCode.toUpperCase(),
      status: { $in: ['pending', 'processing'] },
    });

    if (activeJobs.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete while job is running',
        message: `An extraction job for ${countryInfo.name} is currently running. Please wait for it to complete.`,
        activeJob: {
          jobId: activeJobs[0].jobId,
          status: activeJobs[0].status,
        },
      });
    }

    // Delete villages
    const result = await osmService.deleteVillagesByCountry(countryCode);

    res.json({
      message: `Successfully deleted OSM villages for ${result.countryName}`,
      result: {
        countryCode: result.countryCode,
        countryName: result.countryName,
        deletedCount: result.deletedCount,
      },
    });

  } catch (error) {
    console.error('[OsmController] Error deleting villages:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * GET /api/osm/jobs
 * Get list of recent extraction jobs
 */
exports.getJobs = async (req, res) => {
  try {
    const { limit = 10, status } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const jobs = await OsmJob.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');

    const queueStatus = jobQueueService.getQueueStatus();

    res.json({
      jobs: jobs.map(job => ({
        jobId: job.jobId,
        jobType: job.jobType,
        countryCode: job.countryCode,
        countryName: job.countryName,
        status: job.status,
        progress: job.progress,
        results: job.results,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        duration: job.duration,
        createdBy: job.createdBy,
        createdAt: job.createdAt,
      })),
      queue: queueStatus,
      total: await OsmJob.countDocuments(query),
    });

  } catch (error) {
    console.error('[OsmController] Error getting jobs:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * POST /api/osm/jobs/:jobId/cancel
 * Cancel a pending job
 */
exports.cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    console.log(`[OsmController] Cancel job ${jobId}`);

    const job = await jobQueueService.cancelJob(jobId);

    res.json({
      message: `Job ${jobId} has been cancelled`,
      job: {
        jobId: job.jobId,
        status: job.status,
        completedAt: job.completedAt,
      },
    });

  } catch (error) {
    console.error('[OsmController] Error cancelling job:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Job not found',
        message: error.message,
      });
    }
    
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({
        error: 'Cannot cancel job',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * GET /api/osm/stats
 * Get OSM extraction statistics
 */
exports.getStats = async (req, res) => {
  try {
    const { countryCode } = req.query;

    // Get village stats by country
    const villageStats = await osmService.getVillageStatsByCountry(countryCode);

    // Get job stats
    const jobStats = await OsmJob.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalVillagesExtracted: { $sum: '$results.totalVillagesExtracted' },
          totalVillagesSaved: { $sum: '$results.totalVillagesSaved' },
        },
      },
    ]);

    // Get total counts
    const totalOsmVillages = await Village.countDocuments({ source: 'osm' });
    const totalJobs = await OsmJob.countDocuments();

    res.json({
      villages: {
        total: totalOsmVillages,
        byCountry: villageStats,
      },
      jobs: {
        total: totalJobs,
        byStatus: jobStats,
      },
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[OsmController] Error getting stats:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
};
