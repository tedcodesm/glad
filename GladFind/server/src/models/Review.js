import mongoose from 'mongoose';
import { defineSchema, ref } from './schemaParts.js';

const reviewSchema = defineSchema(
  {
    hospital_id: { ...ref('Hospital'), required: true },
    patient_id: { ...ref('User'), default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null },
  },
  { timestamps: true },
);

reviewSchema.index({ hospital_id: 1, created_at: -1 });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);