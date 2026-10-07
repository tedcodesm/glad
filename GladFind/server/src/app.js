// Builds the request handler without calling listen(), so tests can drive the
// app in-process. `index.js` owns the socket.
import http from 'node:http';
import { cors } from './middleware/cors.js';
import { router } from './router/routes.js';
import { serveStatic } from './middleware/static.js';
import { err } from './utils/http.js';
import { isProduction } from './config/env.js';

export function createApp() {
  return async function handler(req, res) {
    if (cors(req, res)) return;

    try {
      const matched = await router.handle(req, res);
      if (!matched) {
        // In production, non-API paths are served from the client build.
        // In development the Vite dev server owns those URLs.
        if (isProduction && serveStatic(req, res)) return;
        err(res, 404, `Cannot ${req.method} ${req.url}`);
        return;
      }
      // A matched route that produced no response (e.g. a handler returned
      // early) would otherwise leave the socket hanging.
      if (!res.writableEnded) {
        err(res, 500, 'Handler produced no response');
      }
    } catch (e) {
      console.error('[app] unhandled error:', e);
      if (!res.headersSent) err(res, e.status || 500, e.message || 'Internal server error');
    }
  };
}

/** An http.Server that is not yet listening — tests can bind it to port 0. */
export function createServer() {
  return http.createServer(createApp());
}