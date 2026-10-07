// In-memory store — mirrors the MongoDB models and the demo seed data.
// Active when DATA_DRIVER=memory, so the API (and the React client) can be demoed
// with no database running. Set DATA_DRIVER=mongo for real deployments; no other
// code changes are required.
import crypto from 'node:crypto';

export const uuid = () => crypto.randomUUID();

// -- Reference data ------------------------------------------------------
export const serviceCategories = [
  'Cardiology', 'Oncology', 'Neurology', 'Orthopaedics', 'Maternity',
  'Paediatrics', 'Dialysis', 'General Surgery', 'General Medicine',
  'Dental', 'ICU', 'Burns Unit', 'Transplant',
].map((name, i) => ({ id: i + 1, name, slug: name.toLowerCase().replace(/\s+/g, '_') }));

export const insuranceProviders = [
  'NHIF', 'Jubilee Health', 'AAR Insurance', 'CIC Insurance',
  'Madison Insurance', 'UAP Insurance', 'Linda Mama',
].map((name, i) => ({ id: i + 1, name }));

const cat = (name) => serviceCategories.find((c) => c.name === name)?.id ?? null;

// -- Hospitals -----------------------------------------------------------
const now = () => new Date();

export const hospitals = [
  { id: uuid(), owner_id: null, name: 'Nairobi Hospital', facility_type: 'private_hospital', county: 'Nairobi', town: 'Upper Hill', phone: '+254 20 284 5000', about: "One of Kenya's premier private hospitals offering a full range of specialist services.", bed_capacity: 300, specialist_count: 60, is_open: true, is_verified: true, accepts_walk_ins: false, supports_booking: true, rating: 4.8, review_count: 1240, status: 'approved', insurance_providers: ['Jubilee Health', 'AAR Insurance', 'NHIF', 'CIC Insurance'], created_at: now(), updated_at: now() },
  { id: uuid(), owner_id: null, name: 'Kenyatta National Hospital', facility_type: 'teaching_hospital', county: 'Nairobi', town: 'Upper Hill', phone: '+254 20 272 6300', about: "Kenya's largest public referral and teaching hospital offering comprehensive care at subsidised rates.", bed_capacity: 1800, specialist_count: 200, is_open: true, is_verified: true, accepts_walk_ins: true, supports_booking: true, rating: 4.0, review_count: 3410, status: 'approved', insurance_providers: ['NHIF', 'Linda Mama'], created_at: now(), updated_at: now() },
  { id: uuid(), owner_id: null, name: 'Aga Khan University Hospital', facility_type: 'private_hospital', county: 'Nairobi', town: 'Parklands', phone: '+254 20 366 2000', about: 'A leading academic medical centre offering advanced treatments and research-backed specialist care.', bed_capacity: 254, specialist_count: 90, is_open: true, is_verified: true, accepts_walk_ins: false, supports_booking: true, rating: 4.9, review_count: 980, status: 'approved', insurance_providers: ['Jubilee Health', 'AAR Insurance', 'Madison Insurance', 'UAP Insurance'], created_at: now(), updated_at: now() },
  { id: uuid(), owner_id: null, name: 'Kiambu Level 5 Hospital', facility_type: 'public_hospital', county: 'Kiambu', town: 'Kiambu Town', phone: '+254 67 22 1234', about: 'County-level referral facility serving Kiambu and surrounding areas.', bed_capacity: 120, specialist_count: 20, is_open: true, is_verified: false, accepts_walk_ins: true, supports_booking: true, rating: 3.7, review_count: 412, status: 'approved', insurance_providers: ['NHIF'], created_at: now(), updated_at: now() },
  { id: uuid(), owner_id: null, name: 'Mater Misericordiae Hospital', facility_type: 'private_hospital', county: 'Nairobi', town: 'South B', phone: '+254 20 690 6000', about: 'A mission hospital known for compassionate care and affordable specialist services.', bed_capacity: 180, specialist_count: 40, is_open: false, is_verified: true, accepts_walk_ins: false, supports_booking: true, rating: 4.5, review_count: 720, status: 'approved', insurance_providers: ['NHIF', 'CIC Insurance', 'Jubilee Health'], created_at: now(), updated_at: now() },
  { id: uuid(), owner_id: null, name: 'Limuru Health Centre (Upgraded)', facility_type: 'specialist_clinic', county: 'Kiambu', town: 'Limuru', phone: '+254 726 123 456', about: 'A recently upgraded primary care centre in Limuru serving the local community.', bed_capacity: 30, specialist_count: 5, is_open: true, is_verified: false, accepts_walk_ins: true, supports_booking: true, rating: 4.1, review_count: 88, status: 'approved', insurance_providers: ['NHIF'], created_at: now(), updated_at: now() },
];

const hid = (name) => hospitals.find((h) => h.name === name).id;

// -- Services ------------------------------------------------------------
// Doctors were only ever hardcoded in the static booking page; they now live on
// the service document so the booking form and MongoDB share one source.
const serviceData = [
  ['Nairobi Hospital', 'Specialist consult', [
    ['Cardiology', 4500, [['Dr. Sarah Wanjiku', 'Cardiology']]],
    ['Oncology', 4500, [['Dr. Brian Otieno', 'Oncology']]],
    ['Neurology', 4500, [['Dr. Mercy Njeri', 'Neurology']]],
    ['Orthopaedics', 4500, [['Dr. Daniel Kamau', 'Orthopaedics']]],
    ['ICU', 4500, [['Dr. Peter Mwangi', 'ICU']]],
  ]],
  ['Kenyatta National Hospital', 'Outpatient consult', [
    ['Dialysis', 500, [['Dr. Kevin Mutua', 'Dialysis']]],
    ['Maternity', 500, [['Dr. Lucy Wambui', 'Maternity']]],
    ['Burns Unit', 500, [['Dr. Esther Wambui', 'Burns Unit']]],
    ['Neurology', 500, [['Dr. Anne Akinyi', 'Neurology']]],
    ['Orthopaedics', 500, [['Dr. James Kariuki', 'Orthopaedics']]],
  ]],
  ['Aga Khan University Hospital', 'Specialist consult', [
    ['Oncology', 6000, [['Dr. Amina Hassan', 'Oncology']]],
    ['Cardiology', 6000, [['Dr. David Maina', 'Cardiology']]],
    ['Maternity', 6000, [['Dr. Grace Chebet', 'Maternity']]],
    ['Paediatrics', 6000, [['Dr. Ibrahim Noor', 'Paediatrics']]],
    ['Transplant', 6000, [['Dr. Fatma Yusuf', 'Transplant']]],
  ]],
  ['Kiambu Level 5 Hospital', 'Outpatient consult', [
    ['Maternity', 300, [['Dr. Mary Wairimu', 'Maternity']]],
    ['Paediatrics', 300, [['Dr. Faith Njoki', 'Paediatrics']]],
    ['General Surgery', 300, [['Dr. John Kibet', 'General Surgery']]],
    ['Dialysis', 300, [['Dr. Kevin Mutua', 'Dialysis']]],
  ]],
  ['Mater Misericordiae Hospital', 'Specialist consult', [
    ['Cardiology', 3500, [['Dr. Ruth Njeri', 'Cardiology']]],
    ['Maternity', 3500, [['Dr. Irene Atieno', 'Maternity']]],
    ['Paediatrics', 3500, [['Dr. Mark Ochieng', 'Paediatrics']]],
    ['Orthopaedics', 3500, [['Dr. Samuel Karanja', 'Orthopaedics']]],
  ]],
  ['Limuru Health Centre (Upgraded)', 'General consult', [
    ['General Medicine', 1500, [['Dr. Alice Wambui', 'General Medicine']]],
    ['Maternity', 1500, [['Dr. Jane Nyambura', 'Maternity']]],
    ['Paediatrics', 1500, [['Dr. Eric Kimani', 'Paediatrics']]],
    ['Dental', 1500, [['Dr. Eric Kimani', 'Dental']]],
  ]],
];

export const hospitalServices = [];
for (const [hospitalName, feeLabel, rows] of serviceData) {
  for (const [serviceName, fee, doctors] of rows) {
    hospitalServices.push({
      id: uuid(),
      hospital_id: hid(hospitalName),
      category_id: cat(serviceName),
      service_name: serviceName,
      description: null,
      consultation_fee: fee,
      fee_label: feeLabel,
      currency: 'KES',
      is_active: true,
      doctors: doctors.map(([name, specialty]) => ({ name, specialty })),
      created_at: now(),
      updated_at: now(),
    });
  }
}

// -- Writable collections (empty at boot, filled by API calls) -----------
export const users = [];
export const appointments = [];
export const reviews = [];
export const patientProfiles = [];

/** Reset every writable collection. Used between test cases. */
export function reset() {
  users.length = 0;
  appointments.length = 0;
  reviews.length = 0;
  patientProfiles.length = 0;
}