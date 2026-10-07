import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Api } from '../lib/api.js';
import { Badge, ErrorState, LoadingBlock, Rating } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const TYPE_LABELS = {
  public_hospital: 'Public hospital',
  private_hospital: 'Private hospital',
  specialist_clinic: 'Specialist clinic',
  teaching_hospital: 'Teaching hospital',
};

export default function HospitalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [hospital, setHospital] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    Api.hospital(id)
      .then((data) => {
        if (cancelled) return;
        setHospital(data);
        setState('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setState('error');
      });

    return () => { cancelled = true; };
  }, [id]);

  if (state === 'loading') return <LoadingBlock label="Loading hospital…" />;
  if (state === 'error') return <div className="container-page py-10"><ErrorState message={error} /></div>;

  const services = hospital.services ?? [];

  return (
    <div className="container-page py-10">
      <nav className="mb-6 text-sm text-navy/55" aria-label="Breadcrumb">
        <Link to="/hospitals" className="hover:text-brand-700">Hospitals</Link>
        <span className="mx-2">/</span>
        <span className="text-navy">{hospital.name}</span>
      </nav>

      <header className="card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{TYPE_LABELS[hospital.facility_type] ?? hospital.facility_type}</Badge>
              {hospital.is_verified && <Badge tone="brand">Verified</Badge>}
              {hospital.status !== 'approved' && <Badge tone="warning">{hospital.status}</Badge>}
              <Badge tone={hospital.is_open ? 'success' : 'warning'}>
                {hospital.is_open ? 'Open now' : 'Closed'}
              </Badge>
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-navy">{hospital.name}</h1>
            <p className="mt-1 text-sm text-navy/60">{hospital.town}, {hospital.county}</p>

            <div className="mt-4"><Rating value={hospital.rating} count={hospital.review_count} /></div>

            {hospital.about && (
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-navy/70">{hospital.about}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  navigate(isAuthenticated ? `/book/${hospital.id}` : '/login', {
                    state: { from: `/book/${hospital.id}`, hospitalName: hospital.name },
                  })
                }
              >
                Book appointment
              </button>
              <a className="btn-secondary" href={`tel:${hospital.phone ?? ''}`}>Call hospital</a>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px bg-navy/10 lg:grid-cols-1">
            <Fact label="Consultation from" value={hospital.lowest_fee != null ? `KES ${hospital.lowest_fee.toLocaleString()}` : '—'} />
            <Fact label="Bed capacity" value={hospital.bed_capacity ?? '—'} />
            <Fact label="Specialists" value={hospital.specialist_count ?? '—'} />
            <Fact label="Walk-ins" value={hospital.accepts_walk_ins ? 'Accepted' : 'By appointment'} />
          </dl>
        </div>
      </header>

      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="text-xl font-extrabold tracking-tight text-navy">
            Services &amp; fees
            <span className="ml-2 text-sm font-medium text-navy/50">{services.length}</span>
          </h2>

          {services.length === 0 ? (
            <p className="mt-3 text-sm text-navy/60">
              This facility has not published its fee schedule yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {services.map((service) => (
                <li key={service.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-navy">{service.name}</h3>
                      {service.doctors?.length > 0 && (
                        <p className="mt-1 text-xs text-navy/55">
                          {service.doctors
                            .map((d) => (d.specialty ? `${d.name} · ${d.specialty}` : d.name))
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-navy">
                        {service.currency === 'KES' ? 'KES ' : `${service.currency} `}
                        {Number(service.fee).toLocaleString()}
                      </p>
                      <p className="text-xs text-navy/50">{service.fee_label}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-navy">Contact &amp; location</h2>
            <address className="mt-3 space-y-1.5 text-sm not-italic text-navy/70">
              {hospital.address_line && <p>{hospital.address_line}</p>}
              <p>{hospital.town}, {hospital.county}</p>
              {hospital.phone && <p className="font-semibold text-navy">{hospital.phone}</p>}
              {hospital.email && <p className="break-all">{hospital.email}</p>}
            </address>
            {hospital.latitude != null && hospital.longitude != null && (
              <a
                className="btn-secondary mt-4 w-full"
                href={`https://www.openstreetmap.org/?mlat=${hospital.latitude}&mlon=${hospital.longitude}#map=15/${hospital.latitude}/${hospital.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                View on map
              </a>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold text-navy">Accepted insurance</h2>
            {hospital.insurance_providers?.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {hospital.insurance_providers.map((provider) => (
                  <li key={provider.id ?? provider.name}>
                    <Badge tone="neutral">{provider.name}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-navy/55">No insurers listed — pay directly at the facility.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-xs uppercase tracking-wide text-navy/45">{label}</dt>
      <dd className="mt-0.5 font-bold text-navy">{value}</dd>
    </div>
  );
}