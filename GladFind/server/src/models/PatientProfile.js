import mongoose from 'mongoose';
import { defineSchema, jsonTransform, ref } from './schemaParts.js';

// -- Section 1 — personal information -------------------------------------
const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: null },
    relationship: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
  },
  { _id: false },
);

const personalSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    date_of_birth: { type: Date, required: true },
    gender: { type: String, trim: true, required: true },
    national_id: { type: String, required: true, trim: true, uppercase: true },
    nationality: { type: String, trim: true, default: 'Kenyan' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: null },
    address: { type: String, trim: true, required: true },
    county: { type: String, required: true, trim: true },
    marital_status: { type: String, trim: true, default: null },
    emergency_contact: { type: emergencyContactSchema, default: () => ({}) },
  },
  { _id: false },
);

// -- Section 2 — medical history -----------------------------------------
const medicalHistorySchema = new mongoose.Schema(
  {
    conditions: { type: [String], default: [] },
    diagnosis_date: { type: Date, default: null },
    referring_doctor: { type: String, trim: true, default: null },
    diagnosis_stage: { type: String, trim: true, default: null },
    symptoms: { type: String, default: null },
    surgeries: { type: [String], default: [] },
    family_history: { type: String, default: null },
    allergies: { type: [String], default: [] },
    medications: { type: [String], default: [] },
    smoking: { type: String, trim: true, default: null },
    alcohol: { type: String, trim: true, default: null },
    exercise: { type: String, trim: true, default: null },
  },
  { _id: false },
);

// -- Section 3 — health data ---------------------------------------------
const healthDataSchema = new mongoose.Schema(
  {
    weight_kg: { type: Number, default: null, min: 10, max: 300 },
    height_cm: { type: Number, default: null, min: 50, max: 250 },
    blood_pressure: { type: String, trim: true, default: null },
    blood_sugar: { type: Number, default: null, min: 0 },
    blood_group: { type: String, trim: true, default: null },
    disability: { type: String, trim: true, default: null },

    pregnancy_status: { type: String, trim: true, default: null },
    children: { type: Number, default: null, min: 0, max: 20 },
    contraception: { type: String, trim: true, default: null },

    mental_conditions: { type: [String], default: [] },
    mental_notes: { type: String, default: null },

    services_needed: { type: [String], default: [] },
    additional_notes: { type: String, default: null },
  },
  { _id: false },
);

// -- Section 4 — insurance -----------------------------------------------
const insuranceSchema = new mongoose.Schema(
  {
    providers: { type: [String], default: [] },
    // Provider name -> membership / policy number.
    policy_numbers: { type: Map, of: String, default: () => new Map() },
    employer: { type: String, trim: true, default: null },
    expiry_date: { type: Date, default: null },
    covers: { type: [String], default: [] },
    annual_limit: { type: String, trim: true, default: null },
    notes: { type: String, default: null },
  },
  { _id: false },
);

// -- Consent -------------------------------------------------------------
const consentSchema = new mongoose.Schema(
  {
    information_accurate: { type: Boolean, default: false },
    share_with_hospitals: { type: Boolean, default: false },
    accepted_terms: { type: Boolean, default: false },
    consented_at: { type: Date, default: null },
  },
  { _id: false },
);

const patientProfileSchema = defineSchema(
  {
    // Null for guest profiles submitted without an account.
    patient_id: { ...ref('User'), default: null },

    // Denormalised so a profile is identifiable even when patient_id is null.
    full_name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },

    personal: { type: personalSchema, required: true },
    medical_history: { type: medicalHistorySchema, default: () => ({}) },
    health_data: { type: healthDataSchema, default: () => ({}) },
    insurance: { type: insuranceSchema, default: () => ({}) },
    consent: { type: consentSchema, default: () => ({}) },

    // One live profile per national ID; guests are tracked the same way.
    profile_code: { type: String, required: true, unique: true, uppercase: true },
  },
  { timestamps: true },
);

// A signed-in patient keeps a single, replaceable profile.
patientProfileSchema.index({ patient_id: 1 }, { unique: true, sparse: true });
patientProfileSchema.index({ 'personal.national_id': 1 });
patientProfileSchema.index({ 'personal.county': 1 });
patientProfileSchema.index({ 'insurance.providers': 1 });

// Maps don't serialise to JSON on their own, so extend the shared transform.
patientProfileSchema.set('toJSON', {
  transform(_doc, ret) {
    jsonTransform(_doc, ret);
    if (ret.insurance?.policy_numbers instanceof Map) {
      ret.insurance.policy_numbers = Object.fromEntries(ret.insurance.policy_numbers);
    }
    return ret;
  },
});

export const PatientProfile =
  mongoose.models.PatientProfile || mongoose.model('PatientProfile', patientProfileSchema);