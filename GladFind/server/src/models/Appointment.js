import mongoose from 'mongoose';
import { APPOINTMENT_STATUSES, defineSchema, optionalString, ref } from './schemaParts.js';

const appointmentSchema = defineSchema(
  {
    patient_id: { ...ref('User'), default: null },
    hospital_id: { ...ref('Hospital'), required: true },
    service_id: { ...ref('HospitalService'), required: true },

    patient_name: { type: String, required: true, trim: true, maxlength: 150 },
    patient_phone: { type: String, required: true, trim: true, maxlength: 20 },
    patient_email: optionalString(150),

    preferred_date: { type: Date, default: null },
    preferred_time: optionalString(20),
    doctor_name: optionalString(150),
    notes: { type: String, default: null },

    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'requested' },
  },
  { timestamps: true },
);

appointmentSchema.index({ hospital_id: 1, created_at: -1 });
appointmentSchema.index({ patient_id: 1, created_at: -1 });
appointmentSchema.index({ status: 1 });

export const Appointment =
  mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);