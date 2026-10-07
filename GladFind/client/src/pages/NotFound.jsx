import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-500">404</p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-navy">
        We couldn&apos;t find that page
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-navy/60">
        The link may be out of date, or the page may have moved.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">Back home</Link>
        <Link to="/hospitals" className="btn-secondary">Find a hospital</Link>
      </div>
    </div>
  );
}