import mongoose from 'mongoose';
import { ROLES, defineSchema, jsonTransform, optionalString } from './schemaParts.js';

const userSchema = defineSchema(
  {
    full_name: { type: String, required: true, trim: true, maxlength: 150 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 150,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: optionalString(20),
    password_hash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'patient' },
  },
  { timestamps: true },
);

/** Extends the shared transform to also drop the password hash. */
userSchema.set('toJSON', {
  transform(_doc, ret) {
    jsonTransform(_doc, ret);
    delete ret.password_hash;
    return ret;
  },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);