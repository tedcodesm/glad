import mongoose from 'mongoose';
import { defineSchema, ref } from './schemaParts.js';

const hospitalServiceSchema = defineSchema(
  {
    hospital_id: { ...ref('Hospital'), required: true },
    category_id: { ...ref('ServiceCategory'), required: true },

    service_name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: null },
    consultation_fee: { type: Number, required: true, min: 0 },
    fee_label: { type: String, maxlength: 60, default: 'Consultation fee' },
    currency: { type: String, maxlength: 10, default: 'KES' },
    is_active: { type: Boolean, default: true },

    /** Practitioners offering this service, embedded — the booking flow renders them inline. */
    doctors: {
      type: [
        {
          _id: false,
          name: { type: String, required: true, trim: true },
          specialty: { type: String, trim: true, default: '' },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

hospitalServiceSchema.index({ hospital_id: 1 });
hospitalServiceSchema.index({ hospital_id: 1, service_name: 1 });

// Collection name kept explicit so it reads the same as the old PostgreSQL table.
export const HospitalService =
  mongoose.models.HospitalService ||
  mongoose.model('HospitalService', hospitalServiceSchema, 'hospital_services');