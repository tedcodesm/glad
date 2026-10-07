import { createServer } from '../../src/app.js';
import { reset } from '../../src/config/memoryStore.js';

let server;
let baseUrl;

/** Boot the app on an ephemeral port. Call once per test file. */
export async function startServer() {
  server = createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return baseUrl;
}

export async function stopServer() {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
  server = undefined;
}

export function getBaseUrl() {
  return baseUrl;
}

/** Clear every writable collection so suites cannot leak into each other. */
export function resetStore() {
  reset();
}

/** Thin fetch wrapper returning `{ status, body }`. */
export async function request(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  return { status: res.status, body: parsed };
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, token) => request('POST', path, { body, token }),
  put: (path, body, token) => request('PUT', path, { body, token }),
  patch: (path, body, token) => request('PATCH', path, { body, token }),
};

/** Register + log in in one step; returns `{ token, user }`. */
export async function signUp({ full_name, email, password, role }) {
  const created = await api.post('/api/auth/register', { full_name, email, password, role });
  if (created.status !== 201) {
    throw new Error(`register failed (${created.status}): ${JSON.stringify(created.body)}`);
  }
  const login = await api.post('/api/auth/login', { email, password });
  return login.body;
}