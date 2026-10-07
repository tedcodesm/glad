// Process entry point — owns the HTTP socket and the database lifecycle.
// The handler itself lives in app.js so tests can mount it without listening.
import { createServer } from './app.js';
import { config, envFile } from './config/env.js';
import { connect, disconnect } from './config/mongoose.js';
let shuttingDown = false;

const server = createServer();

async function start() {
  if (config.driver === 'mongo') {
    try {
      await connect();
    } catch (e) {
      // Fail loudly rather than silently serving 500s from a dead pool.
      console.error(`[startup] Could not reach MongoDB at the configured URI: ${e.message}`);
      console.error('[startup] Set DATA_DRIVER=memory to run without a database.');
      process.exit(1);
    }
  } else {
    console.log('[startup] DATA_DRIVER=memory — using the in-memory demo dataset, no database required.');
  }

  const listener = server.listen(config.port, () => {
    console.log(`GlandFind API listening on http://localhost:${config.port} (driver: ${config.driver})`);
    if (envFile) console.log(`[startup] env loaded from ${envFile}`);
  });

  listener.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`[startup] Port ${config.port} is already in use.`);
      console.error('[startup] Close whatever is using it, or set PORT in .env to a free port.');
      process.exit(1);
    }
    throw e;
  });

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[${signal}] shutting down…`);

    // Stop accepting connections, then release the database handle.
    await new Promise((resolve) => listener.close(resolve));
    if (config.driver === 'mongo') await disconnect();

    console.log('[shutdown] complete');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Every request is already wrapped by app.js, so a rejection reaching here is
  // a bug worth surfacing rather than a per-request failure.
  process.on('unhandledRejection', (reason) => {
    console.error('[fatal] unhandled rejection:', reason);
  });
}

start().catch((e) => {
  console.error('[fatal] startup failed:', e);
  process.exit(1);
});