// Thin fetch wrapper around the GlandFind API.
//
// In development Vite proxies /api to the API process (see vite.config.js), so a
// relative base URL works and there is no CORS preflight. A deployment can point
// the client at a separate host by setting VITE_API_URL at build time.

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const TOKEN_KEY = 'glandfind.token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private browsing modes can throw on localStorage access.
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — the session simply won't persist */
  }
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Serialise a params object into a query string, dropping empty values. */
export function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '' || value === false) continue;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v));
    else search.append(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request(method, path, { body, token, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  const bearer = auth ? (token ?? getToken()) : token;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects on a network/CORS failure, never on a 4xx/5xx.
    throw new ApiError(0, 'Could not reach the GlandFind API. Is the server running?');
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error || `Request failed (${response.status})`,
      payload?.details,
    );
  }

  return payload;
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  delete: (path, opts) => request('DELETE', path, opts),
};

// -- Endpoint helpers ----------------------------------------------------
export const Api = {
  health: () => api.get('/api/health'),

  categories: () => api.get('/api/categories').then((r) => r.categories),
  insurance: () => api.get('/api/insurance').then((r) => r.providers),

  searchHospitals: (params) => api.get(`/api/hospitals${toQuery(params)}`),
  hospital: (id) => api.get(`/api/hospitals/${id}`).then((r) => r.hospital),

  register: (payload) => api.post('/api/auth/register', payload).then((r) => r.user),
  login: (payload) => api.post('/api/auth/login', payload),
  me: () => api.get('/api/auth/me', { auth: true }).then((r) => r.user),

  bookAppointment: (payload) => api.post('/api/appointments', payload, { auth: true }).then((r) => r.appointment),
  myAppointments: (params) => api.get(`/api/appointments/mine${toQuery(params)}`, { auth: true }),

  submitIntake: (payload) => api.post('/api/patient-profiles', payload, { auth: true }).then((r) => r.profile),
  myIntake: () => api.get('/api/patient-profiles/mine', { auth: true }).then((r) => r.profile),
  lookupIntake: (code) => api.get(`/api/patient-profiles/${encodeURIComponent(code)}`).then((r) => r.profile),
};