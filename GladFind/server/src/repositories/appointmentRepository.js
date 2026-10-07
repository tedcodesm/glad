// Appointment data access — two drivers behind one interface.
import { config } from '../config/env.js';
import * as store from '../config/memoryStore.js';
import { Appointment } from '../models/index.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Normalise every id to a string. The mongo driver returns ObjectIds, and the
 * controllers compare `patient_id` directly against the id inside the JWT.
 */
function shape(row) {
  if (!row) return null;
  const { _id, id, patient_id, hospital_id, service_id, ...rest } = row;
  return {
    ...rest,
    id: String(id ?? _id),
    patient_id: patient_id == null ? null : String(patient_id),
    hospital_id: hospital_id == null ? null : String(hospital_id),
    service_id: service_id == null ? null : String(service_id),
  };
}

function paging({ limit = DEFAULT_LIMIT, offset = 0 }) {
  return {
    limit: Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT),
    offset: Math.max(Number(offset) || 0, 0),
  };
}

function createMemoryRepo() {
  return {
    async create(data) {
      const appt = {
        id: store.uuid(),
        patient_id: data.patient_id || null,
        hospital_id: data.hospital_id,
        service_id: data.service_id,
        patient_name: data.patient_name,
        patient_phone: data.patient_phone,
        patient_email: data.patient_email || null,
        preferred_date: data.preferred_date || null,
        preferred_time: data.preferred_time || null,
        doctor_name: data.doctor_name || null,
        notes: data.notes || null,
        status: 'requested',
        created_at: new Date(),
        updated_at: new Date(),
      };
      store.appointments.push(appt);
      return appt;
    },

    async findById(id) {
      return store.appointments.find((a) => a.id === id) || null;
    },

    async listByHospital(hospitalId, { status, limit, offset } = {}) {
      const { limit: take, offset: skip } = paging({ limit, offset });

      let list = store.appointments.filter((a) => a.hospital_id === hospitalId);
      if (status) list = list.filter((a) => a.status === status);
      list.sort((a, b) => b.created_at - a.created_at);

      return { total: list.length, results: list.slice(skip, skip + take) };
    },

    async listByPatient(patientId, { limit, offset } = {}) {
      const { limit: take, offset: skip } = paging({ limit, offset });

      const list = store.appointments
        .filter((a) => a.patient_id === patientId)
        .sort((a, b) => b.created_at - a.created_at);

      return { total: list.length, results: list.slice(skip, skip + take) };
    },

    async updateStatus(id, status) {
      const appt = store.appointments.find((a) => a.id === id);
      if (!appt) return null;
      appt.status = status;
      appt.updated_at = new Date();
      return appt;
    },
  };
}

function createMongoRepo() {
  /** An invalid id string is a miss, not a server error. */
  async function findLeanById(id) {
    try {
      return await Appointment.findById(id).lean();
    } catch {
      return null;
    }
  }

  /**
   * `total` and the page come from one query using `$facet`, avoiding the
   * COUNT-then-FETCH race and the extra round trip of two separate calls.
   */
  async function listWithTotal(filter, { limit, offset }) {
    const { limit: take, offset: skip } = paging({ limit, offset });

    const [result] = await Appointment.aggregate([
      { $match: filter },
      { $sort: { created_at: -1, _id: -1 } },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: take }],
          count: [{ $count: 'value' }],
        },
      },
    ]);

    return { total: result?.count?.[0]?.value ?? 0, results: (result?.rows ?? []).map(shape) };
  }

  return {
    async create(data) {
      const appt = await Appointment.create({
        patient_id: data.patient_id || null,
        hospital_id: data.hospital_id,
        service_id: data.service_id,
        patient_name: data.patient_name,
        patient_phone: data.patient_phone,
        patient_email: data.patient_email || null,
        preferred_date: data.preferred_date || null,
        preferred_time: data.preferred_time || null,
        doctor_name: data.doctor_name || null,
        notes: data.notes || null,
        status: 'requested',
      });
      return shape(appt.toObject());
    },

    async findById(id) {
      return shape(await findLeanById(id));
    },

    async listByHospital(hospitalId, params = {}) {
      const filter = { hospital_id: hospitalId };
      if (params.status) filter.status = params.status;
      return listWithTotal(filter, params);
    },

    async listByPatient(patientId, params = {}) {
      return listWithTotal({ patient_id: patientId }, params);
    },

    async updateStatus(id, status) {
      let updated;
      try {
        updated = await Appointment.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
      } catch {
        return null;
      }
      return shape(updated);
    },
  };
}

export const appointmentRepository =
  config.driver === 'mongo' ? createMongoRepo() : createMemoryRepo();