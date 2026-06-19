/**
 * Peoples API Service
 * Handles all API calls for peoples/population management
 */
import api from './api'

/**
 * Peoples API endpoints
 */
export const peoplesApi = {
  /**
   * Get all peoples with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 50)
   * @param {string} params.status - Filter by status
   * @param {string} params.region - Filter by region
   * @param {string} params.villageName - Filter by village name
   * @param {string} params.polygonId - Filter by polygon ID
   * @param {boolean} params.approved - Filter by approval status
   * @param {string} params.sortBy - Sort field
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @param {string} params.search - Text search
   * @returns {Promise} Peoples list with pagination
   */
  getAll: (params = {}) => api.get('/api/people-groups', { params }),

  /**
   * Get a single people by ID
   * @param {string} id - People record ID
   * @returns {Promise} People record
   */
  getById: (id) => api.get(`/api/people-groups/${id}`),

  /**
   * Create a new people record
   * @param {Object} data - People data
   * @param {string} data.name - Name (required)
   * @param {string} data.villageName - Village name
   * @param {string} data.polygonId - Polygon ID
   * @param {number} data.population - Population count
   * @param {number} data.households - Households count
   * @param {Object} data.location - GeoJSON Point location
   * @param {Object} data.demographics - Demographics breakdown
   * @param {string} data.language - Primary language
   * @param {string} data.religion - Primary religion
   * @param {string} data.ethnicity - Ethnic group
   * @param {string} data.description - Description/notes
   * @param {string} data.region - Region
   * @param {string} data.departement - Departement
   * @param {string} data.arrondissement - Arrondissement
   * @param {string} data.country - Country
   * @param {string} data.status - Church planting status
   * @param {number} data.believersCount - Number of believers
   * @param {number} data.churchesCount - Number of churches
   * @param {string} data.dataSource - Data source
   * @param {number} data.dataYear - Year of data collection
   * @returns {Promise} Created people record
   */
  create: (data) => api.post('/api/people-groups', data),

  /**
   * Update a people record
   * @param {string} id - People record ID
   * @param {Object} data - Updated data (same fields as create)
   * @returns {Promise} Updated people record
   */
  update: (id, data) => api.put(`/api/people-groups/${id}`, data),

  /**
   * Delete a people record
   * @param {string} id - People record ID
   * @returns {Promise} Deletion confirmation
   */
  delete: (id) => api.delete(`/api/people-groups/${id}`),

  /**
   * Get peoples by polygon ID or village name
   * @param {string} polygonId - Polygon ID or village name
   * @returns {Promise} Peoples list with totals
   */
  getByPolygon: (polygonId) => api.get(`/api/people-groups/polygon/${encodeURIComponent(polygonId)}`),

  /**
   * Approve a people record
   * @param {string} id - People record ID
   * @returns {Promise} Approved people record
   */
  approve: (id) => api.post(`/api/people-groups/${id}/approve`),

  /**
   * Get population statistics
   * @param {Object} params - Query parameters
   * @param {string} params.region - Filter by region
   * @param {string} params.status - Filter by status
   * @returns {Promise} Statistics object
   */
  getStats: (params = {}) => api.get('/api/people-groups/stats', { params }),
}

export default peoplesApi
