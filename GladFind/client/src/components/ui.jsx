import { StarIcon } from './icons.jsx';

export function Badge({ tone = 'neutral', children, ...rest }) {
  return (
    <span className={`badge ${TONES[tone] ?? TONES.neutral}`} {...rest}>
      {children}
    </span>
  );
}

const TONES = {
  neutral: 'bg-navy/8 text-navy/70',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-brand-50 text-brand-700',
  warning: 'bg-accent-soft text-accent-dark',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info/10 text-info',
};

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-navy/60">
      <Spinner className="h-5 w-5 text-brand-500" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="text-lg font-bold text-navy">{title}</h3>
      {description && <p className="max-w-md text-sm text-navy/60">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-danger/30 bg-danger-soft/40 px-6 py-12 text-center">
      <h3 className="text-lg font-bold text-danger">Something went wrong</h3>
      <p className="max-w-md text-sm text-navy/70">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary mt-1" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Alert({ tone = 'info', title, children }) {
  return (
    <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${ALERT_TONES[tone] ?? ALERT_TONES.info}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children}
    </div>
  );
}

const ALERT_TONES = {
  info: 'border-info/25 bg-info/5 text-info',
  error: 'border-danger/30 bg-danger-soft/60 text-danger',
  success: 'border-brand-500/30 bg-brand-50 text-brand-700',
  warning: 'border-accent/40 bg-accent-soft text-accent-dark',
};

/** Renders a rating like 4.8 with a filled/empty star row. */
export function Rating({ value = 0, count, className = '' }) {
  const rounded = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <span aria-hidden="true" className="flex items-center gap-0.5 text-accent">
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon key={i} className={`h-3.5 w-3.5 ${i < rounded ? '' : 'text-navy/15'}`} />
        ))}
      </span>
      <span className="font-semibold text-navy">{value ? value.toFixed(1) : 'New'}</span>
      {count != null && <span className="text-navy/45">({count.toLocaleString()})</span>}
      <span className="sr-only">{`Rated ${value} out of 5`}</span>
    </span>
  );
}

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div>
      {label && <label className="field-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-navy/50">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}