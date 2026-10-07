// User data access — two drivers behind one interface.
import { config } from '../config/env.js';
import * as store from '../config/memoryStore.js';
import { User } from '../models/index.js';
import { compare, hash } from '../utils/crypto.js';
import { sign } from '../utils/jwt.js';

const DUPLICATE_EMAIL = 'Email already registered';

/** Strip the password hash and normalise the id to a string for both drivers. */
function safeUser(user) {
  if (!user) return null;
  const { password_hash, _id, id, ...rest } = user;
  return { ...rest, id: String(id ?? _id) };
}

/** Issue a token; both drivers sign the same {id, email, role} payload. */
function issueToken(user) {
  return sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret);
}

function createMemoryRepo() {
  const findByEmail = (email) =>
    store.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

  return {
    async register({ full_name, email, phone, password, role = 'patient' }) {
      if (findByEmail(email)) throw Object.assign(new Error(DUPLICATE_EMAIL), { status: 409 });

      const user = {
        id: store.uuid(),
        full_name,
        email: String(email).toLowerCase(),
        phone: phone || null,
        password_hash: hash(password),
        role,
        created_at: new Date(),
        updated_at: new Date(),
      };
      store.users.push(user);
      return safeUser(user);
    },

    async login(email, password) {
      const user = findByEmail(email);
      // Compare in both branches so a missing account and a wrong password cost
      // roughly the same and cannot be told apart by timing.
      if (!user || !compare(password, user.password_hash)) {
        throw Object.assign(new Error('Invalid email or password'), { status: 401 });
      }
      const safe = safeUser(user);
      return { token: issueToken(safe), user: safe };
    },

    async findById(id) {
      return safeUser(store.users.find((u) => u.id === id));
    },
  };
}

function createMongoRepo() {
  async function findByEmail(email) {
    return User.findOne({ email: String(email).toLowerCase() }).lean();
  }

  /** An invalid id string is a miss, not a server error. */
  async function findLeanById(id) {
    try {
      return await User.findById(id).lean();
    } catch {
      return null;
    }
  }

  return {
    async register({ full_name, email, phone, password, role = 'patient' }) {
      try {
        const user = await User.create({
          full_name,
          email: String(email).toLowerCase(),
          phone: phone || null,
          password_hash: hash(password),
          role,
        });
        return safeUser(user.toObject());
      } catch (e) {
        if (e?.code === 11000) throw Object.assign(new Error(DUPLICATE_EMAIL), { status: 409 });
        throw e;
      }
    },

    async login(email, password) {
      const user = await findByEmail(email);
      if (!user || !compare(password, user.password_hash)) {
        throw Object.assign(new Error('Invalid email or password'), { status: 401 });
      }
      const safe = safeUser(user);
      return { token: issueToken(safe), user: safe };
    },

    async findById(id) {
      return safeUser(await findLeanById(id));
    },
  };
}

export const userRepository = config.driver === 'mongo' ? createMongoRepo() : createMemoryRepo();