/**
 * Import Routes - CSV Import for People Groups
 * Enhanced with robust error handling, encoding support, and data sanitization
 */
const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const PeopleGroup = require('../models/PeopleGroup');
const Village = require('../models/Village');
const { auth } = require('../middleware/auth');
const { isMissionary } = require('../middleware/roles');

const router = express.Router();

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Configure multer for file upload with enhanced validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files with various MIME types
    const allowedMimes = [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'text/x-csv',
      'application/x-csv',
    ];
    const isCSV = allowedMimes.includes(file.mimetype) || 
                  file.originalname.toLowerCase().endsWith('.csv');
    
    if (isCSV) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed. Please upload a .csv file.'), false);
    }
  },
});

/**
 * Remove BOM (Byte Order Mark) from string
 * Handles UTF-8 BOM, UTF-16 LE/BE BOMs
 */
const removeBOM = (str) => {
  if (!str) return str;
  // UTF-8 BOM
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  // UTF-8 BOM as bytes
  if (str.startsWith('\ufeff')) {
    return str.slice(1);
  }
  // Handle EF BB BF (UTF-8 BOM bytes)
  if (str.charCodeAt(0) === 0xEF && str.charCodeAt(1) === 0xBB && str.charCodeAt(2) === 0xBF) {
    return str.slice(3);
  }
  return str;
};

/**
 * Sanitize and clean string values
 */
const sanitizeString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .replace(/^["']+|["']+$/g, '') // Remove surrounding quotes
    .replace(/\s+/g, ' '); // Normalize whitespace
};

/**
 * Parse numeric value safely
 */
const parseNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse integer value safely
 */
const parseInt = (value, defaultValue = 0) => {
  const num = parseNumber(value, defaultValue);
  return Math.floor(num);
};

/**
 * Detect file encoding and convert to UTF-8
 */
const normalizeEncoding = (buffer) => {
  let content = buffer.toString('utf8');
  
  // Remove BOM if present
  content = removeBOM(content);
  
  // Try to detect and handle common encoding issues
  // Replace common problematic characters
  content = content
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n');
  
  return content;
};

/**
 * Calculate engagement status based on number of churches
 */
const calculateEngagementStatus = (numberOfChurches) => {
  const churches = parseInt(numberOfChurches, 0);
  if (churches === 0) return 'unreached';
  if (churches <= 33) return 'pioneer';
  if (churches <= 66) return 'midway';
  if (churches <= 99) return 'tipping-point';
  return 'dmm';
};

/**
 * Validate coordinates
 */
const validateCoordinates = (lat, lng) => {
  const errors = [];
  
  if (isNaN(lat)) {
    errors.push('Latitude must be a valid number');
  } else if (lat < -90 || lat > 90) {
    errors.push('Latitude must be between -90 and 90');
  }
  
  if (isNaN(lng)) {
    errors.push('Longitude must be a valid number');
  } else if (lng < -180 || lng > 180) {
    errors.push('Longitude must be between -180 and 180');
  }
  
  return errors;
};

/**
 * GET /import/people-groups/template - Download CSV template
 * NOTE: No authentication required - templates are public resources
 */
router.get('/people-groups/template', (req, res) => {
  const headers = [
    'name',
    'latitude',
    'longitude',
    'villageName',
    'population',
    'numberOfChurches',
    'churchGeneration',
    'engagementStatus',
    'region',
    'country',
    'language',
    'religion',
    'description'
  ];

  const exampleRows = [
    [
      'Massa',
      '10.3417',
      '15.2372',
      'Yagoua',
      '15000',
      '120',
      '8',
      'dmm',
      'Far North',
      'Cameroon',
      'Massa',
      'Christianity',
      'Established DMM with strong multiplication'
    ],
    [
      'Fulani',
      '9.3011',
      '13.3964',
      'Garoua',
      '25000',
      '0',
      '0',
      'unreached',
      'North',
      'Cameroon',
      'Fulfulde',
      'Islam',
      'Nomadic group - no engagement yet'
    ]
  ];

  const csvContent = headers.join(',') + '\n' + exampleRows.map(row => row.join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="people-groups-template.csv"');
  res.send('\ufeff' + csvContent); // BOM for Excel UTF-8 compatibility
});

/**
 * Multer error handler middleware
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB. Please upload a smaller file.`,
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: err.message,
      code: err.code
    });
  }
  if (err) {
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }
  next();
};

/**
 * POST /import/people-groups - Import people groups from CSV
 * Enhanced with robust error handling and data sanitization
 */
router.post('/people-groups', auth, isMissionary, upload.single('file'), handleMulterError, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please select a CSV file to upload.',
      code: 'NO_FILE'
    });
  }

  const results = [];
  const errors = [];
  let rowNumber = 0;

  try {
    // Normalize encoding and remove BOM
    const fileContent = normalizeEncoding(req.file.buffer);
    
    // Check if file is empty
    if (!fileContent.trim()) {
      return res.status(400).json({
        error: 'Empty file',
        message: 'The uploaded file is empty. Please upload a CSV file with data.',
        code: 'EMPTY_FILE'
      });
    }
    
    // Detect delimiter (comma or semicolon)
    const firstLine = fileContent.split('\n')[0] || '';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    
    console.log(`📊 CSV Import: Detected delimiter "${delimiter === ';' ? 'semicolon' : 'comma'}", file size: ${req.file.size} bytes`);
    
    // Skip comment lines (lines starting with #)
    const lines = fileContent.split('\n').filter(line => !line.trim().startsWith('#'));
    const cleanedContent = lines.join('\n');
    
    const stream = Readable.from(cleanedContent);
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({ 
          separator: delimiter,
          skipLines: 0,
          strict: false, // Don't fail on inconsistent column counts
          relaxColumnCount: true
        }))
        .on('data', (row) => {
          rowNumber++;
          // Normalize column names (handle different naming conventions)
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            // Remove BOM and trim whitespace
            const cleanKey = removeBOM(key).trim();
            let normalizedKey = cleanKey.toLowerCase()
              .replace(/\s+/g, '')
              .replace('peoplegroupname', 'name')
              .replace('peoplename', 'name')
              .replace('groupname', 'name')
              .replace('villagename', 'villageName')
              .replace('village_name', 'villageName')
              .replace('numberofchurches', 'numberOfChurches')
              .replace('number_of_churches', 'numberOfChurches')
              .replace('churches', 'numberOfChurches')
              .replace('churchgeneration', 'churchGeneration')
              .replace('church_generation', 'churchGeneration')
              .replace('generation', 'churchGeneration')
              .replace('engagementstatus', 'engagementStatus')
              .replace('engagement_status', 'engagementStatus')
              .replace('engagementlevel', 'engagementLevel')
              .replace('engagement_level', 'engagementLevel')
              .replace('lat', 'latitude')
              .replace('lng', 'longitude')
              .replace('lon', 'longitude');
            normalizedRow[normalizedKey] = sanitizeString(row[key]);
          });
          results.push({ rowNumber, data: { ...row, ...normalizedRow } });
        })
        .on('end', resolve)
        .on('error', (err) => {
          console.error('CSV parsing error:', err);
          reject(new Error(`CSV parsing failed: ${err.message}`));
        });
    });

    if (results.length === 0) {
      return res.status(400).json({
        error: 'No data found',
        message: 'The CSV file contains no data rows. Make sure your file has a header row and at least one data row.',
        code: 'NO_DATA'
      });
    }

    const imported = [];
    const skipped = [];

    for (const { rowNumber, data } of results) {
      try {
        // Skip empty rows
        const hasData = Object.values(data).some(v => v && v.trim());
        if (!hasData) {
          continue; // Skip silently
        }
        
        // Validate required fields
        const name = sanitizeString(data.name);
        if (!name) {
          errors.push({ 
            row: rowNumber, 
            field: 'name',
            error: 'Name is required',
            suggestion: 'Please provide a name for the people group'
          });
          skipped.push({ row: rowNumber, reason: 'Name is required', field: 'name' });
          continue;
        }

        // Validate coordinates
        const latitude = parseNumber(data.latitude, NaN);
        const longitude = parseNumber(data.longitude, NaN);
        
        const coordErrors = validateCoordinates(latitude, longitude);
        if (coordErrors.length > 0) {
          errors.push({ 
            row: rowNumber, 
            field: 'coordinates',
            error: coordErrors.join('; '),
            value: `lat: ${data.latitude}, lng: ${data.longitude}`,
            suggestion: 'Coordinates should be decimal numbers (e.g., latitude: 5.9631, longitude: 10.1591)'
          });
          skipped.push({ row: rowNumber, reason: coordErrors.join('; '), field: 'coordinates' });
          continue;
        }

        // Parse numeric fields with defaults
        const numberOfChurches = parseInt(data.numberOfChurches, 0);
        const churchGeneration = parseInt(data.churchGeneration, 0);
        const population = parseInt(data.population, 0);

        // Determine engagement status - auto-calculate if not provided or invalid
        const validEngagementStatuses = ['pioneer', 'midway', 'tipping-point', 'dmm', 'unreached'];
        let engagementStatus = sanitizeString(data.engagementStatus).toLowerCase();
        
        if (!engagementStatus || !validEngagementStatuses.includes(engagementStatus)) {
          // Auto-calculate based on number of churches
          engagementStatus = calculateEngagementStatus(numberOfChurches);
          console.log(`📊 Row ${rowNumber}: Auto-calculated engagement status as "${engagementStatus}" (${numberOfChurches} churches)`);
        }

        // Validate status field - default to engagement status
        const validStatuses = ['pioneer', 'mid-journey', 'tipping-point', 'movement', 'unreached', 'midway', 'dmm'];
        let status = sanitizeString(data.status).toLowerCase() || engagementStatus;
        if (!validStatuses.includes(status)) {
          status = engagementStatus;
        }

        // Look up village if villageId or villageName provided
        let villageRef = null;
        const villageName = sanitizeString(data.villageName);
        const villageId = sanitizeString(data.villageId);
        
        if (villageId) {
          try {
            const village = await Village.findById(villageId);
            if (village) {
              villageRef = village._id;
            }
          } catch (e) {
            // Invalid ObjectId format - ignore
          }
        } else if (villageName) {
          const village = await Village.findOne({ 
            name: { $regex: new RegExp(`^${villageName}$`, 'i') } 
          });
          if (village) {
            villageRef = village._id;
          }
        }

        // Determine source based on user and CSV data
        // If user is chrishaiwe@gmail.com, default to 'DMM' unless CSV explicitly sets 'Survey'
        const csvSource = sanitizeString(data.source);
        let source = 'Survey'; // Default for most users
        if (req.user.email === 'chrishaiwe@gmail.com') {
          source = csvSource === 'Survey' ? 'Survey' : 'DMM';
        } else if (csvSource && ['DMM', 'Survey', 'Joshua Project'].includes(csvSource)) {
          source = csvSource;
        }

        // Create people group with sanitized data
        const peopleGroup = new PeopleGroup({
          name: name,
          description: sanitizeString(data.description),
          status: status,
          engagementStatus: engagementStatus,
          engagementLevel: sanitizeString(data.engagementLevel),
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          population: population,
          numberOfChurches: numberOfChurches,
          churchGeneration: churchGeneration,
          villageName: villageName,
          village: villageRef,
          region: sanitizeString(data.region),
          country: sanitizeString(data.country),
          language: sanitizeString(data.language),
          religion: sanitizeString(data.religion),
          source: source,
          createdBy: req.user._id,
          approved: ['admin', 'supervisor'].includes(req.user.role),
          approvedBy: ['admin', 'supervisor'].includes(req.user.role) ? req.user._id : undefined,
          approvedAt: ['admin', 'supervisor'].includes(req.user.role) ? new Date() : undefined,
        });

        await peopleGroup.save();
        imported.push({
          row: rowNumber,
          id: peopleGroup._id,
          name: peopleGroup.name,
          engagementStatus: peopleGroup.engagementStatus
        });

      } catch (err) {
        // Handle Mongoose validation errors with detailed field-level information
        if (err.name === 'ValidationError') {
          const fieldErrors = Object.keys(err.errors).map(field => {
            const fieldError = err.errors[field];
            return {
              row: rowNumber,
              field: field,
              message: fieldError.message,
              value: fieldError.value !== undefined ? fieldError.value : data[field],
              kind: fieldError.kind || 'validation'
            };
          });
          
          fieldErrors.forEach(fieldErr => {
            errors.push({
              row: fieldErr.row,
              field: fieldErr.field,
              error: fieldErr.message,
              value: fieldErr.value,
              errorType: 'validation',
              kind: fieldErr.kind,
              suggestion: `Check the ${fieldErr.field} field value`
            });
          });
          
          skipped.push({
            row: rowNumber,
            reason: `Validation failed: ${fieldErrors.map(e => `${e.field} - ${e.message}`).join('; ')}`,
            fields: fieldErrors.map(e => e.field)
          });
        } else if (err.name === 'CastError') {
          // Handle type casting errors
          errors.push({
            row: rowNumber,
            field: err.path,
            error: `Invalid value for ${err.path}`,
            value: err.value,
            errorType: 'cast',
            suggestion: `Expected ${err.kind} type for ${err.path}`
          });
          skipped.push({
            row: rowNumber,
            reason: `Invalid value for ${err.path}: expected ${err.kind}`,
            fields: [err.path]
          });
        } else if (err.code === 11000) {
          // Handle duplicate key errors
          const duplicateField = Object.keys(err.keyPattern || {})[0] || 'unknown';
          const duplicateValue = err.keyValue ? err.keyValue[duplicateField] : 'unknown';
          errors.push({
            row: rowNumber,
            field: duplicateField,
            error: `"${duplicateValue}" already exists`,
            value: duplicateValue,
            errorType: 'duplicate',
            suggestion: 'Use a unique value or update the existing record'
          });
          skipped.push({
            row: rowNumber,
            reason: `Duplicate: "${duplicateValue}" already exists`,
            fields: [duplicateField]
          });
        } else {
          // Handle other errors
          console.error(`Row ${rowNumber} error:`, err);
          errors.push({
            row: rowNumber,
            field: null,
            error: err.message,
            value: null,
            errorType: 'unknown'
          });
          skipped.push({ row: rowNumber, reason: err.message });
        }
      }
    }

    // Build response message
    let message = `Import completed: ${imported.length} imported`;
    if (skipped.length > 0) {
      message += `, ${skipped.length} skipped`;
    }

    res.json({
      success: imported.length > 0,
      message,
      summary: {
        total: results.length,
        imported: imported.length,
        skipped: skipped.length,
        errors: errors.length
      },
      imported,
      skipped,
      errors
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({
      error: 'Import failed',
      message: error.message || 'An unexpected error occurred during import',
      code: 'IMPORT_ERROR',
      suggestion: 'Please check your CSV file format and try again'
    });
  }
});

/**
 * POST /import/people-groups/validate - Validate CSV without importing
 * Enhanced with better error messages and suggestions
 */
router.post('/people-groups/validate', auth, isMissionary, upload.single('file'), handleMulterError, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please select a CSV file to validate.',
      code: 'NO_FILE'
    });
  }

  const results = [];
  let rowNumber = 0;

  try {
    // Normalize encoding and remove BOM
    const fileContent = normalizeEncoding(req.file.buffer);
    
    // Check if file is empty
    if (!fileContent.trim()) {
      return res.status(400).json({
        error: 'Empty file',
        message: 'The uploaded file is empty.',
        code: 'EMPTY_FILE'
      });
    }
    
    // Detect delimiter
    const firstLine = fileContent.split('\n')[0] || '';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    
    // Skip comment lines
    const lines = fileContent.split('\n').filter(line => !line.trim().startsWith('#'));
    const cleanedContent = lines.join('\n');
    
    const stream = Readable.from(cleanedContent);
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({ 
          separator: delimiter,
          strict: false,
          relaxColumnCount: true
        }))
        .on('data', (row) => {
          rowNumber++;
          // Normalize column names
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            const cleanKey = removeBOM(key).trim();
            let normalizedKey = cleanKey.toLowerCase()
              .replace(/\s+/g, '')
              .replace('peoplegroupname', 'name')
              .replace('peoplename', 'name')
              .replace('groupname', 'name')
              .replace('villagename', 'villageName')
              .replace('village_name', 'villageName')
              .replace('numberofchurches', 'numberOfChurches')
              .replace('number_of_churches', 'numberOfChurches')
              .replace('churches', 'numberOfChurches')
              .replace('churchgeneration', 'churchGeneration')
              .replace('church_generation', 'churchGeneration')
              .replace('generation', 'churchGeneration')
              .replace('engagementstatus', 'engagementStatus')
              .replace('engagement_status', 'engagementStatus')
              .replace('engagementlevel', 'engagementLevel')
              .replace('lat', 'latitude')
              .replace('lng', 'longitude')
              .replace('lon', 'longitude');
            normalizedRow[normalizedKey] = sanitizeString(row[key]);
          });
          results.push({ rowNumber, data: { ...row, ...normalizedRow } });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({
        error: 'No data found',
        message: 'The CSV file contains no data rows.',
        code: 'NO_DATA'
      });
    }

    const validRows = [];
    const invalidRows = [];
    const warnings = [];

    for (const { rowNumber, data } of results) {
      const rowErrors = [];
      const rowWarnings = [];
      
      // Skip empty rows
      const hasData = Object.values(data).some(v => v && v.trim());
      if (!hasData) {
        continue;
      }

      // Validate name
      const name = sanitizeString(data.name);
      if (!name) {
        rowErrors.push({
          field: 'name',
          message: 'Name is required',
          suggestion: 'Add a name for the people group'
        });
      }

      // Validate coordinates
      const latitude = parseNumber(data.latitude, NaN);
      const longitude = parseNumber(data.longitude, NaN);
      
      const coordErrors = validateCoordinates(latitude, longitude);
      if (coordErrors.length > 0) {
        rowErrors.push({
          field: 'coordinates',
          message: coordErrors.join('; '),
          value: `lat: ${data.latitude}, lng: ${data.longitude}`,
          suggestion: 'Use decimal format (e.g., 5.9631, 10.1591)'
        });
      }

      // Check engagement status - add warning if will be auto-calculated
      const validEngagementStatuses = ['pioneer', 'midway', 'tipping-point', 'dmm', 'unreached'];
      const engagementStatus = sanitizeString(data.engagementStatus).toLowerCase();
      const numberOfChurches = parseInt(data.numberOfChurches, 0);
      
      if (!engagementStatus || !validEngagementStatuses.includes(engagementStatus)) {
        const calculatedStatus = calculateEngagementStatus(numberOfChurches);
        rowWarnings.push({
          field: 'engagementStatus',
          message: `Status will be auto-calculated as "${calculatedStatus}" based on ${numberOfChurches} churches`,
          type: 'info'
        });
      }

      if (rowErrors.length > 0) {
        invalidRows.push({ 
          row: rowNumber, 
          data, 
          errors: rowErrors.map(e => typeof e === 'string' ? e : e.message),
          details: rowErrors
        });
      } else {
        validRows.push({ 
          row: rowNumber, 
          data,
          warnings: rowWarnings
        });
      }
      
      if (rowWarnings.length > 0) {
        warnings.push({ row: rowNumber, warnings: rowWarnings });
      }
    }

    res.json({
      success: true,
      message: `Validation completed: ${validRows.length} valid, ${invalidRows.length} invalid`,
      summary: {
        total: results.length,
        valid: validRows.length,
        invalid: invalidRows.length,
        warnings: warnings.length
      },
      validRows,
      invalidRows,
      warnings
    });

  } catch (error) {
    console.error('Error validating CSV:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message || 'An error occurred during validation',
      code: 'VALIDATION_ERROR'
    });
  }
});

/**
 * Country-specific CSV templates configuration
 * Each country has specific administrative divisions and example data
 */
const COUNTRY_TEMPLATES = {
  cameroun: {
    name: 'Cameroun',
    code: 'CM',
    adminLevels: {
      admin1: 'Région',
      admin2: 'Département',
      admin3: 'Arrondissement'
    },
    examples: [
      {
        name: 'Massa',
        villageName: '',
        latitude: '10.3417',
        longitude: '15.2372',
        population: '15000',
        numberOfChurches: '120',
        churchGeneration: '8',
        region: 'Extrême-Nord',
        department: 'Mayo-Danay',
        arrondissement: 'Yagoua',
        description: 'Mouvement DMM établi'
      },
      {
        name: 'Fulani',
        villageName: '',
        latitude: '9.3011',
        longitude: '13.3964',
        population: '25000',
        numberOfChurches: '0',
        churchGeneration: '0',
        region: 'Nord',
        department: 'Bénoué',
        arrondissement: 'Garoua 1er',
        description: 'Non atteint - nomade'
      }
    ]
  },
  'congo-brazzaville': {
    name: 'Congo Brazzaville',
    code: 'CG',
    adminLevels: {
      admin1: 'Département',
      admin2: 'District',
      admin3: 'Commune'
    },
    examples: [
      {
        name: 'Téké',
        villageName: '',
        latitude: '-4.2634',
        longitude: '15.2429',
        population: '8000',
        numberOfChurches: '45',
        churchGeneration: '4',
        region: 'Brazzaville',
        department: 'Brazzaville',
        arrondissement: 'Makélékélé',
        description: 'Engagement actif'
      }
    ]
  },
  'congo-rdc': {
    name: 'Congo RDC',
    code: 'CD',
    adminLevels: {
      admin1: 'Province',
      admin2: 'Territoire',
      admin3: 'Secteur/Chefferie'
    },
    examples: [
      {
        name: 'Luba',
        villageName: '',
        latitude: '-5.0380',
        longitude: '18.7828',
        population: '50000',
        numberOfChurches: '200',
        churchGeneration: '10',
        region: 'Kasaï-Central',
        department: 'Demba',
        arrondissement: 'Demba',
        description: 'Mouvement DMM fort'
      }
    ]
  },
  'centrafrique': {
    name: 'République Centrafricaine',
    code: 'CF',
    adminLevels: {
      admin1: 'Préfecture',
      admin2: 'Sous-préfecture',
      admin3: 'Commune'
    },
    examples: [
      {
        name: 'Gbaya',
        villageName: '',
        latitude: '4.3612',
        longitude: '18.5550',
        population: '30000',
        numberOfChurches: '75',
        churchGeneration: '5',
        region: 'Bangui',
        department: 'Bangui',
        arrondissement: 'Bangui 1er',
        description: 'Engagement en cours'
      }
    ]
  },
  tchad: {
    name: 'Tchad',
    code: 'TD',
    adminLevels: {
      admin1: 'Région',
      admin2: 'Département',
      admin3: 'Sous-préfecture'
    },
    examples: [
      {
        name: 'Sara',
        villageName: '',
        latitude: '8.5500',
        longitude: '16.0333',
        population: '40000',
        numberOfChurches: '150',
        churchGeneration: '7',
        region: 'Logone Oriental',
        department: 'Pendé',
        arrondissement: 'Doba',
        description: 'Mouvement DMM établi'
      },
      {
        name: 'Arabe Tchadien',
        villageName: '',
        latitude: '12.1348',
        longitude: '15.0557',
        population: '100000',
        numberOfChurches: '5',
        churchGeneration: '1',
        region: 'N\'Djamena',
        department: 'N\'Djamena',
        arrondissement: 'N\'Djamena 1er',
        description: 'Pioneer - début d\'engagement'
      }
    ]
  },
  gabon: {
    name: 'Gabon',
    code: 'GA',
    adminLevels: {
      admin1: 'Province',
      admin2: 'Département',
      admin3: 'District'
    },
    examples: [
      {
        name: 'Fang',
        villageName: '',
        latitude: '0.3924',
        longitude: '9.4536',
        population: '20000',
        numberOfChurches: '60',
        churchGeneration: '4',
        region: 'Estuaire',
        department: 'Libreville',
        arrondissement: 'Libreville 1er',
        description: 'Engagement actif'
      }
    ]
  },
  'guinee-equatoriale': {
    name: 'Guinée Équatoriale',
    code: 'GQ',
    adminLevels: {
      admin1: 'Province',
      admin2: 'District',
      admin3: 'Municipalité'
    },
    examples: [
      {
        name: 'Fang',
        villageName: '',
        latitude: '3.7500',
        longitude: '8.7833',
        population: '15000',
        numberOfChurches: '35',
        churchGeneration: '3',
        region: 'Litoral',
        department: 'Bata',
        arrondissement: 'Bata',
        description: 'Engagement en cours'
      }
    ]
  }
};

/**
 * GET /import/people-groups/template/:country - Download country-specific CSV template
 * @param country - Country code (cameroun, congo-brazzaville, congo-rdc, centrafrique, tchad, gabon, guinee-equatoriale)
 * NOTE: No authentication required - templates are public resources
 */
router.get('/people-groups/template/:country', (req, res) => {
  const countryKey = req.params.country.toLowerCase();
  const countryConfig = COUNTRY_TEMPLATES[countryKey];

  if (!countryConfig) {
    return res.status(400).json({
      error: 'Invalid country',
      message: `Country "${req.params.country}" not found. Available countries: ${Object.keys(COUNTRY_TEMPLATES).join(', ')}`,
      availableCountries: Object.keys(COUNTRY_TEMPLATES).map(key => ({
        key,
        name: COUNTRY_TEMPLATES[key].name,
        code: COUNTRY_TEMPLATES[key].code
      }))
    });
  }

  // Build headers with country-specific admin level names
  const headers = [
    'name',
    'villageName',
    'latitude',
    'longitude',
    'population',
    'numberOfChurches',
    'churchGeneration',
    `region (${countryConfig.adminLevels.admin1})`,
    `department (${countryConfig.adminLevels.admin2})`,
    `arrondissement (${countryConfig.adminLevels.admin3})`,
    'description'
  ];

  // Build example rows
  const exampleRows = countryConfig.examples.map(example => [
    example.name,
    example.villageName || '',
    example.latitude,
    example.longitude,
    example.population,
    example.numberOfChurches,
    example.churchGeneration,
    example.region,
    example.department,
    example.arrondissement,
    example.description
  ]);

  const csvContent = headers.join(';') + '\n' + exampleRows.map(row => row.join(';')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="template-${countryKey}-${countryConfig.code}.csv"`);
  res.send('\ufeff' + csvContent); // BOM for Excel UTF-8 compatibility
});

/**
 * GET /import/people-groups/templates - List all available country templates
 * NOTE: No authentication required - templates are public resources
 */
router.get('/people-groups/templates', (req, res) => {
  const templates = Object.keys(COUNTRY_TEMPLATES).map(key => ({
    key,
    name: COUNTRY_TEMPLATES[key].name,
    code: COUNTRY_TEMPLATES[key].code,
    adminLevels: COUNTRY_TEMPLATES[key].adminLevels,
    downloadUrl: `/api/import/people-groups/template/${key}`
  }));

  res.json({
    success: true,
    message: `${templates.length} country templates available`,
    templates
  });
});

/**
 * POST /import/people-groups/with-polygon-detection - Import with automatic village polygon detection
 * When villageName is empty, automatically detects the village polygon where lat/long falls
 */
router.post('/people-groups/with-polygon-detection', auth, isMissionary, upload.single('file'), handleMulterError, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please select a CSV file to upload.',
      code: 'NO_FILE'
    });
  }

  const results = [];
  const errors = [];
  let rowNumber = 0;

  try {
    // Normalize encoding and remove BOM
    const fileContent = normalizeEncoding(req.file.buffer);
    
    if (!fileContent.trim()) {
      return res.status(400).json({
        error: 'Empty file',
        message: 'The uploaded file is empty.',
        code: 'EMPTY_FILE'
      });
    }
    
    // Detect delimiter
    const firstLine = fileContent.split('\n')[0] || '';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    
    console.log(`📊 CSV Import with polygon detection: Detected delimiter "${delimiter === ';' ? 'semicolon' : 'comma'}"`);
    
    // Skip comment lines
    const lines = fileContent.split('\n').filter(line => !line.trim().startsWith('#'));
    const cleanedContent = lines.join('\n');
    
    const stream = Readable.from(cleanedContent);
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({ 
          separator: delimiter,
          strict: false,
          relaxColumnCount: true
        }))
        .on('data', (row) => {
          rowNumber++;
          // Normalize column names
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            const cleanKey = removeBOM(key).trim();
            let normalizedKey = cleanKey.toLowerCase()
              .replace(/\\s+/g, '')
              .replace('peoplegroupname', 'name')
              .replace('peoplename', 'name')
              .replace('groupname', 'name')
              .replace('villagename', 'villageName')
              .replace('village_name', 'villageName')
              .replace('numberofchurches', 'numberOfChurches')
              .replace('number_of_churches', 'numberOfChurches')
              .replace('churches', 'numberOfChurches')
              .replace('churchgeneration', 'churchGeneration')
              .replace('church_generation', 'churchGeneration')
              .replace('generation', 'churchGeneration')
              .replace('engagementstatus', 'engagementStatus')
              .replace('engagement_status', 'engagementStatus')
              .replace('lat', 'latitude')
              .replace('lng', 'longitude')
              .replace('lon', 'longitude')
              // Handle admin level columns
              .replace(/region.*admin.*1.*/i, 'region')
              .replace(/department.*admin.*2.*/i, 'department')
              .replace(/arrondissement.*admin.*3.*/i, 'arrondissement');
            normalizedRow[normalizedKey] = sanitizeString(row[key]);
          });
          results.push({ rowNumber, data: { ...row, ...normalizedRow } });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({
        error: 'No data found',
        message: 'The CSV file contains no data rows.',
        code: 'NO_DATA'
      });
    }

    const imported = [];
    const skipped = [];
    const polygonDetections = [];

    for (const { rowNumber, data } of results) {
      try {
        // Skip empty rows
        const hasData = Object.values(data).some(v => v && v.trim());
        if (!hasData) continue;
        
        // Validate required fields
        const name = sanitizeString(data.name);
        if (!name) {
          errors.push({ row: rowNumber, field: 'name', error: 'Name is required' });
          skipped.push({ row: rowNumber, reason: 'Name is required' });
          continue;
        }

        // Validate coordinates (MANDATORY)
        const latitude = parseNumber(data.latitude, NaN);
        const longitude = parseNumber(data.longitude, NaN);
        
        const coordErrors = validateCoordinates(latitude, longitude);
        if (coordErrors.length > 0) {
          errors.push({ row: rowNumber, field: 'coordinates', error: coordErrors.join('; ') });
          skipped.push({ row: rowNumber, reason: coordErrors.join('; ') });
          continue;
        }

        // Parse numeric fields
        const numberOfChurches = parseInt(data.numberOfChurches, 0);
        const churchGeneration = parseInt(data.churchGeneration, 0);
        const population = parseInt(data.population, 0);

        // Calculate engagement status
        const validEngagementStatuses = ['pioneer', 'midway', 'tipping-point', 'dmm', 'unreached'];
        let engagementStatus = sanitizeString(data.engagementStatus).toLowerCase();
        
        if (!engagementStatus || !validEngagementStatuses.includes(engagementStatus)) {
          engagementStatus = calculateEngagementStatus(numberOfChurches);
        }

        // Village name handling - OPTIONAL with polygon detection
        let villageName = sanitizeString(data.villageName);
        let villageRef = null;
        let detectedVillage = null;

        if (villageName) {
          // Try to find village by name
          const village = await Village.findOne({ 
            name: { $regex: new RegExp(`^${villageName}$`, 'i') } 
          });
          if (village) {
            villageRef = village._id;
          }
        } else {
          // AUTOMATIC POLYGON DETECTION
          // Find village polygon that contains the point
          try {
            const village = await Village.findOne({
              geometry: {
                $geoIntersects: {
                  $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                  }
                }
              }
            });

            if (village) {
              villageRef = village._id;
              villageName = village.name;
              detectedVillage = {
                id: village._id,
                name: village.name,
                admin1: village.admin1,
                admin2: village.admin2,
                admin3: village.admin3
              };
              polygonDetections.push({
                row: rowNumber,
                peopleName: name,
                detectedVillage: village.name,
                coordinates: [latitude, longitude]
              });
              console.log(`📍 Row ${rowNumber}: Auto-detected village "${village.name}" for people group "${name}"`);
            }
          } catch (geoError) {
            console.warn(`⚠️ Row ${rowNumber}: Geo query failed for coordinates [${latitude}, ${longitude}]:`, geoError.message);
          }
        }

        // Create people group
        // Determine source based on user and CSV data
        // If user is chrishaiwe@gmail.com, default to 'DMM' unless CSV explicitly sets 'Survey'
        const csvSource = sanitizeString(data.source);
        let source = 'Survey'; // Default for most users
        if (req.user.email === 'chrishaiwe@gmail.com') {
          source = csvSource === 'Survey' ? 'Survey' : 'DMM';
        } else if (csvSource && ['DMM', 'Survey', 'Joshua Project'].includes(csvSource)) {
          source = csvSource;
        }

        const peopleGroup = new PeopleGroup({
          name: name,
          description: sanitizeString(data.description),
          status: engagementStatus,
          engagementStatus: engagementStatus,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          population: population,
          numberOfChurches: numberOfChurches,
          churchGeneration: churchGeneration,
          villageName: villageName,
          village: villageRef,
          region: sanitizeString(data.region),
          country: sanitizeString(data.country),
          language: sanitizeString(data.language),
          religion: sanitizeString(data.religion),
          source: source,
          createdBy: req.user._id,
          approved: ['admin', 'supervisor'].includes(req.user.role),
          approvedBy: ['admin', 'supervisor'].includes(req.user.role) ? req.user._id : undefined,
          approvedAt: ['admin', 'supervisor'].includes(req.user.role) ? new Date() : undefined,
        });

        await peopleGroup.save();

        // If village was detected, update village status based on DMM calculation
        if (villageRef && detectedVillage) {
          try {
            // Recalculate village status based on all people groups in that village
            const allPeopleGroupsInVillage = await PeopleGroup.find({ village: villageRef });
            
            // Calculate the highest status among all people groups
            const statusPriority = { 'dmm': 5, 'tipping-point': 4, 'midway': 3, 'pioneer': 2, 'unreached': 1 };
            let highestStatus = 'unreached';
            let highestPriority = 0;
            
            for (const pg of allPeopleGroupsInVillage) {
              const priority = statusPriority[pg.engagementStatus] || 0;
              if (priority > highestPriority) {
                highestPriority = priority;
                highestStatus = pg.engagementStatus;
              }
            }

            // Update village status
            await Village.findByIdAndUpdate(villageRef, {
              dmmStatus: highestStatus,
              lastStatusUpdate: new Date()
            });

            console.log(`🎨 Updated village "${detectedVillage.name}" status to "${highestStatus}"`);
          } catch (updateError) {
            console.warn(`⚠️ Failed to update village status:`, updateError.message);
          }
        }

        imported.push({
          row: rowNumber,
          id: peopleGroup._id,
          name: peopleGroup.name,
          engagementStatus: peopleGroup.engagementStatus,
          villageName: villageName || 'Not detected',
          villageDetected: !!detectedVillage
        });

      } catch (err) {
        console.error(`Row ${rowNumber} error:`, err);
        errors.push({ row: rowNumber, error: err.message });
        skipped.push({ row: rowNumber, reason: err.message });
      }
    }

    res.json({
      success: imported.length > 0,
      message: `Import completed: ${imported.length} imported, ${skipped.length} skipped, ${polygonDetections.length} villages auto-detected`,
      summary: {
        total: results.length,
        imported: imported.length,
        skipped: skipped.length,
        errors: errors.length,
        polygonDetections: polygonDetections.length
      },
      imported,
      skipped,
      errors,
      polygonDetections
    });

  } catch (error) {
    console.error('Error importing CSV with polygon detection:', error);
    res.status(500).json({
      error: 'Import failed',
      message: error.message || 'An unexpected error occurred during import',
      code: 'IMPORT_ERROR'
    });
  }
});

module.exports = router;