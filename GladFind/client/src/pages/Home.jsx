import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Api } from '../lib/api.js';
import { Badge, Rating } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [categories, setCategories] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    // Each request settles independently: a failed insurer lookup should not
    // take the whole hero search box down with it.
    Api.categories().then((c) => !cancelled && setCategories(c)).catch(() => {});
    Api.insurance().then((p) => !cancelled && setInsurers(p)).catch(() => {});
    Api.searchHospitals({ limit: 3, sort: 'rating' })
      .then((r) => !cancelled && setFeatured(r.results))
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  function submit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    navigate(`/hospitals?${params.toString()}`);
  }

  return (
    <>
      {/* -- Hero ------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{ background: 'radial-gradient(70rem 40rem at 20% -20%, #00b8a9, transparent 60%)' }}
          aria-hidden="true"
        />

        <div className="container-page relative py-20 sm:py-28">
          <Badge tone="brand" className="mb-5 bg-brand-500/15 text-brand-100">
            Trusted across 47 counties
          </Badge>

          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Find the right gland care, <span className="text-brand-500">faster</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Search Kenya&apos;s hospitals and clinics by condition, county, insurance provider and
            consultation fee — then book an appointment or submit your intake record in minutes.
          </p>

          <form onSubmit={submit} className="mt-9 max-w-2xl" role="search">
            <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lift sm:flex-row">
              <label htmlFor="hero-search" className="sr-only">Search for a hospital or service</label>
              <input
                id="hero-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try “cardiology”, “maternity” or a hospital name"
                className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3 text-sm text-navy placeholder:text-navy/40 focus:ring-0"
              />
              <button type="submit" className="btn-primary shrink-0 px-6 py-3">Search</button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id ?? category.name}
                  to={`/hospitals?q=${encodeURIComponent(category.name)}`}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:border-brand-500 hover:text-white"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* -- Actions ---------------------------------------------------- */}
      <section className="container-page -mt-12 relative grid gap-5 pb-8 sm:grid-cols-2 lg:-mt-16">
        <ActionCard
          to="/intake"
          title="Complete your intake record"
          body="Answer four short sections and get a reference code to hand in at the hospital desk."
          cta={isAuthenticated ? 'Start my intake' : 'Start intake'}
          primary
        />
        <ActionCard
          to="/hospitals"
          title="Book an appointment"
          body="Compare consultation fees and pick a hospital that suits you."
          cta="Browse hospitals"
        />
      </section>

      {/* -- Featured --------------------------------------------------- */}
      <section className="container-page py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
              Top-rated facilities
            </h2>
            <p className="mt-1.5 text-sm text-navy/60">
              Rated by patients across the GlandFind community.
            </p>
          </div>
          <Link to="/hospitals" className="btn-ghost shrink-0">
            View all
          </Link>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {featured.map((hospital) => (
            <HospitalCard key={hospital.id} hospital={hospital} />
          ))}
        </div>
      </section>

      {/* -- Trust strip ------------------------------------------------ */}
      <section className="border-y border-navy/10 bg-white py-14">
        <div className="container-page grid gap-8 sm:grid-cols-3">
          <Stat value="200+" label="Verified facilities" />
          <Stat value="47" label="Counties covered" />
          <Stat value="13" label="Specialist services" />
        </div>
      </section>

      {/* -- Insurance -------------------------------------------------- */}
      {insurers.length > 0 && (
        <section className="container-page py-14">
          <h2 className="text-2xl font-extrabold tracking-tight text-navy">
            Search by your insurer
          </h2>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {insurers.map((provider) => (
              <Link
                key={provider.id ?? provider.name}
                to={`/hospitals?insurance=${encodeURIComponent(provider.name)}`}
                className="badge border border-navy/15 bg-white px-4 py-2 text-sm text-navy transition hover:border-brand-500 hover:text-brand-700"
              >
                {provider.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ActionCard({ to, title, body, cta, primary }) {
  return (
    <div className="card flex flex-col gap-3 p-6">
      <h3 className="text-lg font-bold text-navy">{title}</h3>
      <p className="flex-1 text-sm leading-relaxed text-navy/60">{body}</p>
      <Link to={to} className={primary ? 'btn-primary self-start' : 'btn-secondary self-start'}>
        {cta}
      </Link>
    </div>
  );
}

export function HospitalCard({ hospital }) {
  return (
    <Link to={`/hospitals/${hospital.id}`} className="card group flex flex-col gap-3 p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold leading-snug text-navy group-hover:text-brand-700">
          {hospital.name}
        </h3>
        {hospital.is_verified && <Badge tone="brand">Verified</Badge>}
      </div>

      <p className="text-sm text-navy/55">
        {hospital.town}, {hospital.county}
      </p>

      <Rating value={hospital.rating} count={hospital.review_count} />

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-navy/10 pt-3">
        <div>
          <p className="text-xs text-navy/50">From</p>
          <p className="text-base font-bold text-navy">
            {hospital.lowest_fee != null ? `KES ${hospital.lowest_fee.toLocaleString()}` : '—'}
          </p>
        </div>
        <Badge tone={hospital.is_open ? 'success' : 'warning'}>
          {hospital.is_open ? 'Open' : 'Closed'}
        </Badge>
      </div>
    </Link>
  );
}

function Stat({ value, label }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-3xl font-extrabold tracking-tight text-navy">{value}</p>
      <p className="mt-1 text-sm text-navy/55">{label}</p>
    </div>
  );
}