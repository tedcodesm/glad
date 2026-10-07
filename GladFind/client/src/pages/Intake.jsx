import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Api } from '../lib/api.js';
import { Alert, Badge, Field, Spinner } from '../components/ui.jsx';
import {
  ArrowRightIcon, BuildingIcon, CheckIcon, CloseIcon, DocumentIcon, LockIcon, SuccessRing,
} from '../components/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const STEPS = [
  { id: 1, label: 'Personal' },
  { id: 2, label: 'Medical history' },
  { id: 3, label: 'Health data' },
  { id: 4, label: 'Insurance & consent' },
];

const COUNTY_HINT = 'For example: Nairobi, Mombasa, Kiambu, Kisumu';

/** Blank shape mirrors the PatientProfile schema so the payload is complete. */
function emptyForm() {
  return {
    personal: {
      first_name: '', last_name: '', date_of_birth: '', gender: '', national_id: '',
      nationality: 'Kenyan', phone: '', email: '', address: '', county: '',
      marital_status: '',
      emergency_contact: { name: '', relationship: '', phone: '', email: '' },
    },
    medical_history: {
      conditions: [], diagnosis_date: '', referring_doctor: '', diagnosis_stage: '',
      symptoms: '', surgeries: [], family_history: '', allergies: [], medications: [],
      smoking: '', alcohol: '', exercise: '',
    },
    health_data: {
      weight_kg: '', height_cm: '', blood_pressure: '', blood_sugar: '', blood_group: '',
      disability: '', pregnancy_status: '', children: '', contraception: '',
      mental_conditions: [], mental_notes: '', services_needed: [], additional_notes: '',
    },
    insurance: {
      providers: [], policy_numbers: {}, employer: '', expiry_date: '',
      covers: [], annual_limit: '', notes: '',
    },
    consent: { information_accurate: false, share_with_hospitals: false, accepted_terms: false },
  };
}

const REQUIRED = {
  1: [
    ['first_name', 'First name'], ['last_name', 'Last name'],
    ['date_of_birth', 'Date of birth'], ['gender', 'Gender'],
    ['national_id', 'National ID'], ['phone', 'Phone'],
    ['address', 'Address'], ['county', 'County'],
  ],
};

export default function Intake() {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  function set(section, key, value) {
    setForm((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
    setErrors((current) => {
      if (!current[`${section}.${key}`]) return current;
      const next = { ...current };
      delete next[`${section}.${key}`];
      return next;
    });
  }

  function setEmergency(key, value) {
    setForm((current) => ({
      ...current,
      personal: {
        ...current.personal,
        emergency_contact: { ...current.personal.emergency_contact, [key]: value },
      },
    }));
  }

  function validate(target) {
    const found = {};
    for (const [key, label] of REQUIRED[target] ?? []) {
      if (!String(form.personal[key] ?? '').trim()) {
        found[`personal.${key}`] = `${label} is required`;
      }
    }
    if (target === 4) {
      const { information_accurate: a, share_with_hospitals: s, accepted_terms: t } = form.consent;
      if (!a || !s || !t) found.consent = 'Please accept all three statements to continue';
    }
    return found;
  }

  function next() {
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error('Please complete the highlighted fields');
      return;
    }
    setStep((s) => Math.min(STEPS.length, s + 1));
  }

  async function submit(event) {
    event.preventDefault();
    const found = validate(4);
    if (Object.keys(found).length) {
      setErrors(found);
      toast.error('Please accept all three statements to continue');
      return;
    }

    setSubmitting(true);
    try {
      const profile = await Api.submitIntake(form);
      setSubmitted(profile);
      toast.success('Intake record submitted');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return <ReferenceCard profile={submitted} />;

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Patient intake</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-navy/60">
          Four short sections. Your answers are stored securely and shared only with hospitals
          you choose. {!isAuthenticated && 'You can submit as a guest and get a reference code.'}
        </p>
      </header>

      <ol className="mb-8 flex flex-wrap gap-2" aria-label="Progress">
        {STEPS.map((item) => {
          const state = item.id < step ? 'done' : item.id === step ? 'current' : 'todo';
          return (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => item.id <= step && setStep(item.id)}
                disabled={item.id > step}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  state === 'current' ? 'bg-brand-500 text-white'
                    : state === 'done' ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                      : 'bg-white text-navy/40'
                }`}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-xs">
                  {state === 'done' ? <CheckIcon className="h-3 w-3" /> : item.id}
                </span>
                {item.label}
              </button>
              {item.id < STEPS.length && (
                <ArrowRightIcon className="h-4 w-4 text-navy/20" />
              )}
            </li>
          );
        })}
      </ol>

      <form onSubmit={submit} className="grid gap-7 lg:grid-cols-[1fr_300px]">
        <div className="card p-7">
          {step === 1 && (
            <section className="space-y-5">
              <SectionTitle title="Personal information" hint="Required fields are marked with *" />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name *" error={errors['personal.first_name']} htmlFor="first_name">
                  <input id="first_name" className="field-input" value={form.personal.first_name}
                    onChange={(e) => set('personal', 'first_name', e.target.value)} autoComplete="given-name" />
                </Field>
                <Field label="Last name *" error={errors['personal.last_name']} htmlFor="last_name">
                  <input id="last_name" className="field-input" value={form.personal.last_name}
                    onChange={(e) => set('personal', 'last_name', e.target.value)} autoComplete="family-name" />
                </Field>
                <Field label="Date of birth *" error={errors['personal.date_of_birth']} htmlFor="dob">
                  <input id="dob" type="date" className="field-input" value={form.personal.date_of_birth}
                    onChange={(e) => set('personal', 'date_of_birth', e.target.value)} />
                </Field>
                <Field label="Gender *" error={errors['personal.gender']} htmlFor="gender">
                  <select id="gender" className="field-input" value={form.personal.gender}
                    onChange={(e) => set('personal', 'gender', e.target.value)}>
                    <option value="">Select…</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </Field>
                <Field label="National ID *" error={errors['personal.national_id']} htmlFor="nid"
                  hint="Stored uppercase, e.g. 12345678">
                  <input id="nid" className="field-input uppercase" value={form.personal.national_id}
                    onChange={(e) => set('personal', 'national_id', e.target.value)} />
                </Field>
                <Field label="Nationality" htmlFor="nationality">
                  <input id="nationality" className="field-input" value={form.personal.nationality}
                    onChange={(e) => set('personal', 'nationality', e.target.value)} />
                </Field>
                <Field label="Phone *" error={errors['personal.phone']} htmlFor="phone">
                  <input id="phone" type="tel" className="field-input" value={form.personal.phone}
                    onChange={(e) => set('personal', 'phone', e.target.value)} autoComplete="tel" />
                </Field>
                <Field label="Email" htmlFor="p-email" hint="Optional — used for appointment reminders">
                  <input id="p-email" type="email" className="field-input" value={form.personal.email}
                    onChange={(e) => set('personal', 'email', e.target.value)} autoComplete="email" />
                </Field>
              </div>

              <Field label="Address *" error={errors['personal.address']} htmlFor="address">
                <input id="address" className="field-input" value={form.personal.address}
                  onChange={(e) => set('personal', 'address', e.target.value)} autoComplete="street-address" />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="County *" error={errors['personal.county']} htmlFor="county" hint={COUNTY_HINT}>
                  <input id="county" className="field-input" value={form.personal.county}
                    onChange={(e) => set('personal', 'county', e.target.value)} />
                </Field>
                <Field label="Marital status" htmlFor="marital">
                  <select id="marital" className="field-input" value={form.personal.marital_status}
                    onChange={(e) => set('personal', 'marital_status', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                  </select>
                </Field>
              </div>

              <fieldset className="rounded-xl border border-navy/10 p-5">
                <legend className="px-1 text-sm font-semibold text-navy">Emergency contact (optional)</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="ec-name">
                    <input id="ec-name" className="field-input" value={form.personal.emergency_contact.name}
                      onChange={(e) => setEmergency('name', e.target.value)} />
                  </Field>
                  <Field label="Relationship" htmlFor="ec-rel">
                    <input id="ec-rel" className="field-input" value={form.personal.emergency_contact.relationship}
                      onChange={(e) => setEmergency('relationship', e.target.value)} />
                  </Field>
                  <Field label="Phone" htmlFor="ec-phone">
                    <input id="ec-phone" type="tel" className="field-input" value={form.personal.emergency_contact.phone}
                      onChange={(e) => setEmergency('phone', e.target.value)} />
                  </Field>
                  <Field label="Email" htmlFor="ec-email">
                    <input id="ec-email" type="email" className="field-input" value={form.personal.emergency_contact.email}
                      onChange={(e) => setEmergency('email', e.target.value)} />
                  </Field>
                </div>
              </fieldset>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5">
              <SectionTitle title="Medical history" hint="Leave anything you are unsure of blank." />
              <Field label="Current conditions" hint="Press Enter to add each condition">
                <TagInput
                  values={form.medical_history.conditions}
                  onChange={(v) => set('medical_history', 'conditions', v)}
                  placeholder="e.g. Type 2 diabetes"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date of diagnosis" htmlFor="dx-date">
                  <input id="dx-date" type="date" className="field-input" value={form.medical_history.diagnosis_date}
                    onChange={(e) => set('medical_history', 'diagnosis_date', e.target.value)} />
                </Field>
                <Field label="Stage" htmlFor="stage">
                  <input id="stage" className="field-input" value={form.medical_history.diagnosis_stage}
                    onChange={(e) => set('medical_history', 'diagnosis_stage', e.target.value)}
                    placeholder="e.g. Stage II" />
                </Field>
              </div>
              <Field label="Referring doctor" htmlFor="refdoc">
                <input id="refdoc" className="field-input" value={form.medical_history.referring_doctor}
                  onChange={(e) => set('medical_history', 'referring_doctor', e.target.value)} />
              </Field>
              <Field label="Current symptoms" htmlFor="symptoms">
                <textarea id="symptoms" rows="3" className="field-input" value={form.medical_history.symptoms}
                  onChange={(e) => set('medical_history', 'symptoms', e.target.value)} />
              </Field>
              <Field label="Past surgeries" hint="Press Enter to add each surgery">
                <TagInput values={form.medical_history.surgeries}
                  onChange={(v) => set('medical_history', 'surgeries', v)} placeholder="e.g. Thyroidectomy 2019" />
              </Field>
              <Field label="Family history" htmlFor="family">
                <textarea id="family" rows="2" className="field-input" value={form.medical_history.family_history}
                  onChange={(e) => set('medical_history', 'family_history', e.target.value)} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Allergies" hint="Press Enter to add each">
                  <TagInput values={form.medical_history.allergies}
                    onChange={(v) => set('medical_history', 'allergies', v)} placeholder="e.g. Penicillin" />
                </Field>
                <Field label="Current medications" hint="Press Enter to add each">
                  <TagInput values={form.medical_history.medications}
                    onChange={(v) => set('medical_history', 'medications', v)} placeholder="e.g. Metformin 500mg" />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Smoking" htmlFor="smoking">
                  <select id="smoking" className="field-input" value={form.medical_history.smoking}
                    onChange={(e) => set('medical_history', 'smoking', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option>Never</option>
                    <option>Former</option>
                    <option>Occasional</option>
                    <option>Daily</option>
                  </select>
                </Field>
                <Field label="Alcohol" htmlFor="alcohol">
                  <select id="alcohol" className="field-input" value={form.medical_history.alcohol}
                    onChange={(e) => set('medical_history', 'alcohol', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option>Never</option>
                    <option>Occasional</option>
                    <option>Regular</option>
                  </select>
                </Field>
                <Field label="Exercise" htmlFor="exercise">
                  <select id="exercise" className="field-input" value={form.medical_history.exercise}
                    onChange={(e) => set('medical_history', 'exercise', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option>Low</option>
                    <option>Moderate</option>
                    <option>High</option>
                  </select>
                </Field>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5">
              <SectionTitle title="Health data" hint="Vitals help hospitals prepare before your visit." />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Weight (kg)" htmlFor="weight">
                  <input id="weight" type="number" min="10" max="300" className="field-input"
                    value={form.health_data.weight_kg}
                    onChange={(e) => set('health_data', 'weight_kg', e.target.value)} />
                </Field>
                <Field label="Height (cm)" htmlFor="height">
                  <input id="height" type="number" min="50" max="250" className="field-input"
                    value={form.health_data.height_cm}
                    onChange={(e) => set('health_data', 'height_cm', e.target.value)} />
                </Field>
                <Field label="Blood pressure" htmlFor="bp" hint="e.g. 120/80">
                  <input id="bp" className="field-input" value={form.health_data.blood_pressure}
                    onChange={(e) => set('health_data', 'blood_pressure', e.target.value)} />
                </Field>
                <Field label="Blood sugar (mmol/L)" htmlFor="sugar">
                  <input id="sugar" type="number" min="0" step="0.1" className="field-input"
                    value={form.health_data.blood_sugar}
                    onChange={(e) => set('health_data', 'blood_sugar', e.target.value)} />
                </Field>
                <Field label="Blood group" htmlFor="bloodgroup">
                  <select id="bloodgroup" className="field-input" value={form.health_data.blood_group}
                    onChange={(e) => set('health_data', 'blood_group', e.target.value)}>
                    <option value="">Unknown</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Disability" htmlFor="disability">
                  <input id="disability" className="field-input" value={form.health_data.disability}
                    onChange={(e) => set('health_data', 'disability', e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Pregnancy status" htmlFor="pregnancy">
                  <select id="pregnancy" className="field-input" value={form.health_data.pregnancy_status}
                    onChange={(e) => set('health_data', 'pregnancy_status', e.target.value)}>
                    <option value="">Not applicable</option>
                    <option>Not pregnant</option>
                    <option>Pregnant</option>
                    <option>Possibly pregnant</option>
                  </select>
                </Field>
                <Field label="Number of children" htmlFor="children">
                  <input id="children" type="number" min="0" max="20" className="field-input"
                    value={form.health_data.children}
                    onChange={(e) => set('health_data', 'children', e.target.value)} />
                </Field>
                <Field label="Contraception" htmlFor="contraception">
                  <input id="contraception" className="field-input" value={form.health_data.contraception}
                    onChange={(e) => set('health_data', 'contraception', e.target.value)} />
                </Field>
              </div>

              <Field label="Mental health conditions" hint="Press Enter to add each">
                <TagInput values={form.health_data.mental_conditions}
                  onChange={(v) => set('health_data', 'mental_conditions', v)} placeholder="e.g. Anxiety" />
              </Field>
              <Field label="Mental health notes" htmlFor="mental-notes">
                <textarea id="mental-notes" rows="2" className="field-input" value={form.health_data.mental_notes}
                  onChange={(e) => set('health_data', 'mental_notes', e.target.value)} />
              </Field>
              <Field label="Services needed" hint="Press Enter to add each">
                <TagInput values={form.health_data.services_needed}
                  onChange={(v) => set('health_data', 'services_needed', v)} placeholder="e.g. Endocrinology consult" />
              </Field>
              <Field label="Additional notes" htmlFor="notes">
                <textarea id="notes" rows="3" className="field-input" value={form.health_data.additional_notes}
                  onChange={(e) => set('health_data', 'additional_notes', e.target.value)} />
              </Field>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-5">
              <SectionTitle title="Insurance & consent" hint="Section 4 — the last one." />

              <InsuranceEditor
                insurance={form.insurance}
                onChange={(key, value) => set('insurance', key, value)}
              />

              <fieldset className="space-y-3 rounded-xl border border-navy/10 p-5">
                <legend className="px-1 text-sm font-semibold text-navy">Consent *</legend>

                {[
                  ['information_accurate', 'I confirm the information above is accurate to the best of my knowledge.'],
                  ['share_with_hospitals', 'I consent to GlandFind sharing this record with hospitals I book an appointment with.'],
                  ['accepted_terms', 'I accept the GlandFind terms of service and privacy policy.'],
                ].map(([key, label]) => (
                  <label key={key} className="flex gap-3 text-sm text-navy/75">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy/25 text-brand-500"
                      checked={form.consent[key]}
                      onChange={(e) => set('consent', key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}

                {errors.consent && <Alert tone="error">{errors.consent}</Alert>}
              </fieldset>
            </section>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-navy/10 pt-6">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              Back
            </button>

            {step < STEPS.length ? (
              <button type="button" className="btn-primary" onClick={next}>Continue</button>
            ) : (
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting && <Spinner />}
                {submitting ? 'Submitting…' : 'Submit intake record'}
              </button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-navy">Why we ask</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy/60">
              Hospitals receive your intake record before you arrive, so check-in is faster and
              your specialists spend more of the visit on your care.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-navy/65">
              <li className="flex gap-2.5"><LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> Encrypted and never sold</li>
              <li className="flex gap-2.5"><BuildingIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> Shared only with facilities you book</li>
              <li className="flex gap-2.5"><DocumentIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> A reference code you can quote at the desk</li>
            </ul>
            {!isAuthenticated && (
              <p className="mt-4 text-sm text-navy/60">
                <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>{' '}
                to keep this record attached to your account.
              </p>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}

function InsuranceEditor({ insurance, onChange }) {
  const [insurers, setInsurers] = useState([]);
  const [policyNumber, setPolicyNumber] = useState('');

  useEffect(() => {
    let cancelled = false;
    Api.insurance().then((rows) => !cancelled && setInsurers(rows)).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-5">
      <Field label="Insurance providers" hint="Choose one, then enter its membership number">
        <div className="flex flex-wrap gap-2">
          {insurers.map((provider) => {
            const selected = insurance.providers.includes(provider.name);
            return (
              <button
                key={provider.id ?? provider.name}
                type="button"
                onClick={() => onChange('providers',
                  selected
                    ? insurance.providers.filter((p) => p !== provider.name)
                    : [...insurance.providers, provider.name])}
                className={`badge border px-3 py-1.5 text-sm transition ${
                  selected
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-navy/15 bg-white text-navy/70 hover:border-brand-500'
                }`}
              >
                {selected && <CheckIcon className="h-3 w-3" />} {provider.name}
              </button>
            );
          })}
          {insurers.length === 0 && <p className="text-sm text-navy/50">Loading insurers…</p>}
        </div>
      </Field>

      {insurance.providers.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-navy/10 p-4">
          <div className="min-w-[16rem] flex-1">
            <Field label="Membership number" htmlFor="policy">
              <input id="policy" className="field-input" value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder={`Enter the ${insurance.providers[0]} number`} />
            </Field>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const provider = insurance.providers[insurance.providers.length - 1];
              onChange('policy_numbers', { ...(insurance.policy_numbers ?? {}), [provider]: policyNumber });
              setPolicyNumber('');
            }}
          >
            Save number
          </button>
        </div>
      )}

      {insurance.policy_numbers && Object.keys(insurance.policy_numbers).length > 0 && (
        <ul className="space-y-1.5">
          {Object.entries(insurance.policy_numbers).map(([provider, number]) => (
            <li key={provider} className="flex items-center gap-2 text-sm text-navy/70">
              <Badge tone="neutral">{provider}</Badge>
              <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">{number}</code>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Employer" htmlFor="employer">
          <input id="employer" className="field-input" value={insurance.employer}
            onChange={(e) => onChange('employer', e.target.value)} />
        </Field>
        <Field label="Expiry date" htmlFor="expiry">
          <input id="expiry" type="date" className="field-input" value={insurance.expiry_date}
            onChange={(e) => onChange('expiry_date', e.target.value)} />
        </Field>
        <Field label="Annual limit" htmlFor="limit">
          <input id="limit" className="field-input" value={insurance.annual_limit}
            onChange={(e) => onChange('annual_limit', e.target.value)} placeholder="e.g. KES 500,000" />
        </Field>
      </div>

      <Field label="What the plan covers" hint="Press Enter to add each">
        <TagInput values={insurance.covers} onChange={(v) => onChange('covers', v)}
          placeholder="e.g. Specialist outpatient" />
      </Field>

      <Field label="Insurance notes" htmlFor="ins-notes">
        <textarea id="ins-notes" rows="2" className="field-input" value={insurance.notes}
          onChange={(e) => onChange('notes', e.target.value)} />
      </Field>
    </div>
  );
}

function SectionTitle({ title, hint }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-navy">{title}</h2>
      {hint && <p className="mt-1 text-sm text-navy/50">{hint}</p>}
    </div>
  );
}

function ReferenceCard({ profile }) {
  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-xl text-center">
        <SuccessRing />
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-navy">Intake record submitted</h1>
        <p className="mt-2 text-sm text-navy/60">
          Keep this reference safe — quote it at the hospital desk.
        </p>

        <div className="card mt-7 bg-slate-50 p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-navy/45">Your reference</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-wider text-brand-700">
            {profile.profile_code}
          </p>
          <p className="mt-4 text-sm text-navy/70">
            {profile.full_name} · {profile.personal?.county}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/hospitals" className="btn-primary">Book an appointment</Link>
          <Link to="/" className="btn-secondary">Back home</Link>
        </div>
      </div>
    </div>
  );
}

export function TagInput({ values = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  function add() {
    const value = draft.trim();
    if (!value || values.includes(value)) { setDraft(''); return; }
    onChange([...values, value]);
    setDraft('');
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-navy/15 bg-white p-2">
      {values.map((value) => (
        <span key={value} className="badge bg-brand-50 text-brand-700">
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={() => onChange(values.filter((v) => v !== value))}
            className="ml-1 opacity-60 hover:opacity-100"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        className="min-w-[10rem] flex-1 border-0 px-2 py-1 text-sm placeholder:text-navy/35 focus:ring-0"
        value={draft}
        placeholder={values.length ? 'Add another…' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={add}
      />
    </div>
  );
}