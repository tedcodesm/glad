// Patient intake submissions.
//
// The four-step intake form used to exist only in the browser, so every completed
// form was discarded on page close. These endpoints persist it and hand back a
// reference the patient can quote to a hospital.
import { patientProfileRepository } from '../repositories/index.js';
import { err, ok, parseBody } from '../utils/http.js';

// Section 1 essentials — the minimum needed to identify a patient at all.
const REQUIRED_PERSONAL = ['first_name', 'last_name', 'date_of_birth', 'gender', 'national_id', 'phone', 'address', 'county'];

/**
 * Consent is checked here rather than in the browser: a form flag is trivially
 * forgeable, so a server that never reads it is not really recording consent.
 */
function consentGiven(consent = {}) {
  return consent.information_accurate === true
    && consent.share_with_hospitals === true
    && consent.accepted_terms === true;
}

export async function submit(req, res) {
  const body = await parseBody(req);

  const missing = REQUIRED_PERSONAL.filter((field) => !body.personal?.[field]?.toString().trim());
  if (missing.length) {
    return err(res, 400, `Missing required field(s): ${missing.join(', ')}`);
  }
  if (!consentGiven(body.consent)) {
    return err(res, 400, 'All three consents (information accuracy, sharing, terms) must be accepted');
  }

  // The full name is derived server-side so the summary cannot drift from the
  // section-1 fields.
  const full_name = `${body.personal.first_name} ${body.personal.last_name}`.trim();

  try {
    const profile = await patientProfileRepository.create(
      { ...body, full_name },
      { patientId: req.user?.id || null },
    );
    ok(res, { profile }, 201);
  } catch (e) {
    err(res, e.status || 500, e.message);
  }
}

export async function lookup(req, res) {
  // Read from req.params rather than a third argument: routes are registered
  // directly, so a 3rd positional parameter would receive the router's `next`.
  const profile = await patientProfileRepository.findByCode(req.params.code);
  if (!profile) return err(res, 404, 'No intake record found for that reference');

  // Deliberately redacted. The reference is a lookup key for hospital staff to
  // confirm at the desk; medical history, mental health and insurance details
  // are reachable only by the signed-in owner via /api/patient-profiles/mine.
  const { medical_history, health_data, insurance, consent, personal, ...rest } = profile;

  ok(res, {
    profile: {
      ...rest,
      personal: {
        first_name: personal?.first_name ?? null,
        last_name: personal?.last_name ?? null,
        county: personal?.county ?? null,
      },
    },
  });
}

export async function mine(req, res) {
  const profile = await patientProfileRepository.findByPatient(req.user.id);
  if (!profile) return err(res, 404, 'No intake record found for this account');
  ok(res, { profile });
}