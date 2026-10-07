import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Alert, Field, Spinner } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // When a protected page sent us here, go back there once signed in.
  const destination = location.state?.from ?? '/profile';

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}`);
      navigate(destination, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your appointments and intake record.">
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Email" htmlFor="email">
          <input id="email" type="email" className="field-input" value={email} required
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
        </Field>

        <Field label="Password" htmlFor="password">
          <input id="password" type="password" className="field-input" value={password} required
            onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner />}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-navy/60">
        New to GlandFind?{' '}
        <Link to="/register" state={location.state} className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children, aside }) {
  return (
    <div className="container-page grid gap-10 py-16 lg:grid-cols-2 lg:items-center">
      <div className="card mx-auto w-full max-w-md p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-navy/60">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </div>

      <div className="hidden lg:block">
        {aside ?? (
          <div className="rounded-2xl bg-navy p-10 text-white">
            <h2 className="font-serif text-3xl leading-snug">
              “To make every healthcare service in Kenya searchable, comparable and bookable.”
            </h2>
            <p className="mt-5 text-sm text-white/60">
              Join patients, hospitals and insurers on one transparent platform.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}