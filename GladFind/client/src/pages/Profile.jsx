import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Api } from '../lib/api.js';
import { Alert, Badge, EmptyState, LoadingBlock } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const STATUS_TONES = {
  requested: 'warning',
  confirmed: 'success',
  completed: 'info',
  cancelled: 'danger',
};

export default function Profile() {
  const { user, status, logout } = useAuth();
  const toast = useToast();

  const [appointments, setAppointments] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lookup, setLookup] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [searching, setSearching] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setAppointments(null);
    setProfile(null);

    Api.myAppointments({ limit: 25 })
      .then((r) => setAppointments(r.results ?? []))
      .catch(() => setAppointments([]));

    // A 404 here just means the patient has not completed intake yet.
    Api.myIntake().then(setProfile).catch(() => setProfile(null));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (status === 'loading') return <LoadingBlock />;

  if (!user) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Sign in to view your dashboard"
          description="Your appointments and intake record live behind your account."
          action={<Link to="/login" className="btn-primary mt-2">Sign in</Link>}
        />
      </div>
    );
  }

  async function runLookup(event) {
    event.preventDefault();
    setSearching(true);
    setLookupError('');
    setLookupResult(null);
    try {
      setLookupResult(await Api.lookupIntake(lookup.trim()));
    } catch (e) {
      setLookupError(e.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="container-page py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy">
            {user.full_name.split(' ')[0]}&rsquo;s dashboard
          </h1>
          <p className="mt-1.5 text-sm text-navy/60">{user.email}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={logout}>Sign out</button>
      </header>

      <div className="grid gap-7 lg:grid-cols-[1fr_320px]">
        <div className="space-y-7">
          <section className="card p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-navy">My appointments</h2>
              <Link to="/hospitals" className="btn-ghost">Book new</Link>
            </div>

            {appointments === null && <LoadingBlock label="Loading appointments…" />}

            {appointments?.length === 0 && (
              <p className="mt-4 text-sm text-navy/60">
                No appointments yet.{' '}
                <Link to="/hospitals" className="font-semibold text-brand-700 hover:underline">
                  Find a hospital
                </Link>{' '}
                to book your first visit.
              </p>
            )}

            {appointments?.length > 0 && (
              <ul className="mt-5 divide-y divide-navy/10">
                {appointments.map((appointment) => (
                  <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                    <div>
                      <p className="font-semibold text-navy">
                        {appointment.preferred_date
                          ? formatDate(appointment.preferred_date)
                          : 'Date to be confirmed'}
                        {appointment.preferred_time ? ` at ${appointment.preferred_time}` : ''}
                      </p>
                      <p className="text-sm text-navy/55">
                        {appointment.doctor_name
                          ? `Dr ${appointment.doctor_name}`
                          : 'No doctor preference'}
                        {' · requested '}{formatDate(appointment.created_at)}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONES[appointment.status] ?? 'neutral'}>
                      {appointment.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-7">
            <h2 className="text-lg font-bold text-navy">My intake record</h2>

            {profile === null ? (
              <div className="mt-4">
                <p className="text-sm text-navy/60">
                  You have not completed your intake record yet. It takes about two minutes and
                  speeds up check-in at the hospital.
                </p>
                <Link to="/intake" className="btn-primary mt-4">Start intake</Link>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-navy/60">
                  Your reference — quote it at the hospital desk.
                </p>
                <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-brand-700">
                  {profile.profile_code}
                </p>
                <p className="mt-3 text-sm text-navy/60">
                  {profile.full_name} · {profile.personal?.county} · updated {formatDate(profile.updated_at)}
                </p>
                <Link to="/intake" className="btn-secondary mt-4">Update record</Link>
              </div>
            )}
          </section>
        </div>

        <aside>
          <div className="card p-5">
            <h2 className="text-sm font-bold text-navy">Look up a reference</h2>
            <p className="mt-1.5 text-xs text-navy/55">
              Hospital staff use this to confirm a patient record at the desk. It returns only the
              patient&rsquo;s name and county — never medical details.
            </p>

            <form onSubmit={runLookup} className="mt-4 space-y-3">
              <input
                className="field-input font-mono uppercase"
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="GF-XXXXXXXX"
                aria-label="Intake reference code"
              />
              <button type="submit" className="btn-secondary w-full" disabled={searching || !lookup.trim()}>
                {searching ? 'Checking…' : 'Look up'}
              </button>
            </form>

            {lookupError && <div className="mt-3"><Alert tone="error">{lookupError}</Alert></div>}

            {lookupResult && (
              <div className="mt-4 rounded-xl bg-brand-50 p-4 text-sm">
                <p className="font-semibold text-brand-700">
                  {lookupResult.personal?.first_name} {lookupResult.personal?.last_name}
                </p>
                <p className="mt-0.5 text-brand-900/70">{lookupResult.personal?.county}</p>
                <p className="mt-2 font-mono text-xs text-brand-700">{lookupResult.profile_code}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}