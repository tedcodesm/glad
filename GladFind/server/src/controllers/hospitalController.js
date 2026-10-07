import { hospitalRepository } from '../repositories/index.js';
import { err, ok, parseBody, parseQuery } from '../utils/http.js';

const VALID_TYPES = ['public_hospital', 'private_hospital', 'specialist_clinic', 'teaching_hospital'];
const VALID_SORTS = ['relevance', 'fee_asc', 'rating'];

const UPDATABLE = [
  'name', 'facility_type', 'county', 'town', 'address_line', 'latitude', 'longitude',
  'phone', 'email', 'about', 'bed_capacity', 'specialist_count',
  'accepts_walk_ins', 'supports_booking', 'is_open',
];

export async function search(req, res) {
  const q = parseQuery(req.url);

  const result = await hospitalRepository.search({
    q: q.q,
    county: q.county,
    town: q.town,
    insurance: q.insurance,
    min_fee: q.min_fee != null ? Number(q.min_fee) : null,
    max_fee: q.max_fee != null ? Number(q.max_fee) : null,
    facility_type: q.facility_type,
    open_only: q.open_only,
    sort: VALID_SORTS.includes(q.sort) ? q.sort : 'relevance',
    limit: Math.min(Number(q.limit) || 20, 100),
    offset: Number(q.offset) || 0,
  });

  ok(res, result);
}

export async function getOne(req, res) {
  const hospital = await hospitalRepository.findById(req.params.id);
  if (!hospital) return err(res, 404, 'Hospital not found');
  ok(res, { hospital });
}

export async function create(req, res) {
  const body = await parseBody(req);

  for (const field of ['name', 'facility_type', 'county', 'town']) {
    if (!body[field]) return err(res, 400, `Missing required field: ${field}`);
  }
  if (!VALID_TYPES.includes(body.facility_type)) {
    return err(res, 400, `facility_type must be one of: ${VALID_TYPES.join(', ')}`);
  }

  const hospital = await hospitalRepository.create(body, req.user?.id);
  ok(res, { hospital }, 201);
}

export async function update(req, res) {
  const { id } = req.params;
  const existing = await hospitalRepository.findById(id);
  if (!existing) return err(res, 404, 'Hospital not found');

  // Ownership is checked against the hospital, not the route param.
  if (req.user.role !== 'platform_admin' && existing.owner_id !== req.user.id) {
    return err(res, 403, 'Not authorized to update this hospital');
  }

  const body = await parseBody(req);
  const updates = Object.fromEntries(UPDATABLE.filter((key) => key in body).map((key) => [key, body[key]]));

  const hospital = await hospitalRepository.update(id, updates);
  ok(res, { hospital });
}

export async function addService(req, res) {
  const { id } = req.params;
  const hospital = await hospitalRepository.findById(id);
  if (!hospital) return err(res, 404, 'Hospital not found');

  if (req.user.role !== 'platform_admin' && hospital.owner_id !== req.user.id) {
    return err(res, 403, 'Not authorized');
  }

  const body = await parseBody(req);
  if (!body.service_name) return err(res, 400, 'service_name is required');
  // 0 is a legitimate (free clinic) fee, so only reject absent values.
  if (body.consultation_fee == null || body.consultation_fee === '') {
    return err(res, 400, 'consultation_fee is required');
  }

  try {
    const service = await hospitalRepository.addService(id, body);
    ok(res, { service }, 201);
  } catch (e) {
    err(res, e.status || 500, e.message);
  }
}

export async function listCategories(req, res) {
  ok(res, { categories: await hospitalRepository.listCategories() });
}

export async function listInsurance(req, res) {
  ok(res, { providers: await hospitalRepository.listInsuranceProviders() });
}