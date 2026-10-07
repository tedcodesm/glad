import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Api } from '../lib/api.js';
import { Alert, Field, LoadingBlock, Spinner } from '../components/ui.jsx';
import { ArrowRightIcon, SuccessRing } from '../components/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

export default function BookAppointment() {
  const { hospitalId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, status } = useAuth();
  const toast = useToast();

  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  // Selecting a service is what determines the fee, so it is the first real choice.
  const [form, setForm] = useState({
    service_id: '', patient_name: '', patient_phone: '', patient_email: '',
    preferred_date: '', preferred_time: '', doctor_name: '', notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // /book with no id: let the patient search for the hospital first.
    if (!hospitalId) { setLoading(false); return; }

    Api.hospital(hospitalId)
      .then((data) => {
        if (cancelled) return;
        setHospital(data);
        // Pre-fill from the account so returning patients do not retype their details.
        setForm((current) => ({
          ...current,
          patient_name: current.patient_name || user?.full_name || '',
          patient_phone: current.patient_phone || user?.phone || '',
          patient_email: current.patient_email || user?.email || '',
        }));
      })
      .catch((e) => toast.error(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [hospitalId, user, toast]);

  const service = useMemo(
    () => hospital?.services?.find((s) => s.id === form.service_id) ?? null,
    [hospital, form.service_id],
  );

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();

    const found = {};
    for (const key of ['service_id', 'patient_name', 'patient_phone']) {
      if (!String(form[key]).trim()) found[key] = 'This field is required';
    }
    if (form.patient_email && !/^\S+@\S+\.\S+$/.test(form.patient_email)) {
      found.patient_email = 'Enter a valid email address';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const appointment = await Api.bookAppointment({ ...form, hospital_id: hospitalId });
      setBooked(appointment);
      toast.success('Appointment request sent');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (booked) return <Confirmation appointment={booked} hospital={hospital} />;
  if (loading) return <LoadingBlock label="Loading booking form…" />;
  if (!hospitalId) return <HospitalPicker onPick={(id) => navigate(`/book/${id}`)} />;

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Book an appointment</h1>
        <p className="mt-1.5 text-sm text-navy/60">
          at <span className="font-semibold text-navy">{hospital?.name ?? location.state?.hospitalName}</span>
        </p>
      </header>

      {!isAuthenticated && status === 'ready' && (
        <Alert tone="warning" title="Booking without an account">
          You are not signed in, so this request will not appear in your appointments list.{' '}
          <Link to="/login" className="font-semibold underline">Sign in</Link> first to track it.
        </Alert>
      )}

      <form onSubmit={submit} className="mt-6 grid gap-7 lg:grid-cols-[1fr_320px]">
        <div className="card space-y-5 p-7">
          <Field label="Service *" error={errors.service_id} htmlFor="service">
            <select id="service" className="field-input" value={form.service_id}
              onChange={(e) => set('service_id', e.target.value)}>
              <option value="">Choose a service…</option>
              {hospital?.services?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.currency === 'KES' ? 'KES ' : `${s.currency} `}{Number(s.fee).toLocaleString()}
                </option>
              ))}
            </select>
            {hospital?.services?.length === 0 && (
              <p className="mt-1 text-xs text-navy/55">
                This facility has not published a fee schedule, so online booking is unavailable.
              </p>
            )}
          </Field>

          {service?.doctors?.length > 0 && (
            <Field label="Preferred doctor" htmlFor="doctor" hint="Optional — leave blank for the next available">
              <select id="doctor" className="field-input" value={form.doctor_name}
                onChange={(e) => set('doctor_name', e.target.value)}>
                <option value="">No preference</option>
                {service.doctors.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.specialty ? `${d.name} · ${d.specialty}` : d.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Preferred date" htmlFor="date">
              <input id="date" type="date" className="field-input" value={form.preferred_date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set('preferred_date', e.target.value)} />
            </Field>
            <Field label="Preferred time" htmlFor="time">
              <select id="time" className="field-input" value={form.preferred_time}
                onChange={(e) => set('preferred_time', e.target.value)}>
                <option value="">Any time</option>
                {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <hr className="border-navy/10" />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name *" error={errors.patient_name} htmlFor="pname">
              <input id="pname" className="field-input" value={form.patient_name}
                onChange={(e) => set('patient_name', e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Phone *" error={errors.patient_phone} htmlFor="pphone">
              <input id="pphone" type="tel" className="field-input" value={form.patient_phone}
                onChange={(e) => set('patient_phone', e.target.value)} autoComplete="tel" />
            </Field>
          </div>

          <Field label="Email" error={errors.patient_email} htmlFor="pemail"
            hint="Optional — appointment confirmations are sent here">
            <input id="pemail" type="email" className="field-input" value={form.patient_email}
              onChange={(e) => set('patient_email', e.target.value)} autoComplete="email" />
          </Field>

          <Field label="Notes for the hospital" htmlFor="anotes"
            hint="Optional — symptoms, mobility needs, preferred language">
            <textarea id="anotes" rows="3" className="field-input" value={form.notes}
              onChange={(e) => set('notes', e.target.value)} />
          </Field>

          <div className="flex flex-wrap gap-3 border-t border-navy/10 pt-6">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting && <Spinner />}
              {submitting ? 'Sending…' : 'Request appointment'}
            </button>
            <Link to={`/hospitals/${hospitalId}`} className="btn-secondary">Cancel</Link>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-navy">Summary</h2>

            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Hospital" value={hospital?.name} />
              <Row label="Service" value={service?.name ?? '—'} />
              <Row label="Consultation fee"
                value={service ? `${service.currency === 'KES' ? 'KES ' : `${service.currency} `}${Number(service.fee).toLocaleString()}` : '—'} />
              <Row label="Date" value={form.preferred_date || 'Any date'} />
              <Row label="Time" value={form.preferred_time || 'Any time'} />
            </dl>

            <p className="mt-4 border-t border-navy/10 pt-4 text-xs leading-relaxed text-navy/55">
              This is a request, not a confirmed booking. The hospital confirms your slot and
              contacts you on the number provided.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-navy/55">{label}</dt>
      <dd className="text-right font-semibold text-navy">{value}</dd>
    </div>
  );
}

function HospitalPicker({ onPick }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResult(null); return; }
    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(() => {
      Api.searchHospitals({ q: query.trim(), limit: 10 })
        .then((r) => !cancelled && setResult(r))
        .catch(() => !cancelled && setResult({ total: 0, results: [] }))
        .finally(() => !cancelled && setSearching(false));
    }, 250);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  return (
    <div className="container-page py-10">
      <header className="mb-7">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Book an appointment</h1>
        <p className="mt-1.5 text-sm text-navy/60">Search for the hospital you want to visit.</p>
      </header>

      <div className="card p-7">
        <Field label="Hospital name or service" htmlFor="pick">
          <input id="pick" type="search" className="field-input" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Nairobi Hospital, cardiology" autoFocus />
        </Field>

        {searching && <p className="mt-4 text-sm text-navy/55">Searching…</p>}

        {result && result.results.length === 0 && (
          <p className="mt-4 text-sm text-navy/55">No hospitals matched “{query}”.</p>
        )}

        <ul className="mt-5 divide-y divide-navy/10">
          {result?.results?.map((hospital) => (
            <li key={hospital.id}>
              <button
                type="button"
                onClick={() => onPick(hospital.id)}
                className="flex w-full items-center justify-between gap-4 py-3.5 text-left hover:bg-slate-50"
              >
                <span>
                  <span className="block font-semibold text-navy">{hospital.name}</span>
                  <span className="block text-sm text-navy/55">
                    {hospital.town}, {hospital.county} · from KES {hospital.lowest_fee?.toLocaleString() ?? '—'}
                  </span>
                </span>
                <span className="text-brand-600"><ArrowRightIcon /></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Confirmation({ appointment, hospital }) {
  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-lg text-center">
        <SuccessRing />
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-navy">Request sent</h1>
        <p className="mt-2 text-sm text-navy/60">
          {hospital?.name} will confirm your slot shortly.
        </p>

        <dl className="card mt-7 divide-y divide-navy/10 text-left">
          <Row label="Reference" value={String(appointment.id).slice(-8).toUpperCase()} />
          <Row label="Status" value={appointment.status ?? 'requested'} />
          <Row label="Date" value={appointment.preferred_date ?? 'To be confirmed'} />
          <Row label="Time" value={appointment.preferred_time ?? 'To be confirmed'} />
        </dl>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/profile" className="btn-primary">My appointments</Link>
          <Link to="/hospitals" className="btn-secondary">Find another hospital</Link>
        </div>
      </div>
    </div>
  );
}