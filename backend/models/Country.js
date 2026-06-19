/**
 * Country Model
 * Stores country configurations for the Church Planting Map application
 * Supports multi-country operations with Central African focus
 */
const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema(
  {
    // ISO 3166-1 alpha-2 code (e.g., 'CM', 'TD')
    code: {
      type: String,
      required: [true, 'Country code is required'],
      unique: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
      trim: true,
    },
    // ISO 3166-1 alpha-3 code (e.g., 'CMR', 'TCD')
    code3: {
      type: String,
      required: [true, 'Country code3 is required'],
      unique: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      trim: true,
    },
    // English name
    name: {
      type: String,
      required: [true, 'Country name is required'],
      trim: true,
      maxlength: 100,
    },
    // French name
    nameFr: {
      type: String,
      required: [true, 'French country name is required'],
      trim: true,
      maxlength: 100,
    },
    // Local name (if different)
    nameLocal: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    // Geographic region
    region: {
      type: String,
      enum: ['Central Africa', 'West Africa', 'East Africa', 'North Africa', 'Southern Africa'],
      default: 'Central Africa',
    },
    // Default map center [lat, lng]
    defaultCenter: {
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },
    // Default zoom level for map
    defaultZoom: {
      type: Number,
      required: true,
      min: 1,
      max: 18,
      default: 6,
    },
    // Geographic bounds [south, west, north, east]
    bounds: {
      south: { type: Number, min: -90, max: 90 },
      west: { type: Number, min: -180, max: 180 },
      north: { type: Number, min: -90, max: 90 },
      east: { type: Number, min: -180, max: 180 },
    },
    // Capital city
    capital: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    // Area in km²
    area: {
      type: Number,
      min: 0,
    },
    // Administrative level names
    adminLevels: {
      1: {
        name: { type: String, default: 'Régions' },
        nameEn: { type: String, default: 'Regions' },
        count: { type: Number, default: 0 },
      },
      2: {
        name: { type: String, default: 'Départements' },
        nameEn: { type: String, default: 'Departments' },
        count: { type: Number, default: 0 },
      },
      3: {
        name: { type: String, default: 'Arrondissements' },
        nameEn: { type: String, default: 'Subdivisions' },
        count: { type: Number, default: 0 },
      },
    },
    // Languages spoken
    languages: [{
      type: String,
      trim: true,
    }],
    // Currency code
    currency: {
      type: String,
      uppercase: true,
      maxlength: 3,
    },
    // Whether this country is active in the system
    isActive: {
      type: Boolean,
      default: true,
    },
    // Whether this is the default country (Cameroon)
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Data availability flags
    dataAvailable: {
      adminPolygons: { type: Boolean, default: false },
      villages: { type: Boolean, default: false },
      villagesDecoupes: { type: Boolean, default: false },
      joshuaProject: { type: Boolean, default: false },
      dmmPeoples: { type: Boolean, default: false },
    },
    // Statistics (updated periodically)
    statistics: {
      totalVillages: { type: Number, default: 0 },
      totalPeopleGroups: { type: Number, default: 0 },
      totalChurches: { type: Number, default: 0 },
      lastUpdated: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// Note: code and code3 already have unique: true in field definition (which creates an index)
countrySchema.index({ isActive: 1 });
countrySchema.index({ isDefault: 1 });
countrySchema.index({ region: 1 });

// Virtual for center as array [lat, lng]
countrySchema.virtual('centerArray').get(function () {
  return [this.defaultCenter.lat, this.defaultCenter.lng];
});

// Virtual for bounds as array [[south, west], [north, east]]
countrySchema.virtual('boundsArray').get(function () {
  if (!this.bounds) return null;
  return [
    [this.bounds.south, this.bounds.west],
    [this.bounds.north, this.bounds.east],
  ];
});

// Enable virtuals in JSON output
countrySchema.set('toJSON', { virtuals: true });
countrySchema.set('toObject', { virtuals: true });

// Static method to get default country
countrySchema.statics.getDefault = async function () {
  return this.findOne({ isDefault: true, isActive: true });
};

// Static method to get by code (ISO2 or ISO3)
countrySchema.statics.getByCode = async function (code) {
  const upperCode = code.toUpperCase();
  return this.findOne({
    $or: [{ code: upperCode }, { code3: upperCode }],
    isActive: true,
  });
};

// Static method to get all active countries
countrySchema.statics.getActive = async function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to get Central African countries
countrySchema.statics.getCentralAfrican = async function () {
  return this.find({ region: 'Central Africa', isActive: true }).sort({ name: 1 });
};

// Instance method to update statistics
countrySchema.methods.updateStatistics = async function (stats) {
  this.statistics = {
    ...this.statistics,
    ...stats,
    lastUpdated: new Date(),
  };
  return this.save();
};

// Pre-save hook to ensure only one default country
countrySchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Unset default on all other countries
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('Country', countrySchema);
