// Serves the pre-built Vite SPA from client/dist.
// Only active when NODE_ENV=production; in dev the client runs on its own
// origin and Vite's proxy handles /api forwarding.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream, statSync } from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
// server/src/middleware  →  GladFind/client/dist
const DIST = path.resolve(here, '..', '..', '..', 'client', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

const INDEX = path.join(DIST, 'index.html');

/**
 * Serve static assets from client/dist.
 * Returns true if the response was handled (caller should return early).
 *
 * Call AFTER all /api/* routes so the API always wins.
 */
export function serveStatic(req, res) {
  // Only GET / HEAD make sense for static files
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  // Sanitise the path and resolve inside DIST to prevent path traversal
  const unsafe = decodeURIComponent(req.url.split('?')[0]);
  const rel = path.normalize(unsafe).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.join(DIST, rel);

  // Must be inside the dist directory
  if (!candidate.startsWith(DIST)) return false;

  let target = candidate;

  // If the exact file doesn't exist, fall back to index.html (SPA routing)
  try {
    const stat = statSync(target);
    if (stat.isDirectory()) {
      target = path.join(target, 'index.html');
      statSync(target); // throws if missing
    }
  } catch {
    // Anything that isn't a known asset path falls back to index.html
    try {
      statSync(INDEX);
      target = INDEX;
    } catch {
      return false; // dist not built yet — let the router return 404
    }
  }

  const ext = path.extname(target).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  // Aggressive caching for hashed assets (e.g. /assets/index-Abc123.js),
  // no caching for index.html so the browser always fetches the latest shell.
  const isHashed = target !== INDEX && rel.startsWith('assets' + path.sep);
  const cacheControl = isHashed
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', cacheControl);
  res.writeHead(200);

  if (req.method === 'HEAD') {
    res.end();
  } else {
    createReadStream(target).pipe(res);
  }

  return true;
}
