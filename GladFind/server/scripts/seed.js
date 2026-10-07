// Seed MongoDB with the demo dataset.
//
// The data itself lives in src/config/memoryStore.js — the same array the memory
// driver serves — so the two drivers can never drift apart. buildSeedPlan()
// translates those plain objects into Mongoose documents.
//
// Usage:  npm run db:seed          (wipe + insert)
//         FORCE=1 npm run db:seed  (skip the "already seeded" guard)

import { config } from '../src/config/env.js';
import { connect, disconnect } from '../src/config/mongoose.js';
import { buildSeedPlan } from '../src/config/seedPlan.js';
import {
  Appointment, Hospital, HospitalService, InsuranceProvider,
  PatientProfile, Review, ServiceCategory, User,
} from '../src/models/index.js';

if (config.driver !== 'mongo') {
  console.error('db:seed only applies to DATA_DRIVER=mongo.');
  console.error('The memory driver already serves this dataset with no seeding step — just run the API.');
  process.exit(1);
}

async function wipe() {
  await Promise.all([
    User.deleteMany({}),
    Hospital.deleteMany({}),
    HospitalService.deleteMany({}),
    ServiceCategory.deleteMany({}),
    InsuranceProvider.deleteMany({}),
    Appointment.deleteMany({}),
    PatientProfile.deleteMany({}),
    Review.deleteMany({}),
  ]);
}

async function main() {
  await connect();

  const existing = await Hospital.countDocuments();
  if (existing > 0 && process.env.FORCE !== '1') {
    console.log(`Database already holds ${existing} hospitals. Re-run with FORCE=1 to wipe and reseed.`);
    await disconnect();
    return;
  }

  await wipe();

  const plan = buildSeedPlan();

  for (const name of plan.skipped) console.warn(`  ! skipped "${name}" — unresolved hospital or category`);

  // _id is generated up front by the plan so services can reference it.
  await ServiceCategory.insertMany(plan.categories);
  await InsuranceProvider.insertMany(plan.insurers);
  await Hospital.insertMany(plan.hospitals);
  await HospitalService.insertMany(plan.services);

  console.log(`Seeded ${plan.categories.length} categories, ${plan.insurers.length} insurers,`);
  console.log(`${plan.hospitals.length} hospitals and ${plan.services.length} services.`);

  await disconnect();
}

main()
  .catch(async (e) => {
    console.error('db:seed failed:', e.message);
    await disconnect().catch(() => {});
    process.exit(1);
  });