// Turns the plain demo dataset from memoryStore.js into documents ready for
// Mongoose: fresh ObjectIds, and every reference resolved.
//
// Shared by scripts/seed.js and tests/seed.test.js so the seed path and its
// test can never disagree about what gets inserted.
import mongoose from 'mongoose';

import {
  hospitalServices, hospitals, insuranceProviders, serviceCategories,
} from './memoryStore.js';

const oid = () => new mongoose.Types.ObjectId();

export function buildSeedPlan() {
  const categories = serviceCategories.map(({ id, _id, ...rest }) => ({ _id: oid(), ...rest }));
  const insurers = insuranceProviders.map(({ id, _id, ...rest }) => ({ _id: oid(), ...rest }));

  const categoryByName = new Map(categories.map((c) => [c.name, c._id]));
  const hospitalRows = hospitals.map(({ id, owner_id, ...rest }) => ({ _id: oid(), ...rest }));
  const hospitalByName = new Map(hospitalRows.map((h) => [h.name, h._id]));

  const services = [];
  const skipped = [];

  for (const service of hospitalServices) {
    const hospitalName = hospitals.find((h) => h.id === service.hospital_id)?.name;
    const categoryName = serviceCategories.find((c) => c.id === service.category_id)?.name;

    const hospital_id = hospitalByName.get(hospitalName);
    const category_id = categoryByName.get(categoryName);

    if (!hospital_id || !category_id) {
      skipped.push(service.service_name);
      continue;
    }

    const { id, hospital_id: _h, category_id: _c, ...rest } = service;
    services.push({ _id: oid(), ...rest, hospital_id, category_id });
  }

  return { categories, insurers, hospitals: hospitalRows, services, skipped };
}