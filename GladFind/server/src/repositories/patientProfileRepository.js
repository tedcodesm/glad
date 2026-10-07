// Patient profile data access — intake form persistence.
//
// New capability: the four-step intake form previously lived only in the browser,
// so completed submissions were lost. Profiles are keyed by `profile_code` (the
// reference shown to the patient) and, when signed in, by `patient_id`.
import { config } from '../config/env.js';
import crypto from 'node:crypto';
import * as store from '../config/memoryStore.js';
import { PatientProfile } from '../models/index.js';

const PROFILE_CODE_RE = /^GF-[A-Z0-9]{4,12}$/;

/**
 * The reference is the only credential protecting a medical record from anyone
 * who has not signed in, so it is drawn from the CSPRNG — never Math.random.
 */
function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 look-alikes
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `GF-${out}`;
}

/** Only these sections are accepted from the client; `profile_code` is server-owned. */
function normaliseSections(data, existing = {}) {
  return {
    personal: data.personal ?? existing.personal ?? {},
    medical_history: data.medical_history ?? existing.medical_history ?? {},
    health_data: data.health_data ?? existing.health_data ?? {},
    insurance: data.insurance ?? existing.insurance ?? {},
    consent: data.consent ?? existing.consent ?? {},
  };
}

function shape(row) {
  if (!row) return null;
  const { _id, id, patient_id, insurance, ...rest } = row;
  return {
    ...rest,
    id: String(id ?? _id),
    patient_id: patient_id == null ? null : String(patient_id),
    insurance: insurance
      ? { ...insurance, policy_numbers: { ...(insurance.policy_numbers ?? {}) } }
      : insurance,
  };
}

/** Reject unknown top-level keys so a client cannot set `id`, `profile_code`, etc. */
function writable(data) {
  const out = {};
  for (const key of ['full_name', 'email', 'phone']) {
    if (key in data) out[key] = data[key] || null;
  }
  return out;
}

function createMemoryRepo() {
  return {
    async create(data, { patientId } = {}) {
      const profile_code = randomCode();

      const profile = {
        id: store.uuid(),
        patient_id: patientId || null,
        ...writable(data),
        profile_code,
        ...normaliseSections(data),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // A signed-in patient has one live profile; re-submitting replaces it.
      const at = patientId ? store.patientProfiles.findIndex((p) => p.patient_id === patientId) : -1;
      if (at >= 0) {
        profile.id = store.patientProfiles[at].id;
        profile.created_at = store.patientProfiles[at].created_at;
        store.patientProfiles[at] = profile;
      } else {
        store.patientProfiles.push(profile);
      }

      return profile;
    },

    async findByCode(profile_code) {
      return store.patientProfiles.find(
        (p) => p.profile_code.toUpperCase() === String(profile_code).toUpperCase(),
      ) || null;
    },

    async findByPatient(patientId) {
      return store.patientProfiles.find((p) => p.patient_id === patientId) || null;
    },
  };
}

function createMongoRepo() {
  /** An invalid id string is a miss, not a server error. */
  async function findLean(filter) {
    try {
      return await PatientProfile.findOne(filter).lean();
    } catch {
      return null;
    }
  }

  /** Retry on the astronomically unlikely `profile_code` collision. */
  async function allocateCode() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const profile_code = randomCode();
      if (!(await PatientProfile.exists({ profile_code }))) return profile_code;
    }
    throw Object.assign(new Error('Could not allocate a profile reference'), { status: 500 });
  }

  return {
    async create(data, { patientId } = {}) {
      const profile_code = await allocateCode();
      const sections = normaliseSections(data);

      const filter = patientId ? { patient_id: patientId } : { profile_code };
      const doc = { ...writable(data), profile_code, ...sections, ...(patientId ? { patient_id: patientId } : {}) };

      // upsert keeps one live profile per signed-in patient
      const profile = await PatientProfile.findOneAndUpdate(filter, { $set: doc }, {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }).lean();

      return shape(profile);
    },

    async findByCode(profile_code) {
      if (!PROFILE_CODE_RE.test(String(profile_code).toUpperCase())) return null;
      return shape(await findLean({ profile_code: String(profile_code).toUpperCase() }));
    },

    async findByPatient(patientId) {
      return shape(await findLean({ patient_id: patientId }));
    },
  };
}

export const patientProfileRepository =
  config.driver === 'mongo' ? createMongoRepo() : createMemoryRepo();