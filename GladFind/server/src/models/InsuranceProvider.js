import mongoose from 'mongoose';
import { defineSchema } from './schemaParts.js';

const insuranceProviderSchema = defineSchema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
});

export const InsuranceProvider =
  mongoose.models.InsuranceProvider || mongoose.model('InsuranceProvider', insuranceProviderSchema);