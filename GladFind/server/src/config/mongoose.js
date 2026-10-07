// Mongoose connection management. Replaces the old `pg.js` pool module.
//
// The API runs in two data modes:
//   DATA_DRIVER=memory  — no database is touched at all; see config/memoryStore.js
//   DATA_DRIVER=mongo   — this module owns the connection

import mongoose from 'mongoose';
import { config } from './env.js';

const log = (msg) => console.log(`[mongo] ${msg}`);

mongoose.set('strictQuery', true);

mongoose.connection.on('connected', () => log(`connected -> ${masked(config.mongoUri)}`));
mongoose.connection.on('error', (err) => console.error('[mongo] connection error:', err.message));
mongoose.connection.on('disconnected', () => log('disconnected'));
mongoose.connection.on('reconnected', () => log('reconnected'));

/** Hide credentials before printing a connection string. */
function masked(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

let connecting = null;

export async function connect() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    connecting = mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }
  await connecting;
  await mongoose.connection.syncIndexes();
  return mongoose.connection;
}

export async function disconnect() {
  connecting = null;
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}

export function isConnected() {
  return mongoose.connection.readyState === 1;
}

export default mongoose;