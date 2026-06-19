/**
 * Joshua Project Service
 * 
 * Service layer for managing Joshua Project people groups data.
 * Provides methods for querying, filtering, and syncing people groups.
 */

const PeopleGroup = require('../models/PeopleGroup');
const axios = require('axios');

// Joshua Project API configuration
const JP_API_BASE = 'https://api.joshuaproject.net/v1/people_groups.json';
const JP_API_KEY = process.env.JP_API_KEY || '2b454615e985';
const RESULTS_PER_PAGE = 250;

// Country centroid fallback coordinates [latitude, longitude]
const COUNTRY_CENTROIDS = {
  CM: [7.3697, 12.3547],      // Cameroon
  BF: [12.2383, -1.5616],     // Burkina Faso
  NE: [17.6078, 8.0817],      // Niger
  TD: [15.4542, 18.7322],     // Chad
  ML: [17.5707, -3.9962],     // Mali
  NG: [9.0820, 8.6753],       // Nigeria
  SN: [14.4974, -14.4524],    // Senegal
  GH: [7.9465, -1.0232],      // Ghana
  CI: [7.5400, -5.5471],      // Côte d'Ivoire
  TG: [8.6195, 0.8248],       // Togo
  BJ: [9.3077, 2.3158],       // Benin
  GA: [-0.8037, 11.6094],     // Gabon
  CG: [-0.2280, 15.8277],     // Congo
  CD: [-4.0383, 21.7587],     // DR Congo
  CF: [6.6111, 20.9394],      // Central African Republic
};

/**
 * Map JPScale to DMM engagement status
 */
const mapJPScaleToStatus = (jpScale) => {
  const scale = parseInt(jpScale);
  if (isNaN(scale) || scale <= 2) return 'unreached';
  if (scale === 3) return 'pioneer';
  if (scale === 4) return 'midway';
  if (scale >= 5) return 'dmm';
  return 'unreached';
};

/**
 * Transform Joshua Project API data to PeopleGroup schema
 */
const transformJPData = (jpRecord, countryCode) => {
  let latitude = parseFloat(jpRecord.Latitude);
  let longitude = parseFloat(jpRecord.Longitude);
  
  // Use country centroid if coordinates are missing or invalid
  if (isNaN(latitude) || isNaN(longitude) || (latitude === 0 && longitude === 0)) {
    const centroid = COUNTRY_CENTROIDS[countryCode?.toUpperCase()];
    if (centroid) {
      latitude = centroid[0];
      longitude = centroid[1];
    } else {
      latitude = 0;
      longitude = 0;
    }
  }

  const dmmStatus = mapJPScaleToStatus(jpRecord.JPScale);
  
  return {
    name: jpRecord.PeopNameInCountry || jpRecord.PeopName || 'Unknown',
    // NOTE: Joshua Project data does not include village names - only people group names.
    // Setting villageName to empty string to avoid polluting village status calculations.
    // Joshua Project peoples should be matched to villages via spatial queries instead.
    villageName: '',
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    status: dmmStatus,
    engagementStatus: dmmStatus,
    population: parseInt(jpRecord.Population) || 0,
    region: jpRecord.RegionName || '',
    country: jpRecord.Ctry || countryCode?.toUpperCase() || '',
    language: jpRecord.PrimaryLanguageName || '',
    religion: jpRecord.PrimaryReligion || '',
    source: 'Joshua Project',
    approved: true,
    jpData: {
      peopleId: jpRecord.PeopleID3,
      rog3: jpRecord.ROG3,
      jpScale: jpRecord.JPScale,
      percentEvangelical: parseFloat(jpRecord.PercentEvangelical) || 0,
      percentChristian: parseFloat(jpRecord.PercentChristianity) || 0
    }
  };
};

class JoshuaProjectService {
  /**
   * Get all people groups with pagination
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Items per page
   * @param {string} options.sortBy - Field to sort by
   * @param {string} options.sortOrder - Sort order ('asc' or 'desc')
   * @param {string} options.country - Filter by country
   * @param {string} options.status - Filter by status
   * @returns {Promise<Object>} Paginated results
   */
  async getAllPeopleGroups(options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc',
      country,
      status,
      source = 'Joshua Project'
    } = options;

    const query = { source };
    
    if (country) {
      query.country = country.toUpperCase();
    }
    
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const [data, total] = await Promise.all([
      PeopleGroup.find(query)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      PeopleGroup.countDocuments(query)
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get a single people group by ID
   * @param {string} id - MongoDB ObjectId or Joshua Project peopleId
   * @returns {Promise<Object|null>} People group document
   */
  async getPeopleGroupById(id) {
    // Try to find by MongoDB _id first
    let peopleGroup = await PeopleGroup.findById(id).lean();
    
    // If not found, try by Joshua Project peopleId
    if (!peopleGroup) {
      peopleGroup = await PeopleGroup.findOne({
        'jpData.peopleId': id,
        source: 'Joshua Project'
      }).lean();
    }
    
    return peopleGroup;
  }

  /**
   * Get unreached people groups (status = 'unreached' or NON_ATTEINT)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated unreached groups
   */
  async getUnreachedGroups(options = {}) {
    const {
      page = 1,
      limit = 50,
      country
    } = options;

    const query = {
      source: 'Joshua Project',
      status: 'unreached'
    };
    
    if (country) {
      query.country = country.toUpperCase();
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      PeopleGroup.find(query)
        .sort({ population: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PeopleGroup.countDocuments(query)
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get people groups optimized for map display
   * Returns minimal data needed for map markers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of map-optimized people groups
   */
  async getMapPeopleGroups(options = {}) {
    const { country, status, limit = 5000 } = options;

    const query = { source: 'Joshua Project' };
    
    if (country) {
      query.country = country.toUpperCase();
    }
    
    if (status) {
      query.status = status;
    }

    const data = await PeopleGroup.find(query)
      .select('name location status population language country jpData.peopleId')
      .limit(limit)
      .lean();

    // Transform for map display
    return data.map(group => ({
      id: group._id,
      peopleId: group.jpData?.peopleId,
      name: group.name,
      latitude: group.location?.coordinates?.[1],
      longitude: group.location?.coordinates?.[0],
      status: group.status,
      population: group.population,
      language: group.language,
      country: group.country
    }));
  }

  /**
   * Get people groups within a bounding box
   * @param {Object} bbox - Bounding box coordinates
   * @param {number} bbox.minLng - Minimum longitude
   * @param {number} bbox.minLat - Minimum latitude
   * @param {number} bbox.maxLng - Maximum longitude
   * @param {number} bbox.maxLat - Maximum latitude
   * @returns {Promise<Array>} People groups within bounds
   */
  async getByBoundingBox(bbox) {
    const { minLng, minLat, maxLng, maxLat } = bbox;

    const data = await PeopleGroup.find({
      source: 'Joshua Project',
      location: {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat]
          ]
        }
      }
    })
    .select('name location status population language country jpData.peopleId')
    .lean();

    return data.map(group => ({
      id: group._id,
      peopleId: group.jpData?.peopleId,
      name: group.name,
      latitude: group.location?.coordinates?.[1],
      longitude: group.location?.coordinates?.[0],
      status: group.status,
      population: group.population,
      language: group.language,
      country: group.country
    }));
  }

  /**
   * Get people groups within a radius of a point
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radius - Radius in kilometers
   * @returns {Promise<Array>} People groups within radius
   */
  async getByRadius(lat, lng, radius) {
    const radiusInMeters = radius * 1000;

    const data = await PeopleGroup.find({
      source: 'Joshua Project',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusInMeters
        }
      }
    })
    .select('name location status population language country jpData.peopleId')
    .lean();

    return data.map(group => ({
      id: group._id,
      peopleId: group.jpData?.peopleId,
      name: group.name,
      latitude: group.location?.coordinates?.[1],
      longitude: group.location?.coordinates?.[0],
      status: group.status,
      population: group.population,
      language: group.language,
      country: group.country,
      distance: this._calculateDistance(lat, lng, 
        group.location?.coordinates?.[1], 
        group.location?.coordinates?.[0])
    }));
  }

  /**
   * Sync data for a specific country from Joshua Project API
   * @param {string} countryCode - 2-letter ISO country code
   * @param {string} adminUserId - Admin user ID for createdBy field
   * @returns {Promise<Object>} Sync statistics
   */
  async syncCountryData(countryCode, adminUserId) {
    if (!countryCode || countryCode.length !== 2) {
      throw new Error('Invalid country code. Please provide a 2-letter ISO country code.');
    }

    const upperCountryCode = countryCode.toUpperCase();
    let allRecords = [];
    let page = 1;
    let hasMoreData = true;

    // Fetch all pages of data from Joshua Project API
    while (hasMoreData) {
      const response = await axios.get(JP_API_BASE, {
        params: {
          api_key: JP_API_KEY,
          ROG3: upperCountryCode,
          limit: RESULTS_PER_PAGE,
          page: page
        }
      });

      const data = response.data;
      
      if (Array.isArray(data) && data.length > 0) {
        allRecords = allRecords.concat(data);
        
        if (data.length < RESULTS_PER_PAGE) {
          hasMoreData = false;
        } else {
          page++;
        }
      } else {
        hasMoreData = false;
      }
    }

    if (allRecords.length === 0) {
      return {
        success: false,
        message: `No people groups found for country code: ${upperCountryCode}`,
        statistics: { totalFetched: 0, stored: 0, skipped: 0 }
      };
    }

    // Transform and store records
    let stored = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const record of allRecords) {
      try {
        const transformedData = transformJPData(record, upperCountryCode);
        
        if (adminUserId) {
          transformedData.createdBy = adminUserId;
          transformedData.approvedBy = adminUserId;
          transformedData.approvedAt = new Date();
        }

        // Check if record already exists
        const existingRecord = await PeopleGroup.findOne({
          'jpData.peopleId': transformedData.jpData.peopleId,
          source: 'Joshua Project'
        });

        if (existingRecord) {
          await PeopleGroup.findByIdAndUpdate(existingRecord._id, transformedData);
          updated++;
        } else {
          const newPeopleGroup = new PeopleGroup(transformedData);
          await newPeopleGroup.save();
          stored++;
        }
      } catch (saveError) {
        skipped++;
        errors.push({
          name: record.PeopNameInCountry || 'Unknown',
          error: saveError.message
        });
      }
    }

    return {
      success: true,
      message: `Sync completed for ${upperCountryCode}`,
      statistics: {
        totalFetched: allRecords.length,
        stored,
        updated,
        skipped,
        pages: page
      },
      errors: errors.slice(0, 10)
    };
  }

  /**
   * Get sync status and statistics
   * @returns {Promise<Object>} Sync statistics
   */
  async getSyncStatus() {
    const [
      totalRecords,
      byCountry,
      byStatus,
      populationResult,
      lastSynced
    ] = await Promise.all([
      PeopleGroup.countDocuments({ source: 'Joshua Project' }),
      PeopleGroup.aggregate([
        { $match: { source: 'Joshua Project' } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      PeopleGroup.aggregate([
        { $match: { source: 'Joshua Project' } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      PeopleGroup.aggregate([
        { $match: { source: 'Joshua Project' } },
        { $group: { _id: null, totalPopulation: { $sum: '$population' } } }
      ]),
      PeopleGroup.findOne({ source: 'Joshua Project' })
        .sort({ updatedAt: -1 })
        .select('updatedAt')
    ]);

    return {
      totalRecords,
      totalPopulation: populationResult[0]?.totalPopulation || 0,
      byCountry: byCountry.map(item => ({
        country: item._id,
        count: item.count
      })),
      byStatus: byStatus.map(item => ({
        status: item._id,
        count: item.count
      })),
      lastSynced: lastSynced?.updatedAt || null
    };
  }

  /**
   * Clear all Joshua Project data
   * @returns {Promise<Object>} Deletion result
   */
  async clearAllData() {
    const result = await PeopleGroup.deleteMany({ source: 'Joshua Project' });
    return {
      success: true,
      deletedCount: result.deletedCount
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @private
   */
  _calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = this._toRad(lat2 - lat1);
    const dLng = this._toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  }

  _toRad(deg) {
    return deg * (Math.PI / 180);
  }
}

module.exports = new JoshuaProjectService();
