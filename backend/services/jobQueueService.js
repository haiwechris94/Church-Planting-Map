/**
 * Job Queue Service - Manages batch processing jobs for OSM extraction
 * Uses in-memory queue for simplicity (can be upgraded to Bull/Redis for production)
 * 
 * Features:
 * - Sequential processing of countries
 * - Progress tracking
 * - Error handling and recovery
 * - Job status persistence in MongoDB
 */

const { v4: uuidv4 } = require('uuid');
const OsmJob = require('../models/OsmJob');
const osmService = require('./osmService');

// In-memory job queue
const jobQueue = [];
let isProcessing = false;
let currentJob = null;

/**
 * Job Queue Service class
 */
class JobQueueService {
  constructor() {
    this.maxConcurrentJobs = 1; // Process one job at a time
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Create a new extraction job for a single country
   */
  async createSingleCountryJob(countryCode, userId = null, config = {}) {
    const code = countryCode.toUpperCase();
    const countryInfo = osmService.getCountryInfo(code);
    
    if (!countryInfo) {
      throw new Error(`Unknown country code: ${countryCode}`);
    }

    const jobId = `osm-${code}-${Date.now()}`;
    
    const job = new OsmJob({
      jobId,
      jobType: 'single-country',
      countryCode: code,
      countryName: countryInfo.name,
      status: 'pending',
      createdBy: userId,
      config: {
        placeTypes: config.placeTypes || ['village', 'hamlet', 'town', 'city'],
        minPopulation: config.minPopulation || 0,
        osmPbfPath: osmService.osmPbfPath,
      },
    });

    await job.save();
    
    // Add to queue
    jobQueue.push(job);
    
    // Start processing if not already running
    this.processQueue();

    console.log(`[JobQueueService] Created job ${jobId} for ${countryInfo.name}`);
    
    return job;
  }

  /**
   * Create a batch job for all Central African countries
   */
  async createAllAfricaJob(userId = null, config = {}) {
    const countries = osmService.getCentralAfricanCountries();
    const jobId = `osm-ALL-AFRICA-${Date.now()}`;
    
    const job = new OsmJob({
      jobId,
      jobType: 'all-africa',
      countryCode: 'ALL',
      countryName: 'All Central African Countries',
      status: 'pending',
      progress: {
        current: 0,
        total: countries.length,
        percentage: 0,
        processedCountries: [],
      },
      createdBy: userId,
      config: {
        placeTypes: config.placeTypes || ['village', 'hamlet', 'town', 'city'],
        minPopulation: config.minPopulation || 0,
        osmPbfPath: osmService.osmPbfPath,
      },
    });

    await job.save();
    
    // Add to queue
    jobQueue.push(job);
    
    // Start processing if not already running
    this.processQueue();

    console.log(`[JobQueueService] Created batch job ${jobId} for ${countries.length} countries`);
    
    return job;
  }

  /**
   * Process the job queue
   */
  async processQueue() {
    if (isProcessing || jobQueue.length === 0) {
      return;
    }

    isProcessing = true;
    
    while (jobQueue.length > 0) {
      currentJob = jobQueue.shift();
      
      try {
        console.log(`[JobQueueService] Processing job ${currentJob.jobId}`);
        
        // Update job status
        currentJob.status = 'processing';
        currentJob.startedAt = new Date();
        await currentJob.save();

        if (currentJob.jobType === 'single-country') {
          await this.processSingleCountryJob(currentJob);
        } else if (currentJob.jobType === 'all-africa') {
          await this.processAllAfricaJob(currentJob);
        }

      } catch (error) {
        console.error(`[JobQueueService] Job ${currentJob.jobId} failed:`, error);
        await currentJob.markFailed(error.message);
      }
    }

    isProcessing = false;
    currentJob = null;
  }

  /**
   * Process a single country extraction job
   */
  async processSingleCountryJob(job) {
    const { countryCode, config } = job;
    
    try {
      // Extract villages
      const extractionResult = await osmService.extractVillagesForCountry(countryCode, {
        placeTypes: config.placeTypes,
        onProgress: async (progress) => {
          job.progress.current = progress.villagesFound;
          await job.save();
        },
      });

      // Save to database
      const saveResult = await osmService.saveVillagesToDatabase(extractionResult.villages, {
        updateExisting: false,
        onProgress: async (progress) => {
          job.progress.percentage = Math.round((progress.processed / progress.total) * 100);
          await job.save();
        },
      });

      // Mark as completed
      await job.markCompleted({
        totalVillagesExtracted: extractionResult.stats.villagesFound,
        totalVillagesSaved: saveResult.saved,
        duplicatesSkipped: saveResult.skipped,
      });

      console.log(`[JobQueueService] Job ${job.jobId} completed successfully`);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Process all Central African countries batch job
   */
  async processAllAfricaJob(job) {
    const countries = osmService.getCentralAfricanCountries();
    let totalExtracted = 0;
    let totalSaved = 0;
    let totalSkipped = 0;

    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      
      try {
        console.log(`[JobQueueService] Processing ${country.name} (${i + 1}/${countries.length})`);
        
        // Update progress
        job.progress.current = i;
        job.progress.currentCountry = country.name;
        job.progress.percentage = Math.round((i / countries.length) * 100);
        await job.save();

        // Extract villages for this country
        const extractionResult = await osmService.extractVillagesForCountry(country.code, {
          placeTypes: job.config.placeTypes,
        });

        // Save to database
        const saveResult = await osmService.saveVillagesToDatabase(extractionResult.villages, {
          updateExisting: false,
        });

        // Track totals
        totalExtracted += extractionResult.stats.villagesFound;
        totalSaved += saveResult.saved;
        totalSkipped += saveResult.skipped;

        // Add to processed countries
        await job.addProcessedCountry({
          code: country.code,
          name: country.name,
          villagesFound: extractionResult.stats.villagesFound,
          villagesSaved: saveResult.saved,
          status: 'completed',
        });

      } catch (error) {
        console.error(`[JobQueueService] Error processing ${country.name}:`, error);
        
        // Add error to job
        job.results.errors.push({
          country: country.name,
          message: error.message,
          timestamp: new Date(),
        });
        
        await job.addProcessedCountry({
          code: country.code,
          name: country.name,
          villagesFound: 0,
          status: 'failed',
        });
      }
    }

    // Mark as completed
    await job.markCompleted({
      totalVillagesExtracted: totalExtracted,
      totalVillagesSaved: totalSaved,
      duplicatesSkipped: totalSkipped,
    });

    console.log(`[JobQueueService] Batch job ${job.jobId} completed`);
    console.log(`[JobQueueService] Total: ${totalExtracted} extracted, ${totalSaved} saved, ${totalSkipped} skipped`);
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId) {
    const job = await OsmJob.getJobById(jobId);
    
    if (!job) {
      return null;
    }

    return {
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
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
    };
  }

  /**
   * Get all active jobs
   */
  async getActiveJobs() {
    return await OsmJob.getActiveJobs();
  }

  /**
   * Get recent jobs
   */
  async getRecentJobs(limit = 10) {
    return await OsmJob.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'name email');
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId) {
    const job = await OsmJob.findOne({ jobId });
    
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error(`Cannot cancel job with status: ${job.status}`);
    }

    // Remove from queue if pending
    const queueIndex = jobQueue.findIndex(j => j.jobId === jobId);
    if (queueIndex !== -1) {
      jobQueue.splice(queueIndex, 1);
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    await job.save();

    return job;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      isProcessing,
      currentJob: currentJob ? {
        jobId: currentJob.jobId,
        countryName: currentJob.countryName,
        progress: currentJob.progress,
      } : null,
      queueLength: jobQueue.length,
      pendingJobs: jobQueue.map(j => ({
        jobId: j.jobId,
        countryName: j.countryName,
      })),
    };
  }
}

// Export singleton instance
module.exports = new JobQueueService();
