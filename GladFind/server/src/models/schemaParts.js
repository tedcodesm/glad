// Shared schema pieces. PostgreSQL CHECK constraints become Mongoose `enum`s,
// and the `touch_updated_at` trigger becomes `timestamps: true`.
import mongoose from 'mongoose';

export const FACILITY_TYPES = ['public_hospital', 'private_hospital', 'specialist_clinic', 'teaching_hospital'];
export const FACILITY_TYPE_LABELS = {
  public_hospital: 'Public hospital',
  private_hospital: 'Private hospital',
  specialist_clinic: 'Specialist clinic',
  teaching_hospital: 'Teaching hospital',
};

export const ROLES = ['patient', 'hospital_admin', 'platform_admin'];
export const HOSPITAL_STATUSES = ['pending', 'approved', 'suspended'];
export const APPOINTMENT_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'];

/** Reference to another document. Kept as ObjectId with ref, matching Mongoose defaults. */
export function ref(modelName) {
  return { type: mongoose.Schema.Types.ObjectId, ref: modelName };
}

/**
 * Transform applied to every schema: `_id` and `__v` are stripped from JSON output
 * so API responses stay identical to the previous snake_case PostgreSQL payloads.
 *
 * Mongoose ignores a top-level `transform` in the schema constructor options, so
 * it has to be installed through `toJSON`/`toObject` — hence this helper.
 */
export function jsonTransform(_doc, ret) {
  ret.id = ret._id?.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

/** Create a schema with the shared serialisation behaviour already wired up. */
export function defineSchema(definition, options = {}) {
  const schema = new mongoose.Schema(definition, { versionKey: false, ...options });
  schema.set('toJSON', { transform: jsonTransform });
  schema.set('toObject', { transform: jsonTransform });
  return schema;
}

/** Bounded string with a default of null, so optional fields round-trip cleanly. */
export function optionalString(max, { default: def = null } = {}) {
  return { type: String, maxlength: max, default: def };
}