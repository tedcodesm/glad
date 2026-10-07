// Drop every GlandFind collection. Destructive — prompts unless --force is passed.
//
// Usage:  npm run db:drop
//         npm run db:drop -- --force

import { config } from '../src/config/env.js';
import { connect, disconnect } from '../src/config/mongoose.js';
import {
  Appointment, Hospital, HospitalService, InsuranceProvider,
  PatientProfile, Review, ServiceCategory, User,
} from '../src/models/index.js';

if (config.driver !== 'mongo') {
  console.error('db:drop only applies to DATA_DRIVER=mongo (the memory driver has nothing to drop).');
  process.exit(1);
}

const models = {
  users: User,
  hospitals: Hospital,
  hospital_services: HospitalService,
  service_categories: ServiceCategory,
  insurance_providers: InsuranceProvider,
  appointments: Appointment,
  patient_profiles: PatientProfile,
  reviews: Review,
};

async function main() {
  if (!process.argv.includes('--force') && process.env.FORCE !== '1') {
    console.log('This deletes ALL GlandFind data. Re-run with --force to confirm.');
    await disconnect();
    process.exit(1);
  }

  await connect();

  for (const [name, model] of Object.entries(models)) {
    const { deletedCount } = await model.deleteMany({});
    console.log(`  dropped ${name} (${deletedCount})`);
  }

  console.log('All GlandFind collections are empty.');
  await disconnect();
}

main()
  .catch(async (e) => {
    console.error('db:drop failed:', e.message);
    await disconnect().catch(() => {});
    process.exit(1);
  });