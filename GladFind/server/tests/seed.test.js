// The seed path needs a live MongoDB, but its most common failure mode is
// silent: demo data drifting out of step with the schemas (a field renamed, an
// enum value dropped, a required value omitted, a reference left unresolved).
//
// These tests run the real buildSeedPlan() used by scripts/seed.js and let the
// schema validators judge its output, which catches exactly that drift — with
// no database running.
import './helpers/env.js';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hospitalServices, hospitals, insuranceProviders, serviceCategories } from '../src/config/memoryStore.js';
import { buildSeedPlan } from '../src/config/seedPlan.js';
import {
  Appointment, Hospital, HospitalService, InsuranceProvider,
  PatientProfile, ServiceCategory, User,
} from '../src/models/index.js';

const plan = buildSeedPlan();

describe('seed plan', () => {
  it('resolves every reference — nothing is skipped', () => {
    assert.deepEqual(plan.skipped, [], 'unresolved references would silently lose services');
  });

  it('covers every hospital in the dataset', () => {
    assert.equal(plan.hospitals.length, hospitals.length);
  });

  it('covers every service in the dataset', () => {
    assert.equal(plan.services.length, hospitalServices.length);
  });

  it('gives every document a unique id', () => {
    const all = [...plan.categories, ...plan.insurers, ...plan.hospitals, ...plan.services];
    const ids = all.map((d) => String(d._id));
    assert.equal(new Set(ids).size, ids.length, 'duplicate _id in the seed plan');
  });

  it('links every service to a hospital that is actually being inserted', () => {
    const hospitalIds = new Set(plan.hospitals.map((h) => String(h._id)));
    for (const service of plan.services) {
      assert.ok(hospitalIds.has(String(service.hospital_id)), `orphan service: ${service.service_name}`);
    }
  });

  it('links every service to a category that is actually being inserted', () => {
    const categoryIds = new Set(plan.categories.map((c) => String(c._id)));
    for (const service of plan.services) {
      assert.ok(categoryIds.has(String(service.category_id)), `orphan category: ${service.service_name}`);
    }
  });
});

describe('seed data is schema-valid', () => {
  const assertValid = (Model, rows, label) => {
    for (const row of rows) {
      const error = new Model(row).validateSync();
      assert.equal(error, undefined, `${label}: ${error?.message}`);
    }
  };

  it('service categories', () => assertValid(ServiceCategory, plan.categories, 'category'));
  it('insurance providers', () => assertValid(InsuranceProvider, plan.insurers, 'provider'));
  it('hospitals', () => assertValid(Hospital, plan.hospitals, 'hospital'));
  it('hospital services', () => assertValid(HospitalService, plan.services, 'service'));
});

describe('seed data is internally consistent', () => {
  it('hospital names are unique', () => {
    const names = hospitals.map((h) => h.name);
    assert.equal(new Set(names).size, names.length, 'duplicate hospital name');
  });

  it('every hospital has at least one service', () => {
    for (const hospital of hospitals) {
      const count = hospitalServices.filter((s) => s.hospital_id === hospital.id).length;
      assert.ok(count > 0, `${hospital.name} has no services, so it can never be booked`);
    }
  });

  it('every hospital is approved, or it is invisible to search', () => {
    for (const hospital of hospitals) {
      assert.equal(hospital.status, 'approved',
        `${hospital.name} is ${hospital.status} and would never appear in results`);
    }
  });

  it('only lists insurance providers from the catalog', () => {
    const known = new Set(insuranceProviders.map((p) => p.name));
    for (const hospital of hospitals) {
      for (const name of hospital.insurance_providers ?? []) {
        assert.ok(known.has(name), `${hospital.name} lists unknown insurer "${name}"`);
      }
    }
  });

  it('every service fee is a positive number', () => {
    for (const service of hospitalServices) {
      assert.ok(Number.isFinite(service.consultation_fee) && service.consultation_fee > 0,
        `${service.service_name} has fee ${service.consultation_fee}`);
    }
  });
});

describe('representative documents across the domain', () => {
  it('accepts a patient appointment', () => {
    const error = new Appointment({
      hospital_id: plan.hospitals[0]._id,
      service_id: plan.services[0]._id,
      patient_name: 'John Kamau', patient_phone: '+254712345678',
    }).validateSync();
    assert.equal(error, undefined, error?.message);
  });

  it('accepts a user', () => {
    const error = new User({
      full_name: 'Amina', email: 'amina@test.ke', password_hash: 'pbkdf2$sha256$1$salt$hash',
    }).validateSync();
    assert.equal(error, undefined, error?.message);
  });

  it('accepts a complete intake profile', () => {
    const error = new PatientProfile({
      full_name: 'Grace Wanjiku',
      profile_code: 'GF-ABCD2345',
      personal: {
        first_name: 'Grace', last_name: 'Wanjiku', date_of_birth: '1990-05-01',
        gender: 'Female', national_id: '29876543', phone: '+254700000000',
        address: 'Ngong Road', county: 'Nairobi',
      },
      medical_history: { conditions: ['Diabetes Type 2'] },
      health_data: { weight_kg: 64, blood_group: 'O+' },
      insurance: { providers: ['NHIF'], policy_numbers: { NHIF: 'X99' } },
      consent: { information_accurate: true, share_with_hospitals: true, accepted_terms: true },
    }).validateSync();
    assert.equal(error, undefined, error?.message);
  });
});