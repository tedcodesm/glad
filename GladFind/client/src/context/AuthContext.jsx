import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Api, setToken } from '../lib/api.js';

const AuthContext = createContext(null);

/**
 * Holds the signed-in user. The token lives in localStorage so a refresh keeps
 * the session; on mount we re-validate it against /api/auth/me rather than
 * trusting whatever shape happens to be cached in the browser.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const me = await Api.me();
        if (!cancelled) setUser(me);
      } catch {
        // No token, or an expired one — either way the user is signed out.
        setToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setStatus('ready');
      }
    }

    restore();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: signedIn } = await Api.login({ email, password });
    setToken(token);
    setUser(signedIn);
    return signedIn;
  }, []);

  const register = useCallback(async (payload) => {
    const created = await Api.register(payload);
    // Registering does not return a token, so sign in straight away to give the
    // new account a session rather than making them type their password again.
    await login(payload.email, payload.password);
    return created;
  }, [login]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, isAuthenticated: !!user }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an <AuthProvider>');
  return context;
}