// PBKDF2-based password hashing — no bcrypt, no external dependency.
// Stored format: pbkdf2$sha256$<iterations>$<salt_hex>$<hash_hex>
import crypto from 'node:crypto';

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = 'sha256';
const SALT_BYTES = 32;

export function hash(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return `pbkdf2$${DIGEST}$${ITERATIONS}$${salt}$${derived}`;
}

export function compare(password, stored) {
  if (typeof stored !== 'string') return false;
  const [, digest, iterations, salt, expected] = stored.split('$');
  if (!digest || !iterations || !salt || !expected) return false;

  const derived = crypto.pbkdf2Sync(password, salt, Number(iterations), KEYLEN, digest);
  const expectedBuf = Buffer.from(expected, 'hex');
  // timingSafeEqual throws when buffer lengths differ, so guard first.
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}