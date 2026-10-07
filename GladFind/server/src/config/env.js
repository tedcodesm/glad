// Minimal .env loader — no dotenv dependency.
// Walks up from this file so it works when run from the repo root or server/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

function parse(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = value;
  }
  return out;
}

export function loadEnv() {
  for (const dir of [process.cwd(), repoRoot, path.resolve(repoRoot, 'server')]) {
    const file = path.join(dir, '.env');
    if (!fs.existsSync(file)) continue;
    for (const [key, value] of Object.entries(parse(fs.readFileSync(file, 'utf8')))) {
      // Real environment variables always win over the file.
      if (!(key in process.env)) process.env[key] = value;
    }
    return path.relative(repoRoot, file) || '.env';
  }
  return null;
}

export const envFile = loadEnv();

export const config = {
  port: Number(process.env.PORT) || 3000,
  driver: process.env.DATA_DRIVER === 'mongo' ? 'mongo' : 'memory',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/glandfind',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

export const isProduction = config.nodeEnv === 'production';