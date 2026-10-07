import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Alert, Field, Spinner } from '../components/ui.jsx';
import { AuthShell } from './Login.jsx';

const ROLES = [
  { value: 'patient', label: 'Patient', hint: 'Book appointments and keep a health profile' },
  { value: 'hospital_admin', label: 'Hospital administrator', hint: 'List a facility and manage its bookings' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm: '', role: 'patient',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
      });
      toast.success('Account created — welcome to GlandFind');
      navigate(form.role === 'hospital_admin' ? '/register' : '/profile', { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="It takes under a minute.">
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Full name" htmlFor="full_name">
          <input id="full_name" className="field-input" value={form.full_name} required
            onChange={(e) => set('full_name', e.target.value)} autoComplete="name" autoFocus />
        </Field>

        <Field label="Email" htmlFor="email">
          <input id="email" type="email" className="field-input" value={form.email} required
            onChange={(e) => set('email', e.target.value)} autoComplete="email" />
        </Field>

        <Field label="Phone" htmlFor="phone" hint="Optional — hospitals use this for appointment confirmations">
          <input id="phone" type="tel" className="field-input" value={form.phone}
            onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Password" htmlFor="password" hint="At least 8 characters">
            <input id="password" type="password" className="field-input" value={form.password} required
              onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirm password" htmlFor="confirm">
            <input id="confirm" type="password" className="field-input" value={form.confirm} required
              onChange={(e) => set('confirm', e.target.value)} autoComplete="new-password" />
          </Field>
        </div>

        <fieldset>
          <legend className="field-label">I am signing up as</legend>
          <div className="space-y-2">
            {ROLES.map((role) => (
              <label
                key={role.value}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${
                  form.role === role.value ? 'border-brand-500 bg-brand-50' : 'border-navy/15'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={form.role === role.value}
                  onChange={(e) => set('role', e.target.value)}
                  className="mt-1 h-4 w-4 shrink-0 border-navy/25 text-brand-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-navy">{role.label}</span>
                  <span className="block text-xs text-navy/55">{role.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner />}
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-xs leading-relaxed text-navy/50">
          By creating an account you agree to the GlandFind terms of service and privacy policy.
          Your health data is never sold.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-navy/60">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}