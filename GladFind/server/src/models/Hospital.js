import mongoose from 'mongoose';
import { FACILITY_TYPES, HOSPITAL_STATUSES, defineSchema, optionalString, ref } from './schemaParts.js';

const hospitalSchema = defineSchema(
  {
    owner_id: { ...ref('User'), default: null },

    name: { type: String, required: true, trim: true, maxlength: 200 },
    facility_type: { type: String, required: true, enum: FACILITY_TYPES },
    county: { type: String, required: true, trim: true, maxlength: 60 },
    town: { type: String, required: true, trim: true, maxlength: 60 },

    address_line: optionalString(255),
    latitude: { type: Number, default: null, min: -90, max: 90 },
    longitude: { type: Number, default: null, min: -180, max: 180 },
    phone: optionalString(20),
    email: optionalString(150),
    about: { type: String, default: null },

    bed_capacity: { type: Number, default: null, min: 0 },
    specialist_count: { type: Number, default: null, min: 0 },

    is_open: { type: Boolean, default: true },
    is_verified: { type: Boolean, default: false },
    accepts_walk_ins: { type: Boolean, default: false },
    supports_booking: { type: Boolean, default: true },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    review_count: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: HOSPITAL_STATUSES, default: 'pending' },

    // Accepted insurance providers are embedded rather than joined through a link
    // collection: the array is small, bounded, and always read with its hospital.
    insurance_providers: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Replaces the Postgres indexes on county and status.
hospitalSchema.index({ county: 1 });
hospitalSchema.index({ status: 1 });
hospitalSchema.index({ owner_id: 1 });

export const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);