// Minimal JWT — HS256 only, no external dependency.
import crypto from 'node:crypto';

const b64url = (input) => Buffer.from(input).toString('base64url');
const from64 = (s) => Buffer.from(s, 'base64url').toString('utf8');

const HEADER = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

export function sign(payload, secret, expiresInSec = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const signature = crypto.createHmac('sha256', secret).update(`${HEADER}.${body}`).digest('base64url');
  return `${HEADER}.${body}.${signature}`;
}

export function verify(token, secret) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

  const givenBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (givenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(givenBuf, expectedBuf)) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(from64(body));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}