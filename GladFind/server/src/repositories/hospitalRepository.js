// Hospital data access — two drivers behind one interface.
//
//   memory — arrays from config/memoryStore.js (demo mode, no database)
//   mongo  — Mongoose models (DATA_DRIVER=mongo)
import { config } from '../config/env.js';
import * as store from '../config/memoryStore.js';
import { Hospital, HospitalService, InsuranceProvider, ServiceCategory } from '../models/index.js';
import { escapeRegex, toArray } from './helpers.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Sort specs applied after fee filtering, so `total` and the page agree. */
const SORTS = {
  relevance: { is_verified: -1, rating: -1 },
  fee_asc: { _has_fee: -1, lowest_fee: 1 },
  rating: { rating: -1 },
};

const HOSPITAL_WRITABLE = [
  'name', 'facility_type', 'county', 'town', 'address_line', 'latitude', 'longitude',
  'phone', 'email', 'about', 'bed_capacity', 'specialist_count',
  'accepts_walk_ins', 'supports_booking', 'is_open',
];

/**
 * Attach the derived fields the client renders: active services, lowest fee and
 * the accepted insurance list. Both drivers funnel through here so responses
 * are byte-for-byte identical regardless of DATA_DRIVER.
 */
function enrich(hospital, services, insurance) {
  const fees = services.map((s) => Number(s.consultation_fee));
  return {
    ...hospital,
    // Controllers compare owner_id against the string id inside the JWT, so the
    // Mongo ObjectId has to be stringified here rather than at the edge.
    owner_id: hospital.owner_id == null ? null : String(hospital.owner_id),
    services: services.map((s) => ({
      id: String(s.id ?? s._id),
      name: s.service_name,
      fee: Number(s.consultation_fee),
      fee_label: s.fee_label,
      currency: s.currency,
      doctors: s.doctors ?? [],
    })),
    insurance_providers: insurance,
    lowest_fee: fees.length ? Math.min(...fees) : null,
  };
}

function pick(source, keys) {
  return Object.fromEntries(keys.filter((k) => k in source).map((k) => [k, source[k]]));
}

// =======================================================================
// MEMORY DRIVER
// =======================================================================
function createMemoryRepo() {
  const activeServices = (hospitalId) =>
    store.hospitalServices.filter((s) => s.hospital_id === hospitalId && s.is_active);

  const enrichHospital = (h) => enrich(h, activeServices(h.id), h.insurance_providers ?? []);

  return {
    async search({ q, county, town, insurance, min_fee, max_fee, facility_type, open_only, sort = 'relevance', limit = DEFAULT_LIMIT, offset = 0 }) {
      const insFilters = toArray(insurance).map((s) => s.toLowerCase());

      let list = store.hospitals
        .filter((h) => {
          if (h.status !== 'approved') return false;
          if (county && h.county.toLowerCase() !== county.toLowerCase()) return false;
          if (town && !h.town.toLowerCase().includes(town.toLowerCase())) return false;
          if (facility_type && h.facility_type !== facility_type) return false;
          if (open_only === 'true' && !h.is_open) return false;
          if (insFilters.length) {
            const held = (h.insurance_providers ?? []).map((p) => p.toLowerCase());
            if (!insFilters.some((i) => held.includes(i))) return false;
          }
          if (q) {
            const needle = q.toLowerCase();
            const inName = h.name.toLowerCase().includes(needle);
            const inServices = activeServices(h.id).some((s) => s.service_name.toLowerCase().includes(needle));
            if (!inName && !inServices) return false;
          }
          return true;
        })
        .map(enrichHospital);

      if (min_fee != null) list = list.filter((h) => h.lowest_fee != null && h.lowest_fee >= Number(min_fee));
      if (max_fee != null) list = list.filter((h) => h.lowest_fee != null && h.lowest_fee <= Number(max_fee));

      if (sort === 'fee_asc') list.sort((a, b) => (a.lowest_fee ?? Infinity) - (b.lowest_fee ?? Infinity));
      else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
      else list.sort((a, b) => Number(b.is_verified) - Number(a.is_verified) || b.rating - a.rating);

      const from = Number(offset);
      return { total: list.length, results: list.slice(from, from + Number(limit)) };
    },

    async findById(id) {
      const hospital = store.hospitals.find((h) => h.id === id);
      return hospital ? enrichHospital(hospital) : null;
    },

    async create(data, ownerId) {
      const hospital = {
        id: store.uuid(),
        owner_id: ownerId || null,
        ...pick(data, HOSPITAL_WRITABLE),
        name: data.name,
        facility_type: data.facility_type,
        county: data.county,
        town: data.town,
        is_open: true,
        is_verified: false,
        rating: 0,
        review_count: 0,
        status: 'pending',
        insurance_providers: [],
        created_at: new Date(),
        updated_at: new Date(),
      };
      store.hospitals.push(hospital);
      if (data.insurance_providers) await this.setInsurance(hospital.id, data.insurance_providers);
      return enrichHospital(hospital);
    },

    async update(id, data) {
      const hospital = store.hospitals.find((h) => h.id === id);
      if (!hospital) return null;
      Object.assign(hospital, pick(data, HOSPITAL_WRITABLE), { updated_at: new Date() });
      return enrichHospital(hospital);
    },

    async setInsurance(hospitalId, names) {
      const hospital = store.hospitals.find((h) => h.id === hospitalId);
      if (!hospital) return;
      const known = new Set(store.insuranceProviders.map((p) => p.name.toLowerCase()));
      hospital.insurance_providers = toArray(names).filter((n) => known.has(n.toLowerCase()));
    },

    async addService(hospitalId, data) {
      const category =
        store.serviceCategories.find((c) => c.id === data.category_id) ||
        store.serviceCategories.find((c) => c.name === data.service_name);

      if (!category) {
        throw Object.assign(new Error(`Unknown service category: ${data.service_name}`), { status: 400 });
      }

      const service = {
        id: store.uuid(),
        hospital_id: hospitalId,
        category_id: category.id,
        service_name: data.service_name,
        description: data.description ?? null,
        consultation_fee: Number(data.consultation_fee),
        fee_label: data.fee_label || 'Consultation fee',
        currency: data.currency || 'KES',
        is_active: true,
        doctors: data.doctors ?? [],
        created_at: new Date(),
        updated_at: new Date(),
      };
      store.hospitalServices.push(service);
      return service;
    },

    async listCategories() {
      return store.serviceCategories;
    },

    async listInsuranceProviders() {
      return store.insuranceProviders;
    },
  };
}

// =======================================================================
// MONGO DRIVER
// =======================================================================
function createMongoRepo() {
  /**
   * Stages shared by the paged search and its `total` count. The `$lookup`
   * resolves a hospital's active services in one round trip; `$min` over that
   * array gives the lowest fee, which is then filterable *before* pagination.
   */
  function searchStages(params) {
    const match = { status: 'approved' };

    if (params.county) match.county = new RegExp(`^${escapeRegex(params.county)}$`, 'i');
    if (params.town) match.town = new RegExp(escapeRegex(params.town), 'i');
    if (params.facility_type) match.facility_type = params.facility_type;
    if (openOnly(params.open_only)) match.is_open = true;

    const insNames = toArray(params.insurance);
    if (insNames.length) {
      match.insurance_providers = { $in: insNames.map((n) => new RegExp(`^${escapeRegex(n)}$`, 'i')) };
    }

    const stages = [{ $match: match }];

    stages.push({
      $lookup: {
        from: 'hospital_services',
        let: { hid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ['$hospital_id', '$$hid'] }, { $eq: ['$is_active', true] }] },
            },
          },
        ],
        as: 'services',
      },
    });

    // Free-text search spans the hospital name and the services it offers.
    if (params.q) {
      const pattern = new RegExp(escapeRegex(params.q), 'i');
      stages.push({ $match: { $or: [{ name: pattern }, { 'services.service_name': pattern }] } });
    }

    stages.push({ $addFields: { lowest_fee: { $min: '$services.consultation_fee' } } });

    if (params.min_fee != null || params.max_fee != null) {
      const range = {};
      if (params.min_fee != null) range.$gte = Number(params.min_fee);
      if (params.max_fee != null) range.$lte = Number(params.max_fee);
      stages.push({ $match: { lowest_fee: range } });
    }

    // Sorting by fee must place hospitals that offer no services last, not first.
    stages.push({ $addFields: { _has_fee: { $cond: [{ $eq: ['$lowest_fee', null] }, 0, 1] } } });

    return stages;
  }

  async function shape(rows) {
    return rows.map((row) => {
      const { _id, services, lowest_fee: _l, _has_fee: _h, ...rest } = row;
      return enrich({ ...rest, id: String(_id) }, services, rest.insurance_providers ?? []);
    });
  }

  /** Single document already loaded — fetch its services separately. */
  async function shapeOne(hospital) {
    const { _id, ...rest } = hospital;
    const services = await HospitalService.find({ hospital_id: _id, is_active: true }).lean();
    return enrich({ ...rest, id: String(_id) }, services, hospital.insurance_providers ?? []);
  }

  /** Mongoose throws CastError on a malformed id; callers treat that as "not found". */
  async function findLeanById(id) {
    try {
      return await Hospital.findById(id).lean();
    } catch {
      return null;
    }
  }

  return {
    async search(params) {
      const limit = Math.min(Number(params.limit) || DEFAULT_LIMIT, MAX_LIMIT);
      const offset = Number(params.offset) || 0;
      const order = SORTS[params.sort] ?? SORTS.relevance;

      const base = searchStages(params);

      const [countRows, pageRows] = await Promise.all([
        Hospital.aggregate([...base, { $count: 'total' }]),
        Hospital.aggregate([...base, { $sort: order }, { $skip: offset }, { $limit: limit }]),
      ]);

      return { total: countRows[0]?.total ?? 0, results: await shape(pageRows) };
    },

    async findById(id) {
      // Deliberately unfiltered: owners and platform admins must be able to load
      // a facility that is still `pending`.
      const hospital = await findLeanById(id);
      return hospital ? shapeOne(hospital) : null;
    },

    async create(data, ownerId) {
      const hospital = await Hospital.create({
        ...pick(data, HOSPITAL_WRITABLE),
        owner_id: ownerId || null,
        status: 'pending',
        insurance_providers: await resolveInsurance(data.insurance_providers),
      });
      return shapeOne(hospital.toObject());
    },

    async update(id, data) {
      const update = pick(data, HOSPITAL_WRITABLE);
      if (data.insurance_providers) {
        update.insurance_providers = await resolveInsurance(data.insurance_providers);
      }
      const updated = await findLeanByIdAndUpdate(id, update);
      return updated ? shapeOne(updated) : null;
    },

    async setInsurance(hospitalId, names) {
      await Hospital.findByIdAndUpdate(hospitalId, {
        $set: { insurance_providers: await resolveInsurance(names) },
      });
    },

    async addService(hospitalId, data) {
      const category =
        (data.category_id && (await ServiceCategory.findById(data.category_id).lean()).catch(() => null)) ||
        (await ServiceCategory.findOne({ name: data.service_name }).lean());

      if (!category) {
        throw Object.assign(new Error(`Unknown service category: ${data.service_name}`), { status: 400 });
      }

      const service = await HospitalService.create({
        hospital_id: hospitalId,
        category_id: category._id,
        service_name: data.service_name,
        description: data.description ?? null,
        consultation_fee: Number(data.consultation_fee),
        fee_label: data.fee_label || 'Consultation fee',
        currency: data.currency || 'KES',
        doctors: data.doctors ?? [],
      });
      return service.toObject();
    },

    async listCategories() {
      const rows = await ServiceCategory.find().sort({ name: 1 }).lean();
      return rows.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug }));
    },

    async listInsuranceProviders() {
      const rows = await InsuranceProvider.find().sort({ name: 1 }).lean();
      return rows.map((p) => ({ id: String(p._id), name: p.name }));
    },
  };

  /** Only providers that exist in the catalog are accepted — mirrors the memory driver. */
  async function resolveInsurance(names) {
    const requested = toArray(names);
    if (!requested.length) return [];
    const known = (await InsuranceProvider.find().lean()).map((p) => p.name.toLowerCase());
    return requested.filter((n) => known.includes(n.toLowerCase()));
  }

  async function findLeanByIdAndUpdate(id, update) {
    try {
      return await Hospital.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
    } catch {
      return null;
    }
  }
}

function openOnly(value) {
  return value === true || value === 'true';
}

export const hospitalRepository = config.driver === 'mongo' ? createMongoRepo() : createMemoryRepo();