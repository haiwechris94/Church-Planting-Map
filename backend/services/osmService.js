/**
 * OSM Service - Parses OSM.pbf files and extracts villages
 * Supports filtering by country boundaries for Central African countries
 * 
 * Central African Countries (11 pays):
 * - Cameroon (CM), Central African Republic (CF), Chad (TD)
 * - Republic of Congo (CG), Democratic Republic of Congo (CD)
 * - Equatorial Guinea (GQ), Gabon (GA), São Tomé and Príncipe (ST)
 * - Angola (AO), Burundi (BI), Rwanda (RW)
 */

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');
const Village = require('../models/Village');

// Central African countries with their ISO codes and bounding boxes
const CENTRAL_AFRICAN_COUNTRIES = {
  CM: {
    name: 'Cameroon',
    nameFr: 'Cameroun',
    bbox: [8.4, 1.6, 16.2, 13.1],
  },
  CF: {
    name: 'Central African Republic',
    nameFr: 'République centrafricaine',
    bbox: [14.4, 2.2, 27.5, 11.0],
  },
  TD: {
    name: 'Chad',
    nameFr: 'Tchad',
    bbox: [13.5, 7.4, 24.0, 23.5],
  },
  CG: {
    name: 'Republic of the Congo',
    nameFr: 'République du Congo',
    bbox: [11.2, -5.0, 18.6, 3.7],
  },
  CD: {
    name: 'Democratic Republic of the Congo',
    nameFr: 'République démocratique du Congo',
    bbox: [12.2, -13.5, 31.3, 5.4],
  },
  GQ: {
    name: 'Equatorial Guinea',
    nameFr: 'Guinée équatoriale',
    bbox: [5.6, -1.5, 11.4, 3.8],
  },
  GA: {
    name: 'Gabon',
    nameFr: 'Gabon',
    bbox: [8.7, -4.0, 14.5, 2.3],
  },
  ST: {
    name: 'São Tomé and Príncipe',
    nameFr: 'São Tomé-et-Príncipe',
    bbox: [6.4, -0.1, 7.5, 1.7],
  },
  AO: {
    name: 'Angola',
    nameFr: 'Angola',
    bbox: [11.7, -18.0, 24.1, -4.4],
  },
  BI: {
    name: 'Burundi',
    nameFr: 'Burundi',
    bbox: [29.0, -4.5, 30.9, -2.3],
  },
  RW: {
    name: 'Rwanda',
    nameFr: 'Rwanda',
    bbox: [28.9, -2.8, 30.9, -1.1],
  },
};

// Place types to extract from OSM
const PLACE_TYPES = ['village', 'hamlet', 'town', 'city', 'locality'];

/**
 * OSM Service class for parsing and extracting villages
 */
class OsmService {
  constructor() {
    this.osmPbfPath = path.join(__dirname, '../../frontend/public/data/africa-251226.osm.pbf');
    this.boundariesPath = path.join(__dirname, '../../frontend/public/data/boundaries');
    this.countryBoundaries = new Map();
  }

  /**
   * Get list of Central African countries
   */
  getCentralAfricanCountries() {
    return Object.entries(CENTRAL_AFRICAN_COUNTRIES).map(([code, data]) => ({
      code,
      name: data.name,
      nameFr: data.nameFr,
      bbox: data.bbox,
    }));
  }

  /**
   * Get country info by code
   */
  getCountryInfo(countryCode) {
    const code = countryCode.toUpperCase();
    if (CENTRAL_AFRICAN_COUNTRIES[code]) {
      return {
        code,
        ...CENTRAL_AFRICAN_COUNTRIES[code],
      };
    }
    return null;
  }

  /**
   * Load country boundary GeoJSON
   */
  async loadCountryBoundary(countryCode) {
    const code = countryCode.toUpperCase();
    
    // Check cache first
    if (this.countryBoundaries.has(code)) {
      return this.countryBoundaries.get(code);
    }

    // Try to load from file
    const boundaryFiles = [
      path.join(this.boundariesPath, `${code}.geojson`),
      path.join(this.boundariesPath, `${code.toLowerCase()}.geojson`),
      path.join(this.boundariesPath, `${CENTRAL_AFRICAN_COUNTRIES[code]?.name?.toLowerCase().replace(/\s+/g, '-')}.geojson`),
    ];

    for (const filePath of boundaryFiles) {
      try {
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          this.countryBoundaries.set(code, data);
          console.log(`[OsmService] Loaded boundary for ${code} from ${filePath}`);
          return data;
        }
      } catch (error) {
        console.warn(`[OsmService] Failed to load boundary from ${filePath}:`, error.message);
      }
    }

    // Fall back to bounding box
    console.log(`[OsmService] No boundary file found for ${code}, using bounding box`);
    return null;
  }

  /**
   * Check if a point is within a country
   */
  isPointInCountry(lon, lat, countryCode) {
    const code = countryCode.toUpperCase();
    const countryInfo = CENTRAL_AFRICAN_COUNTRIES[code];
    
    if (!countryInfo) {
      return false;
    }

    // First check bounding box (fast)
    const [minLon, minLat, maxLon, maxLat] = countryInfo.bbox;
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) {
      return false;
    }

    // If we have a boundary polygon, do precise check
    const boundary = this.countryBoundaries.get(code);
    if (boundary) {
      try {
        const point = turf.point([lon, lat]);
        
        // Handle both Feature and FeatureCollection
        if (boundary.type === 'FeatureCollection') {
          return boundary.features.some(feature => 
            turf.booleanPointInPolygon(point, feature)
          );
        } else if (boundary.type === 'Feature') {
          return turf.booleanPointInPolygon(point, boundary);
        }
      } catch (error) {
        // Fall back to bounding box check
        return true;
      }
    }

    // Bounding box check passed
    return true;
  }

  /**
   * Parse OSM.pbf file and extract villages for a specific country
   * Uses streaming to handle large files efficiently
   */
  async extractVillagesForCountry(countryCode, options = {}) {
    const {
      placeTypes = PLACE_TYPES,
      onProgress = null,
      batchSize = 1000,
    } = options;

    const code = countryCode.toUpperCase();
    const countryInfo = this.getCountryInfo(code);
    
    if (!countryInfo) {
      throw new Error(`Unknown country code: ${countryCode}`);
    }

    console.log(`[OsmService] Starting extraction for ${countryInfo.name} (${code})`);
    console.log(`[OsmService] OSM.pbf path: ${this.osmPbfPath}`);

    // Check if OSM.pbf file exists
    if (!fs.existsSync(this.osmPbfPath)) {
      throw new Error(`OSM.pbf file not found at: ${this.osmPbfPath}`);
    }

    // Get file size for progress tracking
    const fileStats = fs.statSync(this.osmPbfPath);
    const fileSizeBytes = fileStats.size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    const fileSizeGB = (fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
    console.log(`[OsmService] File size: ${fileSizeGB} GB (${fileSizeMB} MB)`);

    // Load country boundary
    await this.loadCountryBoundary(code);

    const villages = [];
    let nodesProcessed = 0;
    let waysProcessed = 0;
    let relationsProcessed = 0;
    let totalItemsProcessed = 0;
    let villagesFound = 0;
    let bytesRead = 0;
    const startTime = Date.now();
    let lastProgressTime = startTime;
    const PROGRESS_INTERVAL = 100000; // Log every 100,000 items
    const MIN_TIME_BETWEEN_LOGS = 5000; // At least 5 seconds between logs

    // Helper function to format elapsed time
    const formatElapsedTime = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    };

    // Helper function to create progress bar
    const createProgressBar = (percent, width = 30) => {
      const filled = Math.round(width * percent / 100);
      const empty = width - filled;
      return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent.toFixed(1)}%`;
    };

    // Helper function to log progress
    const logProgress = (force = false) => {
      const now = Date.now();
      const timeSinceLastLog = now - lastProgressTime;
      
      // Only log if forced, or enough items processed AND enough time passed
      if (!force && timeSinceLastLog < MIN_TIME_BETWEEN_LOGS) {
        return;
      }
      
      lastProgressTime = now;
      const elapsed = now - startTime;
      const elapsedStr = formatElapsedTime(elapsed);
      
      // Calculate progress percentage based on bytes read
      const progressPercent = fileSizeBytes > 0 ? (bytesRead / fileSizeBytes) * 100 : 0;
      const progressBar = createProgressBar(progressPercent);
      
      // Calculate processing rate
      const itemsPerSecond = elapsed > 0 ? Math.round(totalItemsProcessed / (elapsed / 1000)) : 0;
      const mbPerSecond = elapsed > 0 ? ((bytesRead / (1024 * 1024)) / (elapsed / 1000)).toFixed(2) : 0;
      
      // Estimate remaining time
      let etaStr = 'calculating...';
      if (progressPercent > 0 && progressPercent < 100) {
        const remainingBytes = fileSizeBytes - bytesRead;
        const bytesPerMs = bytesRead / elapsed;
        const remainingMs = bytesPerMs > 0 ? remainingBytes / bytesPerMs : 0;
        etaStr = formatElapsedTime(remainingMs);
      }
      
      console.log(`\n[OsmService] ═══════════════════════════════════════════════════════════`);
      console.log(`[OsmService] Progress: ${progressBar}`);
      console.log(`[OsmService] ───────────────────────────────────────────────────────────`);
      console.log(`[OsmService]   📊 Items processed: ${totalItemsProcessed.toLocaleString()}`);
      console.log(`[OsmService]      • Nodes: ${nodesProcessed.toLocaleString()}`);
      console.log(`[OsmService]      • Ways: ${waysProcessed.toLocaleString()}`);
      console.log(`[OsmService]      • Relations: ${relationsProcessed.toLocaleString()}`);
      console.log(`[OsmService]   🏘️  Villages found: ${villagesFound.toLocaleString()}`);
      console.log(`[OsmService]   📁 Data read: ${(bytesRead / (1024 * 1024)).toFixed(2)} MB / ${fileSizeMB} MB`);
      console.log(`[OsmService]   ⏱️  Elapsed: ${elapsedStr} | ETA: ${etaStr}`);
      console.log(`[OsmService]   🚀 Speed: ${itemsPerSecond.toLocaleString()} items/s | ${mbPerSecond} MB/s`);
      console.log(`[OsmService] ═══════════════════════════════════════════════════════════\n`);
    };

    return new Promise((resolve, reject) => {
      try {
        // Use osm-pbf-parser for streaming
        const through2 = require('through2');
        let parser;
        
        try {
          parser = require('osm-pbf-parser');
        } catch (e) {
          // Fallback: parse using alternative method
          console.log('[OsmService] osm-pbf-parser not available, using fallback method');
          return this.extractVillagesFallback(code, options).then(resolve).catch(reject);
        }

        const parseStream = parser();
        const fileStream = fs.createReadStream(this.osmPbfPath);

        // Track bytes read from the file stream
        fileStream.on('data', (chunk) => {
          bytesRead += chunk.length;
        });

        fileStream
          .pipe(parseStream)
          .pipe(through2.obj((items, enc, callback) => {
            items.forEach(item => {
              totalItemsProcessed++;
              
              // Track item types
              if (item.type === 'node') {
                nodesProcessed++;
              } else if (item.type === 'way') {
                waysProcessed++;
              } else if (item.type === 'relation') {
                relationsProcessed++;
              }
              
              // Log progress every PROGRESS_INTERVAL items
              if (totalItemsProcessed % PROGRESS_INTERVAL === 0) {
                logProgress();
              }
              
              // Only process nodes with place tags for village extraction
              if (item.type === 'node' && item.tags && item.tags.place) {
                
                const placeType = item.tags.place;
                if (placeTypes.includes(placeType)) {
                  const lon = item.lon;
                  const lat = item.lat;
                  
                  // Check if point is in the target country
                  if (this.isPointInCountry(lon, lat, code)) {
                    villagesFound++;
                    
                    villages.push({
                      osmId: item.id,
                      name: item.tags.name || item.tags['name:fr'] || item.tags['name:en'] || `Village ${item.id}`,
                      location: {
                        type: 'Point',
                        coordinates: [lon, lat],
                      },
                      placeType: placeType,
                      population: parseInt(item.tags.population) || 0,
                      country: countryInfo.name,
                      countryCode: code,
                      source: 'osm',
                      osmTags: {
                        place: placeType,
                        name: item.tags.name,
                        nameFr: item.tags['name:fr'],
                        nameEn: item.tags['name:en'],
                        population: item.tags.population,
                        adminLevel: item.tags.admin_level,
                      },
                    });

                    // Report progress
                    if (onProgress && villagesFound % 100 === 0) {
                      onProgress({
                        nodesProcessed,
                        waysProcessed,
                        relationsProcessed,
                        totalItemsProcessed,
                        villagesFound,
                        bytesRead,
                        fileSizeBytes,
                        country: countryInfo.name,
                      });
                    }
                  }
                }
              }
            });
            callback();
          }))
          .on('finish', () => {
            // Log final progress
            logProgress(true);
            
            const totalTime = Date.now() - startTime;
            const totalTimeStr = formatElapsedTime(totalTime);
            
            console.log(`\n[OsmService] ╔═══════════════════════════════════════════════════════════════════╗`);
            console.log(`[OsmService] ║                    EXTRACTION COMPLETE                            ║`);
            console.log(`[OsmService] ╚═══════════════════════════════════════════════════════════════════╝`);
            console.log(`[OsmService]   Country: ${countryInfo.name} (${code})`);
            console.log(`[OsmService]   Total items processed: ${totalItemsProcessed.toLocaleString()}`);
            console.log(`[OsmService]      • Nodes: ${nodesProcessed.toLocaleString()}`);
            console.log(`[OsmService]      • Ways: ${waysProcessed.toLocaleString()}`);
            console.log(`[OsmService]      • Relations: ${relationsProcessed.toLocaleString()}`);
            console.log(`[OsmService]   🏘️  Villages found: ${villagesFound.toLocaleString()}`);
            console.log(`[OsmService]   ⏱️  Total time: ${totalTimeStr}`);
            console.log(`[OsmService]   📁 File processed: ${fileSizeGB} GB\n`);
            
            resolve({
              countryCode: code,
              countryName: countryInfo.name,
              villages,
              stats: {
                nodesProcessed,
                waysProcessed,
                relationsProcessed,
                totalItemsProcessed,
                villagesFound,
                bytesProcessed: bytesRead,
                fileSizeBytes,
                totalTimeMs: totalTime,
              },
            });
          })
          .on('error', (error) => {
            console.error(`[OsmService] Error parsing OSM.pbf:`, error);
            reject(error);
          });

      } catch (error) {
        console.error(`[OsmService] Error in extraction:`, error);
        reject(error);
      }
    });
  }

  /**
   * Fallback extraction method using simple file reading
   * Used when osm-pbf-parser is not available
   */
  async extractVillagesFallback(countryCode, options = {}) {
    const code = countryCode.toUpperCase();
    const countryInfo = this.getCountryInfo(code);
    
    console.log(`[OsmService] Using fallback extraction for ${countryInfo.name}`);
    console.log(`[OsmService] Note: Install osm-pbf-parser for better performance`);

    // For fallback, we'll create sample data based on country bounding box
    // This is a placeholder - real implementation would need proper PBF parsing
    const villages = [];
    const [minLon, minLat, maxLon, maxLat] = countryInfo.bbox;

    // Generate sample villages within bounding box (for testing)
    // In production, this should be replaced with actual PBF parsing
    console.log(`[OsmService] Fallback: Generating sample data for ${countryInfo.name}`);
    
    return {
      countryCode: code,
      countryName: countryInfo.name,
      villages,
      stats: {
        nodesProcessed: 0,
        villagesFound: 0,
      },
      warning: 'Using fallback method. Install osm-pbf-parser for actual OSM data extraction.',
    };
  }

  /**
   * Save extracted villages to database
   */
  async saveVillagesToDatabase(villages, options = {}) {
    const {
      updateExisting = false,
      onProgress = null,
    } = options;

    let saved = 0;
    let skipped = 0;
    let updated = 0;
    let errors = [];

    console.log(`[OsmService] Saving ${villages.length} villages to database`);

    for (let i = 0; i < villages.length; i++) {
      const villageData = villages[i];
      
      try {
        // Check for existing village by OSM ID or coordinates
        const existingByOsmId = await Village.findOne({
          'osmData.osmId': villageData.osmId,
        });

        const existingByLocation = await Village.findOne({
          'location.coordinates': villageData.location.coordinates,
          source: 'osm',
        });

        if (existingByOsmId || existingByLocation) {
          if (updateExisting) {
            const existing = existingByOsmId || existingByLocation;
            await Village.findByIdAndUpdate(existing._id, {
              name: villageData.name,
              population: villageData.population,
              'osmData.tags': villageData.osmTags,
              updatedAt: new Date(),
            });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        // Create new village
        const village = new Village({
          name: villageData.name,
          location: villageData.location,
          population: villageData.population,
          country: villageData.country,
          source: 'osm',
          status: 'pioneer',
          coverageStatus: 'uncovered',
          osmData: {
            osmId: villageData.osmId,
            placeType: villageData.placeType,
            countryCode: villageData.countryCode,
            tags: villageData.osmTags,
            importedAt: new Date(),
          },
        });

        await village.save();
        saved++;

        // Report progress
        if (onProgress && (saved + skipped + updated) % 100 === 0) {
          onProgress({
            processed: i + 1,
            total: villages.length,
            saved,
            skipped,
            updated,
          });
        }

      } catch (error) {
        errors.push({
          village: villageData.name,
          osmId: villageData.osmId,
          error: error.message,
        });
      }
    }

    console.log(`[OsmService] Save complete: ${saved} saved, ${skipped} skipped, ${updated} updated, ${errors.length} errors`);

    return {
      saved,
      skipped,
      updated,
      errors,
      total: villages.length,
    };
  }

  /**
   * Delete all OSM-sourced villages for a country
   */
  async deleteVillagesByCountry(countryCode) {
    const code = countryCode.toUpperCase();
    const countryInfo = this.getCountryInfo(code);
    
    if (!countryInfo) {
      throw new Error(`Unknown country code: ${countryCode}`);
    }

    console.log(`[OsmService] Deleting OSM villages for ${countryInfo.name}`);

    const result = await Village.deleteMany({
      source: 'osm',
      $or: [
        { country: countryInfo.name },
        { 'osmData.countryCode': code },
      ],
    });

    console.log(`[OsmService] Deleted ${result.deletedCount} villages`);

    return {
      countryCode: code,
      countryName: countryInfo.name,
      deletedCount: result.deletedCount,
    };
  }

  /**
   * Get statistics for OSM villages by country
   */
  async getVillageStatsByCountry(countryCode = null) {
    const matchStage = { source: 'osm' };
    
    if (countryCode) {
      const code = countryCode.toUpperCase();
      const countryInfo = this.getCountryInfo(code);
      if (countryInfo) {
        matchStage.$or = [
          { country: countryInfo.name },
          { 'osmData.countryCode': code },
        ];
      }
    }

    const stats = await Village.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 },
          totalPopulation: { $sum: '$population' },
          avgPopulation: { $avg: '$population' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return stats;
  }
}

// Export singleton instance
module.exports = new OsmService();
