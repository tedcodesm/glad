import { userRepository } from '../repositories/index.js';
import { err, ok, parseBody } from '../utils/http.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// `platform_admin` is deliberately absent: registration may never mint one.
const SELF_REGISTER_ROLES = ['patient', 'hospital_admin'];

export async function register(req, res) {
  const body = await parseBody(req);
  const { full_name, email, phone, password, role } = body;

  if (!full_name?.trim()) return err(res, 400, 'full_name is required');
  if (!email || !EMAIL_RE.test(email)) return err(res, 400, 'Valid email is required');
  if (!password || password.length < 8) return err(res, 400, 'Password must be at least 8 characters');
  if (role && !SELF_REGISTER_ROLES.includes(role)) {
    return err(res, 400, `role must be one of: ${SELF_REGISTER_ROLES.join(', ')}`);
  }

  try {
    const user = await userRepository.register({ full_name: full_name.trim(), email, phone, password, role });
    ok(res, { user }, 201);
  } catch (e) {
    err(res, e.status || 500, e.message);
  }
}

export async function login(req, res) {
  const body = await parseBody(req);
  const { email, password } = body;

  if (!email || !password) return err(res, 400, 'email and password are required');

  try {
    ok(res, await userRepository.login(email, password));
  } catch (e) {
    err(res, e.status || 500, e.message);
  }
}

export async function me(req, res) {
  const user = await userRepository.findById(req.user.id);
  if (!user) return err(res, 404, 'User not found');
  ok(res, { user });
}