// Barrel export for the Mongoose models. Importing this module registers every
// schema with Mongoose, which is what `syncIndexes()` and the seed script rely on.
export { User } from './User.js';
export { Hospital } from './Hospital.js';
export { HospitalService } from './HospitalService.js';
export { ServiceCategory } from './ServiceCategory.js';
export { InsuranceProvider } from './InsuranceProvider.js';
export { Appointment } from './Appointment.js';
export { PatientProfile } from './PatientProfile.js';
export { Review } from './Review.js';

export {
  APPOINTMENT_STATUSES,
  FACILITY_TYPE_LABELS,
  FACILITY_TYPES,
  HOSPITAL_STATUSES,
  ROLES,
} from './schemaParts.js';