import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Api } from '../lib/api.js';
import { Badge, EmptyState, ErrorState, Field, LoadingBlock } from '../components/ui.jsx';
import { HospitalCard } from './Home.jsx';

const SORTS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'fee_asc', label: 'Lowest fee first' },
  { value: 'rating', label: 'Highest rated' },
];

const PAGE_SIZE = 12;

export default function Hospitals() {
  const [params, setParams] = useSearchParams();

  const [filters, setFilters] = useState(() => ({
    q: params.get('q') ?? '',
    county: params.get('county') ?? '',
    insurance: params.get('insurance') ?? '',
    facility_type: params.get('facility_type') ?? '',
    open_only: params.get('open_only') === 'true',
  }));

  const [sort, setSort] = useState(params.get('sort') ?? 'relevance');
  const [page, setPage] = useState(0);

  const [result, setResult] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [insurers, setInsurers] = useState([]);

  useEffect(() => {
    Api.insurance().then(setInsurers).catch(() => {});
  }, []);

  // The URL is the source of truth, so a search is shareable and survives reload.
  useEffect(() => {
    const query = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value === '' || value === false || value == null) continue;
      query[key] = value === true ? 'true' : value;
    }
    if (sort !== 'relevance') query.sort = sort;

    setParams(query, { replace: true });

    let cancelled = false;
    setState('loading');
    setError('');

    Api.searchHospitals({ ...query, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setState('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setState('error');
      });

    return () => { cancelled = true; };
  }, [filters, sort, page, setParams]);

  // Any filter change invalidates the current page number.
  const update = useCallback((patch) => {
    setPage(0);
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const total = result?.total ?? 0;
  const results = result?.results ?? [];
  const pageCount = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Hospitals &amp; clinics</h1>
        <p className="mt-1.5 text-sm text-navy/60">
          Filter by county, insurer, facility type and consultation fee.
        </p>
      </header>

      <div className="grid gap-7 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <form className="card space-y-4 p-5" onSubmit={(e) => e.preventDefault()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-navy">Filters</h2>
              {total > 0 && <Badge tone="neutral">{total} found</Badge>}
            </div>

            <Field label="Search" htmlFor="f-q">
              <input
                id="f-q"
                type="search"
                className="field-input"
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Hospital or service"
              />
            </Field>

            <Field label="County" htmlFor="f-county">
              <input
                id="f-county"
                className="field-input"
                value={filters.county}
                onChange={(e) => update({ county: e.target.value })}
                placeholder="e.g. Nairobi"
              />
            </Field>

            <Field label="Insurance" htmlFor="f-ins">
              <select
                id="f-ins"
                className="field-input"
                value={filters.insurance}
                onChange={(e) => update({ insurance: e.target.value })}
              >
                <option value="">Any insurer</option>
                {insurers.map((provider) => (
                  <option key={provider.id ?? provider.name} value={provider.name}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Facility type" htmlFor="f-type">
              <select
                id="f-type"
                className="field-input"
                value={filters.facility_type}
                onChange={(e) => update({ facility_type: e.target.value })}
              >
                <option value="">Any type</option>
                <option value="public_hospital">Public hospital</option>
                <option value="private_hospital">Private hospital</option>
                <option value="specialist_clinic">Specialist clinic</option>
                <option value="teaching_hospital">Teaching hospital</option>
              </select>
            </Field>

            <label className="flex items-center gap-2.5 text-sm font-medium text-navy">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-navy/25 text-brand-500"
                checked={filters.open_only}
                onChange={(e) => update({ open_only: e.target.checked })}
              />
              Open now only
            </label>

            <button
              type="button"
              className="btn-ghost w-full border border-navy/10"
              onClick={() => update({ q: '', county: '', insurance: '', facility_type: '', open_only: false })}
            >
              Clear filters
            </button>
          </form>
        </aside>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-navy/60" aria-live="polite">
              {state === 'loading' ? 'Searching…' : `${total} ${total === 1 ? 'facility' : 'facilities'}`}
            </p>

            <label className="flex items-center gap-2 text-sm text-navy/60">
              <span className="hidden sm:inline">Sort by</span>
              <select
                className="field-input w-auto py-1.5"
                value={sort}
                onChange={(e) => { setPage(0); setSort(e.target.value); }}
                aria-label="Sort results"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {state === 'loading' && <LoadingBlock label="Loading hospitals…" />}

          {state === 'error' && <ErrorState message={error} onRetry={() => setPage((p) => p)} />}

          {state === 'ready' && results.length === 0 && (
            <EmptyState
              title="No hospitals matched"
              description="Try removing a filter or searching for a different county or service."
            />
          )}

          {state === 'ready' && results.length > 0 && (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {results.map((hospital) => (
                  <HospitalCard key={hospital.id} hospital={hospital} />
                ))}
              </div>

              {pageCount > 1 && (
                <nav className="mt-9 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="px-3 text-sm text-navy/60">
                    Page {page + 1} of {pageCount}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={page >= pageCount - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}