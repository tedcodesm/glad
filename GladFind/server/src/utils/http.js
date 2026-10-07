// Pure Node.js HTTP helpers — response envelope, body and query parsing.

const MAX_BODY_BYTES = 1_048_576; // 1 MiB

export function send(res, status, data) {
  // A handler that already responded (or threw after responding) must not
  // crash the process with ERR_HTTP_HEADERS_SENT — log and drop instead.
  if (res.headersSent || res.writableEnded) {
    console.error(`[http] attempted a second response (${status}); first response already sent`);
    return;
  }

  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** Success envelope: `{ success: true, ...data }` */
export function ok(res, data, status = 200) {
  send(res, status, { success: true, ...data });
}

/** Failure envelope: `{ success: false, error, details? }` */
export function err(res, status, message, details = null) {
  send(res, status, { success: false, error: message, ...(details ? { details } : {}) });
}

/** Attach an HTTP status code to an Error so the router can surface it. */
export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(httpError(413, 'Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(httpError(400, 'Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}

/** Flat query object; repeated keys collapse into arrays (`?insurance=a&insurance=b`). */
export function parseQuery(url) {
  const params = new URL(url, 'http://localhost').searchParams;
  const out = {};
  for (const key of params.keys()) {
    const values = params.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
}