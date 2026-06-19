/**
 * Country Filter Middleware
 * 
 * Middleware and helper functions for filtering data by country
 * 
 * @author Church Planting Map Team
 * @version 1.0.0
 */

// Country code to database name mapping
const COUNTRY_CODE_MAP = {
  'CM': 'Cameroun',
  'CMR': 'Cameroun',
  'TD': 'Tchad',
  'TCD': 'Tchad',
  'CF': 'République centrafricaine',
  'CAF': 'République centrafricaine',
  'CG': 'Congo',
  'COG': 'Congo',
  'CD': 'RD Congo',
  'COD': 'RD Congo',
  'GA': 'Gabon',
  'GAB': 'Gabon',
  'GQ': 'Guinée équatoriale',
  'GNQ': 'Guinée équatoriale',
  'ST': 'Sao Tomé-et-Príncipe',
  'STP': 'Sao Tomé-et-Príncipe',
};

/**
 * Convert country code to database name
 * @param {string} code - ISO country code
 * @returns {string|null} Country name for database queries
 */
const countryCodeToDbName = (code) => {
  if (!code) return null;
  return COUNTRY_CODE_MAP[code.toUpperCase()] || null;
};

/**
 * Get country filter for MongoDB queries
 * @param {string} countryCode - ISO country code from request
 * @param {string} fieldName - Field name to filter on (default: 'country')
 * @returns {Object} MongoDB query filter object
 */
const getCountryFilter = (countryCode, fieldName = 'country') => {
  if (!countryCode) return {};
  
  const countryName = countryCodeToDbName(countryCode);
  if (!countryName) return {};
  
  return { [fieldName]: countryName };
};

/**
 * Middleware to add country filter to request
 * Extracts country from query params and adds filter to req object
 */
const countryFilterMiddleware = (options = {}) => {
  const { fieldName = 'country', required = false } = options;
  
  return (req, res, next) => {
    const countryCode = req.query.country;
    
    // If country is required but not provided
    if (required && !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Country parameter is required',
        message: 'Please provide a country code (e.g., ?country=CM)',
      });
    }
    
    // Add country filter to request
    req.countryFilter = getCountryFilter(countryCode, fieldName);
    req.countryCode = countryCode?.toUpperCase() || null;
    req.countryName = countryCode ? countryCodeToDbName(countryCode) : null;
    
    next();
  };
};

/**
 * Build MongoDB aggregation pipeline with country filter
 * @param {string} countryCode - ISO country code
 * @param {Array} pipeline - Existing aggregation pipeline
 * @param {string} fieldName - Field name to filter on
 * @returns {Array} Updated pipeline with country filter
 */
const buildCountryPipeline = (countryCode, pipeline = [], fieldName = 'country') => {
  const filter = getCountryFilter(countryCode, fieldName);
  
  if (Object.keys(filter).length === 0) {
    return pipeline;
  }
  
  // Add $match stage at the beginning
  return [{ $match: filter }, ...pipeline];
};

/**
 * Validate country code
 * @param {string} code - Country code to validate
 * @returns {boolean} True if valid
 */
const isValidCountryCode = (code) => {
  if (!code) return false;
  return !!COUNTRY_CODE_MAP[code.toUpperCase()];
};

/**
 * Get all supported country codes
 * @returns {Array} Array of supported country codes
 */
const getSupportedCountryCodes = () => {
  // Return unique alpha-2 codes only
  return ['CM', 'TD', 'CF', 'CG', 'CD', 'GA', 'GQ', 'ST'];
};

module.exports = {
  countryCodeToDbName,
  getCountryFilter,
  countryFilterMiddleware,
  buildCountryPipeline,
  isValidCountryCode,
  getSupportedCountryCodes,
  COUNTRY_CODE_MAP,
};
