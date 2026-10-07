import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { CloseIcon, MenuIcon } from './icons.jsx';

const NAV = [
  { to: '/hospitals', label: 'Find a hospital' },
  { to: '/intake', label: 'Patient intake' },
  { to: '/about', label: 'About' },
];

export function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Logo />
          <span className="text-lg font-extrabold tracking-tight text-navy">
            Gland<span className="text-brand-500">Find</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="max-w-[14ch] truncate text-sm text-navy/65" title={user.email}>
                {user.full_name}
              </span>
              <button type="button" className="btn-ghost" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link className="btn-ghost" to="/login">Sign in</Link>
              <Link className="btn-primary" to="/register">Create account</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-ghost px-2 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Toggle navigation</span>
          {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-navy/10 bg-white md:hidden">
          <nav className="container-page flex flex-col py-2" aria-label="Main">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-navy/10 pt-3">
              {user ? (
                <button type="button" className="btn-secondary" onClick={logout}>Sign out</button>
              ) : (
                <>
                  <Link className="btn-secondary" to="/login" onClick={() => setOpen(false)}>Sign in</Link>
                  <Link className="btn-primary" to="/register" onClick={() => setOpen(false)}>Create account</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({ to, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-navy/70 transition hover:bg-navy/5 hover:text-navy"
    >
      {children}
    </Link>
  );
}

function Logo() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M12 3.5c-3.6 3.4-5.4 6.6-5.4 9.6a5.4 5.4 0 0 0 10.8 0c0-3-1.8-6.2-5.4-9.6Z"
          fill="white"
        />
      </svg>
    </span>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-navy/10 bg-navy text-white/70">
      <div className="container-page flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-bold text-white">GlandFind</span> — Kenya&apos;s medical search platform.
        </p>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          <Link className="hover:text-white" to="/hospitals">Hospitals</Link>
          <Link className="hover:text-white" to="/intake">Patient intake</Link>
          <Link className="hover:text-white" to="/about">About</Link>
        </nav>
      </div>
    </footer>
  );
}