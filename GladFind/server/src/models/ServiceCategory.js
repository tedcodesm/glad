import mongoose from 'mongoose';
import { defineSchema } from './schemaParts.js';

const serviceCategorySchema = defineSchema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
});

export const ServiceCategory =
  mongoose.models.ServiceCategory || mongoose.model('ServiceCategory', serviceCategorySchema);