/**
 * People Model - Represents population data for villages/polygons
 * Tracks demographic information and links to geographic areas
 */
const mongoose = require('mongoose');

const peopleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'People group name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    // Village/Area name this population belongs to
    villageName: {
      type: String,
      trim: true,
      maxlength: [200, 'Village name cannot exceed 200 characters'],
      index: true,
    },
    // Reference to Village document (optional)
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
    },
    // Reference to polygon ID (for Voronoi or custom polygons)
    polygonId: {
      type: String,
      trim: true,
      index: true,
    },
    // Population count
    population: {
      type: Number,
      min: [0, 'Population cannot be negative'],
      default: 0,
    },
    // Households count
    households: {
      type: Number,
      min: [0, 'Households cannot be negative'],
      default: 0,
    },
    // GeoJSON Point location (center point)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function (coords) {
            if (!coords || coords.length !== 2) return true; // Optional
            const [lng, lat] = coords;
            return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
          },
          message: 'Invalid coordinates. Must be [longitude, latitude] with valid ranges.',
        },
      },
    },
    // Demographics
    demographics: {
      maleCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      femaleCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      childrenCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      adultsCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      elderlyCount: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    // Primary language spoken
    language: {
      type: String,
      trim: true,
      maxlength: [100, 'Language cannot exceed 100 characters'],
    },
    // Primary religion
    religion: {
      type: String,
      trim: true,
      maxlength: [100, 'Religion cannot exceed 100 characters'],
    },
    // Ethnic group
    ethnicity: {
      type: String,
      trim: true,
      maxlength: [100, 'Ethnicity cannot exceed 100 characters'],
    },
    // Description/notes
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    // Administrative location
    region: {
      type: String,
      trim: true,
      maxlength: [100, 'Region cannot exceed 100 characters'],
    },
    departement: {
      type: String,
      trim: true,
      maxlength: [100, 'Departement cannot exceed 100 characters'],
    },
    arrondissement: {
      type: String,
      trim: true,
      maxlength: [100, 'Arrondissement cannot exceed 100 characters'],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
      default: 'Cameroon',
    },
    // Church planting status
    status: {
      type: String,
      enum: {
        values: ['unreached', 'pioneer', 'midway', 'tipping-point', 'dmm'],
        message: 'Status must be unreached, pioneer, midway, tipping-point, or dmm',
      },
      default: 'unreached',
    },
    // Status color for map display
    statusColor: {
      type: String,
      enum: ['red', 'yellow', 'blue', 'orange', 'green'],
      default: 'red',
    },
    // Number of believers
    believersCount: {
      type: Number,
      min: [0, 'Believers count cannot be negative'],
      default: 0,
    },
    // Number of churches
    churchesCount: {
      type: Number,
      min: [0, 'Churches count cannot be negative'],
      default: 0,
    },
    // Organization that manages this data
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    // Creator tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Last updated by
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Approval workflow
    approved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    // Visibility
    isPublic: {
      type: Boolean,
      default: true,
    },
    // Data source
    dataSource: {
      type: String,
      trim: true,
      maxlength: [200, 'Data source cannot exceed 200 characters'],
    },
    // Year of data collection
    dataYear: {
      type: Number,
      min: 1900,
      max: 2100,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// Note: villageName and polygonId already have index: true in field definition
peopleSchema.index({ location: '2dsphere' });
peopleSchema.index({ status: 1 });
peopleSchema.index({ approved: 1 });
peopleSchema.index({ createdBy: 1 });
peopleSchema.index({ organization: 1 });
peopleSchema.index({ region: 1, departement: 1 });
peopleSchema.index({ name: 'text', description: 'text', villageName: 'text' });

// Auto-update statusColor based on status
peopleSchema.pre('save', function (next) {
  const statusColorMap = {
    'unreached': 'red',
    'pioneer': 'yellow',
    'midway': 'blue',
    'tipping-point': 'orange',
    'dmm': 'green',
  };
  this.statusColor = statusColorMap[this.status] || 'red';
  next();
});

// Virtual for total population from demographics
peopleSchema.virtual('calculatedPopulation').get(function () {
  if (this.demographics) {
    const { maleCount = 0, femaleCount = 0 } = this.demographics;
    return maleCount + femaleCount;
  }
  return this.population;
});

// Virtual for status display name
peopleSchema.virtual('statusDisplay').get(function () {
  const displayNames = {
    'unreached': 'Unreached',
    'pioneer': 'Pioneer',
    'midway': 'Midway',
    'tipping-point': 'Tipping Point',
    'dmm': 'DMM',
  };
  return displayNames[this.status] || this.status;
});

// Enable virtuals in JSON output
peopleSchema.set('toJSON', { virtuals: true });
peopleSchema.set('toObject', { virtuals: true });

// Static method to find by polygon ID
peopleSchema.statics.findByPolygonId = function (polygonId) {
  return this.find({ polygonId, approved: true });
};

// Static method to find by village name
peopleSchema.statics.findByVillageName = function (villageName) {
  return this.find({ villageName, approved: true });
};

// Static method to get population statistics by region
peopleSchema.statics.getPopulationStats = async function (filters = {}) {
  const matchStage = { approved: true, ...filters };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$region',
        totalPopulation: { $sum: '$population' },
        totalHouseholds: { $sum: '$households' },
        totalBelievers: { $sum: '$believersCount' },
        totalChurches: { $sum: '$churchesCount' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        region: '$_id',
        totalPopulation: 1,
        totalHouseholds: 1,
        totalBelievers: 1,
        totalChurches: 1,
        count: 1,
        _id: 0,
      },
    },
    { $sort: { totalPopulation: -1 } },
  ]);
};

// Static method to get status distribution
peopleSchema.statics.getStatusDistribution = async function (filters = {}) {
  const matchStage = { approved: true, ...filters };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPopulation: { $sum: '$population' },
      },
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        totalPopulation: 1,
        _id: 0,
      },
    },
  ]);
};

module.exports = mongoose.model('People', peopleSchema);
