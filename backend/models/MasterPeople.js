/**
 * MasterPeople Model — canonical ethnic group (source-agnostic).
 * Collection: master_people. Read-optimized: carries canonical identifiers plus a
 * small denormalized summary (sourceTypes, primaryLocation, status) copied from the
 * child collections so the map can render one marker per group from a single
 * indexed scan with no joins. See docs/architecture/04-mongodb-schemas.md §1.
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

const MasterStatusSummarySchema = new Schema(
  {
    status: {
      type: String,
      enum: ['UNREACHED', 'FRONTIER', 'MINIMALLY_REACHED', 'REACHED', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    jpScale: { type: Number, default: null },     // Joshua Project Progress Scale 1–5
    leastReached: { type: Boolean, default: null },
  },
  { _id: false }
);

const masterPeopleSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },

    canonicalName: { type: String, required: true, trim: true },

    // Idempotency key for the merge loader (sorted JP:<id>/CPPI:<id> tokens joined '|')
    groupNaturalKey: { type: String, default: null },

    // Registry of Peoples identifiers
    rop3: { type: String, default: null }, // people-group level (nullable; sparse-unique-ish)
    rop2: { type: String, default: null }, // people-cluster level
    rop1: { type: String, default: null }, // affinity-bloc level

    primaryCountryCode: { type: String, default: null }, // ISO3 (e.g. 'TCD')
    primaryLanguageName: { type: String, default: null },
    rol3: { type: String, default: null }, // ISO 639-3 language code

    affinityBloc: { type: String, default: null },
    peopleCluster: { type: String, default: null },

    totalPopulation: { type: Number, default: 0 },

    // Migration provenance
    migrationRunId: { type: String, default: null },
    version: { type: Number, default: null },

    // --- Denormalized for the map (see "Denormalization" in doc 04) ---
    sourceTypes: { type: [String], default: [] },          // e.g. ['JP','CPPI']
    primaryLocation: { type: PointSchema, default: null },  // copied from people_locations.isPrimary
    status: { type: MasterStatusSummarySchema, default: () => ({}) }, // copied from people_statuses
  },
  { timestamps: true } // createdAt, updatedAt
);

// Indexes
masterPeopleSchema.index({ rop3: 1 }, { sparse: true });   // ROP3 lookups; sparse because ~24.9% of CPPI lacks ROP3
masterPeopleSchema.index({ primaryCountryCode: 1 });        // country filtering / facets
masterPeopleSchema.index({ sourceTypes: 1 });               // map source-visibility filtering (multikey)
masterPeopleSchema.index({ primaryLocation: '2dsphere' });  // map bounds / $near / $geoWithin
masterPeopleSchema.index({ canonicalName: 'text' });        // name search (signal only)

masterPeopleSchema.index({ groupNaturalKey: 1 }, { unique: true, sparse: true }); // loader idempotency key

module.exports = mongoose.model('MasterPeople', masterPeopleSchema, 'master_people');
