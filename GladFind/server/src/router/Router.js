// Pure Node.js router — no Express, no external packages.
// Matches method + URL pattern, extracts named params, then runs a middleware chain.
import { err } from '../utils/http.js';

export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, ...handlers) {
    const keys = [];
    const pattern_source = pattern.replace(/:([^/]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });

    this.routes.push({
      method,
      regex: new RegExp(`^${pattern_source}$`),
      keys,
      handlers,
    });
    return this;
  }

  get(pattern, ...handlers) { return this.add('GET', pattern, ...handlers); }
  post(pattern, ...handlers) { return this.add('POST', pattern, ...handlers); }
  put(pattern, ...handlers) { return this.add('PUT', pattern, ...handlers); }
  patch(pattern, ...handlers) { return this.add('PATCH', pattern, ...handlers); }
  delete(pattern, ...handlers) { return this.add('DELETE', pattern, ...handlers); }

  /**
   * Handle an incoming request. Returns true when a route matched, so the caller
   * can distinguish "not found" from "handler threw".
   */
  async handle(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '') || '/';
    const method = req.method.toUpperCase();

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = pathname.match(route.regex);
      if (!match) continue;

      req.params = {};
      route.keys.forEach((key, i) => {
        req.params[key] = decodeURIComponent(match[i + 1]);
      });

      let cursor = 0;
      // Middleware must `return next()` for this to await the whole chain;
      // calling next() without returning it would resolve here early and let
      // the caller observe a half-finished request.
      const next = () => {
        if (cursor >= route.handlers.length) return undefined;
        return route.handlers[cursor++](req, res, next);
      };

      try {
        await next();
      } catch (e) {
        console.error('[router] unhandled error:', e);
        if (!res.headersSent) err(res, e.status || 500, e.message || 'Internal server error');
      }
      return true;
    }

    return false;
  }
}