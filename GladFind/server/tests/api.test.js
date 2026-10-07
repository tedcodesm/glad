// GlandFind API test suite — node:test, zero test-framework dependencies.
//
// Kept faithful to the original PostgreSQL-era suite so the migration cannot
// silently change behaviour, plus new coverage for the patient intake endpoint.
//
// No blanket between-test reset: the original suite ran sequentially against
// shared state, and a global reset would invalidate tokens minted by earlier
// tests. Instead every test owns a unique identity, so the order does not matter.
import './helpers/env.js'; // must be first — sets env before app.js is evaluated

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { api, signUp, startServer, stopServer } from './helpers/harness.js';

/** Unique email per call, so tests never collide in the shared user collection. */
let seq = 0;
const uniqEmail = (label) => `${label}-${++seq}@test.ke`;

let patientToken;
let hospitalId;
let serviceId;

before(async () => { await startServer(); });
after(async () => { await stopServer(); });

describe('health', () => {
  it('reports the active driver', async () => {
    const r = await api.get('/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ok');
    assert.equal(r.body.driver, 'memory', 'tests must run against the memory driver');
  });
});

describe('reference data', () => {
  it('lists service categories', async () => {
    const r = await api.get('/api/categories');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.categories));
    assert.ok(r.body.categories.some((c) => c.name === 'Cardiology'));
  });

  it('lists insurance providers', async () => {
    const r = await api.get('/api/insurance');
    assert.equal(r.status, 200);
    assert.ok(r.body.providers.some((p) => p.name === 'NHIF'));
  });
});

describe('auth — registration', () => {
  it('creates a patient and hides the password hash', async () => {
    const email = uniqEmail('new');
    const r = await api.post('/api/auth/register', {
      full_name: 'Amina Test', email, password: 'password123', role: 'patient',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.user.email, email);
    assert.equal(r.body.user.password_hash, undefined);
  });

  it('rejects a duplicate email with 409', async () => {
    const email = uniqEmail('dupe');
    const body = { full_name: 'Amina', email, password: 'password123' };
    assert.equal((await api.post('/api/auth/register', body)).status, 201);
    assert.equal((await api.post('/api/auth/register', { ...body, full_name: 'Other' })).status, 409);
  });

  it('rejects a malformed registration with 400', async () => {
    assert.equal((await api.post('/api/auth/register', { email: 'x' })).status, 400);
  });

  it('rejects a short password', async () => {
    const r = await api.post('/api/auth/register', {
      full_name: 'A', email: uniqEmail('short'), password: 'short',
    });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /8 characters/);
  });

  it('refuses to mint a platform_admin', async () => {
    const r = await api.post('/api/auth/register', {
      full_name: 'Sneaky', email: uniqEmail('sneaky'), password: 'password123', role: 'platform_admin',
    });
    assert.equal(r.status, 400, 'self-registration must not be able to escalate privileges');
  });
});

describe('auth — login and /me', () => {
  it('issues a token for valid credentials', async () => {
    const email = uniqEmail('login');
    await api.post('/api/auth/register', { full_name: 'Amina', email, password: 'password123' });

    const r = await api.post('/api/auth/login', { email, password: 'password123' });
    assert.equal(r.status, 200);
    assert.equal(typeof r.body.token, 'string');
    assert.equal(r.body.user.password_hash, undefined);
    patientToken = r.body.token;
  });

  it('rejects a wrong password with 401', async () => {
    const email = uniqEmail('wrongpw');
    await api.post('/api/auth/register', { full_name: 'Amina', email, password: 'password123' });
    assert.equal((await api.post('/api/auth/login', { email, password: 'wrong' })).status, 401);
  });

  it('returns the signed-in user', async () => {
    const r = await api.get('/api/auth/me', { token: patientToken });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.full_name, 'Amina');
  });

  it('rejects /me without a token', async () => {
    assert.equal((await api.get('/api/auth/me')).status, 401);
  });

  it('rejects a forged token', async () => {
    const r = await api.get('/api/auth/me', { token: `${patientToken}tampered` });
    assert.equal(r.status, 401);
  });
});

describe('hospitals — public search', () => {
  it('returns the seeded hospitals with a total', async () => {
    const r = await api.get('/api/hospitals');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.results));
    assert.equal(typeof r.body.total, 'number');
    assert.equal(r.body.total, 6);
  });

  it('searches by service name', async () => {
    const r = await api.get('/api/hospitals?q=Cardiology');
    assert.ok(r.body.total > 0 && r.body.total < 6);
    assert.ok(r.body.results.every((h) => Array.isArray(h.services)));
  });

  it('filters by county', async () => {
    const r = await api.get('/api/hospitals?county=Kiambu');
    assert.equal(r.body.total, 2);
    assert.ok(r.body.results.every((h) => h.county === 'Kiambu'));
  });

  it('filters by insurance provider', async () => {
    const r = await api.get('/api/hospitals?insurance=Linda%20Mama');
    assert.equal(r.body.total, 1, 'only Kenyatta National accepts Linda Mama');
  });

  it('sorts by ascending lowest fee', async () => {
    const r = await api.get('/api/hospitals?sort=fee_asc');
    const fees = r.body.results.map((h) => h.lowest_fee).filter((f) => f != null);
    assert.ok(fees.every((fee, i) => i === 0 || fee >= fees[i - 1]));
  });

  it('ignores an unknown sort value instead of failing', async () => {
    assert.equal((await api.get('/api/hospitals?sort=nonsense')).status, 200);
  });

  it('paginates', async () => {
    const page = await api.get('/api/hospitals?limit=2&offset=2');
    assert.equal(page.body.results.length, 2);
    assert.equal(page.body.total, 6, 'total reflects the whole match, not the page');
  });

  it('filters by fee range', async () => {
    const r = await api.get('/api/hospitals?min_fee=1000&max_fee=2000');
    assert.ok(r.body.results.every((h) => h.lowest_fee >= 1000 && h.lowest_fee <= 2000));
  });
});

describe('hospitals — get by id', () => {
  before(async () => {
    const all = await api.get('/api/hospitals');
    hospitalId = all.body.results[0].id;
    const detail = await api.get(`/api/hospitals/${hospitalId}`);
    serviceId = detail.body.hospital.services[0].id;
  });

  it('returns a hospital with services, insurance and lowest fee', async () => {
    const r = await api.get(`/api/hospitals/${hospitalId}`);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.hospital.services));
    assert.ok(Array.isArray(r.body.hospital.insurance_providers));
    assert.ok(r.body.hospital.lowest_fee != null);
  });

  it('404s on an unknown id', async () => {
    assert.equal((await api.get('/api/hospitals/00000000-0000-0000-0000-000000000000')).status, 404);
  });

  it('404s on a malformed id rather than 500ing', async () => {
    assert.equal((await api.get('/api/hospitals/not-an-object-id')).status, 404);
  });
});

describe('hospitals — registration requires hospital_admin', () => {
  const clinic = (name) => ({
    name, facility_type: 'specialist_clinic',
    county: 'Kiambu', town: 'Limuru', phone: '+254700000000',
    about: 'A demo clinic for testing.', insurance_providers: ['NHIF'],
  });

  it('creates a facility as pending', async () => {
    const admin = await signUp({
      full_name: 'Admin User', email: uniqEmail('admin'), password: 'adminpass1', role: 'hospital_admin',
    });

    const r = await api.post('/api/hospitals', clinic('Test Clinic Limuru'), admin.token);
    assert.equal(r.status, 201);
    assert.equal(r.body.hospital.status, 'pending');
    assert.deepEqual(r.body.hospital.insurance_providers, ['NHIF']);
  });

  it('rejects an unauthenticated request with 401', async () => {
    assert.equal((await api.post('/api/hospitals', clinic('No Auth Clinic'))).status, 401);
  });

  it('rejects a patient with 403', async () => {
    const patient = await signUp({
      full_name: 'Plain Patient', email: uniqEmail('plain'), password: 'password123',
    });
    const r = await api.post('/api/hospitals', clinic('Patient Clinic'), patient.token);
    assert.equal(r.status, 403);
  });

  it('rejects an unknown facility_type', async () => {
    const admin = await signUp({
      full_name: 'Type Admin', email: uniqEmail('type'), password: 'adminpass1', role: 'hospital_admin',
    });
    const r = await api.post('/api/hospitals', { ...clinic('Bad Type'), facility_type: 'shopping_mall' }, admin.token);
    assert.equal(r.status, 400);
  });

  it('drops insurance providers that are not in the catalog', async () => {
    const admin = await signUp({
      full_name: 'Ins Admin', email: uniqEmail('ins'), password: 'adminpass1', role: 'hospital_admin',
    });
    const r = await api.post('/api/hospitals', {
      ...clinic('Ins Clinic'), insurance_providers: ['NHIF', 'Totally Fake Plan'],
    }, admin.token);
    assert.deepEqual(r.body.hospital.insurance_providers, ['NHIF']);
  });

  it('keeps a new facility out of public search until approved', async () => {
    const r = await api.get('/api/hospitals?q=Test%20Clinic%20Limuru');
    assert.equal(r.body.total, 0, 'pending facilities must not be publicly visible');
  });

  it('rejects a service for a hospital the admin does not own', async () => {
    const admin = await signUp({
      full_name: 'Wrong Owner', email: uniqEmail('wrongown'), password: 'adminpass1', role: 'hospital_admin',
    });
    const r = await api.post(`/api/hospitals/${hospitalId}/services`, {
      service_name: 'Cardiology', consultation_fee: 100,
    }, admin.token);
    assert.equal(r.status, 403);
  });
});

describe('appointments — booking is public', () => {
  const booking = () => ({
    hospital_id: hospitalId,
    service_id: serviceId,
    patient_name: 'John Kamau',
    patient_phone: '+254712345678',
    patient_email: 'john@test.ke',
    preferred_date: '2026-09-01',
    notes: 'First consultation',
  });

  it('creates a requested appointment', async () => {
    const r = await api.post('/api/appointments', booking());
    assert.equal(r.status, 201);
    assert.equal(r.body.appointment.status, 'requested');
  });

  it('rejects a booking with missing fields', async () => {
    assert.equal((await api.post('/api/appointments', { hospital_id: hospitalId })).status, 400);
  });

  it('404s on an unknown hospital', async () => {
    const r = await api.post('/api/appointments', {
      ...booking(), hospital_id: '00000000-0000-0000-0000-000000000000',
    });
    assert.equal(r.status, 404);
  });

  it('404s when the service belongs to a different hospital', async () => {
    const other = await api.get('/api/hospitals?county=Kiambu&limit=1');
    const r = await api.post('/api/appointments', { ...booking(), hospital_id: other.body.results[0].id });
    assert.equal(r.status, 404, 'a service_id from another hospital must not be accepted');
  });

  it('links the booking to the account when a token is supplied', async () => {
    const patient = await signUp({
      full_name: 'Booker', email: uniqEmail('booker'), password: 'password123',
    });

    const r = await api.post('/api/appointments', booking(), patient.token);
    assert.equal(r.status, 201);
    assert.ok(r.body.appointment.patient_id, 'a valid token should link the booking');

    const mine = await api.get('/api/appointments/mine', { token: patient.token });
    assert.equal(mine.status, 200);
    assert.equal(mine.body.total, 1);
  });

  it('treats an invalid token as a guest booking rather than 401', async () => {
    const r = await api.post('/api/appointments', booking(), 'garbage.token.value');
    assert.equal(r.status, 201);
    assert.equal(r.body.appointment.patient_id, null);
  });

  it("lists a patient's own appointments", async () => {
    const patient = await signUp({
      full_name: 'Viewer', email: uniqEmail('viewer'), password: 'password123',
    });
    const r = await api.get('/api/appointments/mine', { token: patient.token });
    assert.equal(r.status, 200);
    assert.equal(r.body.total, 0, 'a fresh account has no appointments');
  });

  it("stops one patient reading another patient's appointment", async () => {
    const owner = await signUp({ full_name: 'Owner', email: uniqEmail('owner'), password: 'password123' });
    const other = await signUp({ full_name: 'Other', email: uniqEmail('other'), password: 'password123' });

    const booked = await api.post('/api/appointments', booking(), owner.token);
    assert.equal(booked.status, 201);

    const r = await api.get(`/api/appointments/${booked.body.appointment.id}`, { token: other.token });
    assert.equal(r.status, 403);
  });

  it("lets a patient read their own appointment", async () => {
    const owner = await signUp({ full_name: 'Self', email: uniqEmail('self'), password: 'password123' });
    const booked = await api.post('/api/appointments', booking(), owner.token);

    const r = await api.get(`/api/appointments/${booked.body.appointment.id}`, { token: owner.token });
    assert.equal(r.status, 200);
  });
});

describe('appointments — status updates respect ownership', () => {
  /** Create a clinic owned by `token`, with one service on it. */
  async function ownedClinic(token, name) {
    const clinic = await api.post('/api/hospitals', {
      name, facility_type: 'specialist_clinic', county: 'Nairobi', town: 'Westlands',
    }, token);
    assert.equal(clinic.status, 201);

    const service = await api.post(`/api/hospitals/${clinic.body.hospital.id}/services`, {
      service_name: 'Cardiology', consultation_fee: 1000,
    }, token);
    assert.equal(service.status, 201);

    return { hospitalId: clinic.body.hospital.id, serviceId: service.body.service.id };
  }

  it('403s an admin trying to update a hospital they do not own', async () => {
    const admin = await signUp({
      full_name: 'Not Owner', email: uniqEmail('notowner'), password: 'adminpass1', role: 'hospital_admin',
    });

    const booked = await api.post('/api/appointments', {
      hospital_id: hospitalId, service_id: serviceId,
      patient_name: 'John', patient_phone: '+254700000000',
    });
    assert.equal(booked.status, 201);

    const r = await api.patch(`/api/appointments/${booked.body.appointment.id}/status`, { status: 'confirmed' }, admin.token);
    assert.equal(r.status, 403, 'ownership must be enforced, not just the role');
  });

  it('lets the owning hospital admin confirm it', async () => {
    const admin = await signUp({
      full_name: 'Owner Admin', email: uniqEmail('ownadmin'), password: 'adminpass1', role: 'hospital_admin',
    });
    const clinic = await ownedClinic(admin.token, 'Owned Clinic');

    const booked = await api.post('/api/appointments', {
      hospital_id: clinic.hospitalId, service_id: clinic.serviceId,
      patient_name: 'Jane', patient_phone: '+254700000000',
    });
    assert.equal(booked.status, 201);

    const confirmed = await api.patch(`/api/appointments/${booked.body.appointment.id}/status`, { status: 'confirmed' }, admin.token);
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.appointment.status, 'confirmed');
  });

  it('validates the requested status', async () => {
    const admin = await signUp({
      full_name: 'Status Admin', email: uniqEmail('statusadmin'), password: 'adminpass1', role: 'hospital_admin',
    });
    const clinic = await ownedClinic(admin.token, 'Status Clinic');

    const booked = await api.post('/api/appointments', {
      hospital_id: clinic.hospitalId, service_id: clinic.serviceId,
      patient_name: 'Jane', patient_phone: '+254700000000',
    });

    const r = await api.patch(`/api/appointments/${booked.body.appointment.id}/status`, { status: 'flying' }, admin.token);
    assert.equal(r.status, 400);
  });

  it('lists appointments for an owned hospital', async () => {
    const admin = await signUp({
      full_name: 'List Admin', email: uniqEmail('listadmin'), password: 'adminpass1', role: 'hospital_admin',
    });
    const clinic = await ownedClinic(admin.token, 'List Clinic');

    await api.post('/api/appointments', {
      hospital_id: clinic.hospitalId, service_id: clinic.serviceId,
      patient_name: 'Kato', patient_phone: '+254700000000',
    });

    const r = await api.get(`/api/hospitals/${clinic.hospitalId}/appointments`, { token: admin.token });
    assert.equal(r.status, 200);
    assert.equal(r.body.total, 1);

    const filtered = await api.get(`/api/hospitals/${clinic.hospitalId}/appointments?status=confirmed`, { token: admin.token });
    assert.equal(filtered.body.total, 0, 'status filter applies');
  });

  it('403s listing appointments for a hospital the admin does not own', async () => {
    const admin = await signUp({
      full_name: 'Stranger', email: uniqEmail('stranger'), password: 'adminpass1', role: 'hospital_admin',
    });
    assert.equal((await api.get(`/api/hospitals/${hospitalId}/appointments`, { token: admin.token })).status, 403);
  });
});

describe('patient intake', () => {
  const intake = () => ({
    personal: {
      first_name: 'Grace', last_name: 'Wanjiku', date_of_birth: '1990-05-01',
      gender: 'Female', national_id: '29876543', phone: '+254700000000',
      address: 'Ngong Road', county: 'Nairobi',
    },
    medical_history: { conditions: ['Diabetes Type 2'] },
    health_data: { weight_kg: 64, blood_group: 'O+' },
    insurance: { providers: ['NHIF'], policy_numbers: { NHIF: 'X99' } },
    consent: { information_accurate: true, share_with_hospitals: true, accepted_terms: true },
  });

  it('persists a guest submission and returns a reference', async () => {
    const r = await api.post('/api/patient-profiles', intake());
    assert.equal(r.status, 201);
    assert.match(r.body.profile.profile_code, /^GF-[A-Z0-9]{8}$/);
    assert.equal(r.body.profile.full_name, 'Grace Wanjiku', 'name is derived server-side');
  });

  it('requires the section-1 essentials', async () => {
    const r = await api.post('/api/patient-profiles', { personal: { first_name: 'Grace' } });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /Missing required field/);
  });

  it('refuses a submission without full consent', async () => {
    const r = await api.post('/api/patient-profiles', {
      ...intake(), consent: { information_accurate: true, share_with_hospitals: false, accepted_terms: true },
    });
    assert.equal(r.status, 400, 'consent must be enforced server-side');
  });

  it('returns a redacted summary for a public reference lookup', async () => {
    const created = await api.post('/api/patient-profiles', intake());
    assert.equal(created.status, 201);

    const r = await api.get(`/api/patient-profiles/${created.body.profile.profile_code}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.profile.personal.last_name, 'Wanjiku');
    assert.equal(r.body.profile.medical_history, undefined, 'medical history must not be public');
    assert.equal(r.body.profile.health_data, undefined);
    assert.equal(r.body.profile.insurance, undefined);
    assert.equal(r.body.profile.personal.national_id, undefined, 'national ID must not be public');
  });

  it('404s an unknown reference', async () => {
    assert.equal((await api.get('/api/patient-profiles/GF-NOTREAL1')).status, 404);
  });

  it('gives the owner their full record via /mine', async () => {
    const patient = await signUp({
      full_name: 'Grace W', email: uniqEmail('grace'), password: 'password123',
    });
    await api.post('/api/patient-profiles', intake(), patient.token);

    const r = await api.get('/api/patient-profiles/mine', { token: patient.token });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.profile.medical_history.conditions, ['Diabetes Type 2']);
    assert.equal(r.body.profile.health_data.weight_kg, 64);
  });

  it('requires auth for /mine', async () => {
    assert.equal((await api.get('/api/patient-profiles/mine')).status, 401);
  });

  it('replaces rather than duplicates on re-submission', async () => {
    const patient = await signUp({
      full_name: 'Grace W', email: uniqEmail('regrace'), password: 'password123',
    });

    await api.post('/api/patient-profiles', intake(), patient.token);
    const second = await api.post('/api/patient-profiles', {
      ...intake(), health_data: { weight_kg: 70 },
    }, patient.token);
    assert.equal(second.status, 201);

    const mine = await api.get('/api/patient-profiles/mine', { token: patient.token });
    assert.equal(mine.body.profile.id, second.body.profile.id, 'same profile should be updated');
    assert.equal(mine.body.profile.health_data.weight_kg, 70);
  });

  it('does not let a client forge its reference', async () => {
    const r = await api.post('/api/patient-profiles', { ...intake(), profile_code: 'GF-FORGED!!' });
    assert.equal(r.status, 201);
    assert.notEqual(r.body.profile.profile_code, 'GF-FORGED!!');
  });
});

describe('misc', () => {
  it('404s an unknown route', async () => {
    const r = await api.get('/api/nonexistent');
    assert.equal(r.status, 404);
    assert.equal(r.body.success, false);
  });

  it('rejects malformed JSON with 400', async () => {
    const { getBaseUrl } = await import('./helpers/harness.js');
    const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    assert.equal(res.status, 400);
  });

  it('answers CORS preflight for the dev origin', async () => {
    const { getBaseUrl } = await import('./helpers/harness.js');
    const res = await fetch(`${getBaseUrl()}/api/hospitals`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  it('does not echo an untrusted origin', async () => {
    const { getBaseUrl } = await import('./helpers/harness.js');
    const res = await fetch(`${getBaseUrl()}/api/hospitals`, {
      headers: { Origin: 'http://evil.example' },
    });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });
});