/**
 * Village Model - Enhanced with GeoJSON Polygon support for boundary drawing
 * Supports both Point (center) and Polygon (boundary) geometries
 */
const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Village name is required'],
      trim: true,
      minlength: [2, 'Village name must be at least 2 characters'],
      maxlength: [200, 'Village name cannot exceed 200 characters'],
    },
    // Center point location (for markers and proximity queries)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Location coordinates are required'],
        validate: {
          validator: function (coords) {
            if (!Array.isArray(coords) || coords.length !== 2) return false;
            const [lng, lat] = coords;
            return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
          },
          message: 'Invalid coordinates. Must be [longitude, latitude] with valid ranges.',
        },
      },
    },
    // Polygon boundary for village area (for drawing/editing on map)
    // NOTE: This field is completely optional. Only include it when you have valid coordinates.
    // If boundary is provided, it MUST have both type and coordinates for the 2dsphere index to work.
    boundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        // NO DEFAULT - boundary.type should only exist if coordinates are provided
      },
      coordinates: {
        type: [[[Number]]], // Array of rings, each ring is array of [lng, lat] pairs
        validate: {
          validator: function (coords) {
            if (!coords || !Array.isArray(coords) || coords.length === 0) return true; // Optional
            // Validate polygon structure
            const ring = coords[0];
            if (!Array.isArray(ring) || ring.length < 4) return false;
            // First and last point must be the same (closed polygon)
            const first = ring[0];
            const last = ring[ring.length - 1];
            return first[0] === last[0] && first[1] === last[1];
          },
          message: 'Invalid polygon. Must be a closed ring with at least 4 points.',
        },
      },
    },
    // Village name (renamed from population concept)
    village: {
      type: String,
      trim: true,
      maxlength: [200, 'Village name cannot exceed 200 characters'],
    },
    population: {
      type: Number,
      min: [0, 'Population cannot be negative'],
      default: 0,
    },
    // Coverage status for analytics
    coverageStatus: {
      type: String,
      enum: {
        values: ['uncovered', 'partially-covered', 'fully-covered'],
        message: 'Coverage status must be uncovered, partially-covered, or fully-covered',
      },
      default: 'uncovered',
    },
    coveragePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['pioneer', 'midway', 'tipping-point', 'dmm', 'unreached', 'in-progress', 'church-planted', 'multiplying'],
        message: 'Status must be pioneer, midway, tipping-point, dmm, unreached, in-progress, church-planted, or multiplying',
      },
      default: 'pioneer',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    // Niveau (replaces Pays) - Administrative level
    niveau: {
      type: String,
      enum: {
        values: ['I', 'II', 'III', 'IV', ''],
        message: 'Niveau must be I, II, III, or IV',
      },
      default: '',
    },
    // Administrative location fields (from GeoJSON)
    region: {
      type: String,
      trim: true,
      maxlength: [100, 'Region name cannot exceed 100 characters'],
    },
    departement: {
      type: String,
      trim: true,
      maxlength: [100, 'Departement name cannot exceed 100 characters'],
    },
    arrondissement: {
      type: String,
      trim: true,
      maxlength: [100, 'Arrondissement name cannot exceed 100 characters'],
    },
    // Legacy country field (kept for backward compatibility)
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country name cannot exceed 100 characters'],
    },
    // Area in square kilometers (calculated from polygon)
    area: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Organization that manages this village
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    // Creator and approval
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    // Style for map rendering
    style: {
      fillColor: {
        type: String,
        default: '#3388ff',
      },
      fillOpacity: {
        type: Number,
        default: 0.2,
      },
      strokeColor: {
        type: String,
        default: '#3388ff',
      },
      strokeWidth: {
        type: Number,
        default: 2,
      },
    },
    // Data source tracking
    source: {
      type: String,
      enum: ['manual', 'osm', 'import', 'geojson'],
      default: 'manual',
    },
    // OSM-specific data (populated when source='osm')
    osmData: {
      osmId: {
        type: Number,
        index: true,
        sparse: true,
      },
      placeType: {
        type: String,
        enum: ['village', 'hamlet', 'town', 'city', 'locality', ''],
      },
      countryCode: {
        type: String,
        uppercase: true,
        maxlength: 2,
      },
      tags: {
        place: String,
        name: String,
        nameFr: String,
        nameEn: String,
        population: String,
        adminLevel: String,
      },
      importedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to clean up invalid boundary data
// This prevents the 2dsphere index error when boundary.type exists without coordinates
villageSchema.pre('save', function (next) {
  // If boundary exists but doesn't have valid coordinates, remove it entirely
  if (this.boundary) {
    const hasValidCoordinates = this.boundary.coordinates && 
      Array.isArray(this.boundary.coordinates) && 
      this.boundary.coordinates.length > 0 &&
      this.boundary.coordinates[0] &&
      this.boundary.coordinates[0].length >= 4;
    
    if (!hasValidCoordinates) {
      // Remove the boundary field entirely to avoid 2dsphere index issues
      this.boundary = undefined;
    }
  }
  next();
});

// Pre-update hook to clean up invalid boundary data on updates
villageSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.boundary) {
    const hasValidCoordinates = update.boundary.coordinates && 
      Array.isArray(update.boundary.coordinates) && 
      update.boundary.coordinates.length > 0 &&
      update.boundary.coordinates[0] &&
      update.boundary.coordinates[0].length >= 4;
    
    if (!hasValidCoordinates) {
      // Remove boundary from update or unset it
      delete update.boundary;
      update.$unset = update.$unset || {};
      update.$unset.boundary = 1;
    }
  }
  next();
});

// Indexes
villageSchema.index({ location: '2dsphere' });
// NOTE: 2dsphere index on boundary requires valid GeoJSON when boundary exists
// Using sparse index so documents without boundary are not indexed
villageSchema.index({ boundary: '2dsphere' }, { sparse: true });
villageSchema.index({ status: 1 });
villageSchema.index({ coverageStatus: 1 });
villageSchema.index({ region: 1, country: 1 });
villageSchema.index({ organization: 1 });
villageSchema.index({ name: 'text', description: 'text' });

// Virtual to get churches in this village
villageSchema.virtual('churches', {
  ref: 'Church',
  localField: '_id',
  foreignField: 'village',
});

// Virtual to get people groups in this village
villageSchema.virtual('peopleGroups', {
  ref: 'PeopleGroup',
  localField: '_id',
  foreignField: 'village',
});

// Enable virtuals in JSON output
villageSchema.set('toJSON', { virtuals: true });
villageSchema.set('toObject', { virtuals: true });

// Calculate center point from polygon boundary
villageSchema.methods.calculateCenterFromBoundary = function () {
  if (!this.boundary || !this.boundary.coordinates || !this.boundary.coordinates[0]) {
    return null;
  }
  
  const ring = this.boundary.coordinates[0];
  let sumLng = 0, sumLat = 0;
  const count = ring.length - 1; // Exclude closing point
  
  for (let i = 0; i < count; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  
  return [sumLng / count, sumLat / count];
};

// Static method to find villages containing a point
villageSchema.statics.findContainingPoint = function (coordinates) {
  return this.find({
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates,
        },
      },
    },
  });
};

// Static method to find villages within a bounding box
villageSchema.statics.findInBoundingBox = function (sw, ne) {
  return this.find({
    location: {
      $geoWithin: {
        $box: [sw, ne],
      },
    },
  });
};

// Static method for coverage statistics
villageSchema.statics.getCoverageStats = async function (filters = {}) {
  return this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$coverageStatus',
        count: { $sum: 1 },
        totalPopulation: { $sum: '$population' },
        avgCoverage: { $avg: '$coveragePercentage' },
      },
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        totalPopulation: 1,
        avgCoverage: { $round: ['$avgCoverage', 1] },
        _id: 0,
      },
    },
  ]);
};

module.exports = mongoose.model('Village', villageSchema);