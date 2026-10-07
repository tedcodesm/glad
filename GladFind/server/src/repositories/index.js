// Barrel export for the data layer. Every repository picks its driver once, at
// module load, from DATA_DRIVER — controllers import only from here.
export { appointmentRepository } from './appointmentRepository.js';
export { hospitalRepository } from './hospitalRepository.js';
export { patientProfileRepository } from './patientProfileRepository.js';
export { userRepository } from './userRepository.js';