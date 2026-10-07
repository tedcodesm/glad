import { appointmentRepository, hospitalRepository } from '../repositories/index.js';
import { APPOINTMENT_STATUSES } from '../models/index.js';
import { err, ok, parseBody, parseQuery } from '../utils/http.js';

const VALID_STATUSES = APPOINTMENT_STATUSES;

export async function book(req, res) {
  const body = await parseBody(req);
  const {
    hospital_id, service_id, patient_name, patient_phone,
    patient_email, preferred_date, preferred_time, doctor_name, notes,
  } = body;

  if (!hospital_id) return err(res, 400, 'hospital_id is required');
  if (!service_id) return err(res, 400, 'service_id is required');
  if (!patient_name) return err(res, 400, 'patient_name is required');
  if (!patient_phone) return err(res, 400, 'patient_phone is required');

  const hospital = await hospitalRepository.findById(hospital_id);
  if (!hospital) return err(res, 404, 'Hospital not found');

  // The service must belong to this hospital, not just exist somewhere.
  if (!hospital.services?.some((s) => s.id === service_id)) {
    return err(res, 404, 'Service not found at this hospital');
  }

  const appointment = await appointmentRepository.create({
    patient_id: req.user?.id || null,
    hospital_id,
    service_id,
    patient_name,
    patient_phone,
    patient_email: patient_email || null,
    preferred_date: preferred_date || null,
    preferred_time: preferred_time || null,
    doctor_name: doctor_name || null,
    notes: notes || null,
  });

  ok(res, { appointment }, 201);
}

export async function getOne(req, res) {
  const appointment = await appointmentRepository.findById(req.params.id);
  if (!appointment) return err(res, 404, 'Appointment not found');

  // A patient may only read their own; admins may read any.
  if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
    return err(res, 403, 'Not authorized');
  }
  ok(res, { appointment });
}

export async function myAppointments(req, res) {
  const q = parseQuery(req.url);
  const result = await appointmentRepository.listByPatient(req.user.id, {
    limit: Number(q.limit) || 20,
    offset: Number(q.offset) || 0,
  });
  ok(res, result);
}

export async function hospitalAppointments(req, res) {
  const { id: hospitalId } = req.params;
  const hospital = await hospitalRepository.findById(hospitalId);
  if (!hospital) return err(res, 404, 'Hospital not found');

  if (req.user.role !== 'platform_admin' && hospital.owner_id !== req.user.id) {
    return err(res, 403, 'Not authorized');
  }

  const q = parseQuery(req.url);
  const result = await appointmentRepository.listByHospital(hospitalId, {
    status: q.status,
    limit: Number(q.limit) || 50,
    offset: Number(q.offset) || 0,
  });
  ok(res, result);
}

export async function updateStatus(req, res) {
  const { id } = req.params;
  const appointment = await appointmentRepository.findById(id);
  if (!appointment) return err(res, 404, 'Appointment not found');

  const hospital = await hospitalRepository.findById(appointment.hospital_id);
  if (req.user.role !== 'platform_admin' && hospital?.owner_id !== req.user.id) {
    return err(res, 403, 'Not authorized');
  }

  const body = await parseBody(req);
  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return err(res, 400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  ok(res, { appointment: await appointmentRepository.updateStatus(id, body.status) });
}