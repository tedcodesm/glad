import { Router } from './Router.js';
import { config } from '../config/env.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { ok } from '../utils/http.js';

import * as auth from '../controllers/authController.js';
import * as hosp from '../controllers/hospitalController.js';
import * as appt from '../controllers/appointmentController.js';
import * as profile from '../controllers/patientProfileController.js';

const ADMIN = ['hospital_admin', 'platform_admin'];

export const router = new Router();

// -- Health --------------------------------------------------------------
// Also reports which data driver is live, which is the single most useful
// thing to know when a fresh checkout behaves like demo mode.
router.get('/api/health', (req, res) => {
  ok(res, {
    status: 'ok',
    driver: config.driver,
    uptime_sec: Math.round(process.uptime()),
    env: config.nodeEnv,
  });
});

// -- Auth ----------------------------------------------------------------
router.post('/api/auth/register', auth.register);
router.post('/api/auth/login', auth.login);
router.get('/api/auth/me', authenticate, auth.me);

// -- Reference data ------------------------------------------------------
router.get('/api/categories', hosp.listCategories);
router.get('/api/insurance', hosp.listInsurance);

// -- Hospitals -----------------------------------------------------------
// Controllers take (req, res) only and read ids from req.params, so they are
// registered directly — a wrapper would hand them the router's `next` as a
// third positional argument.
router.get('/api/hospitals', hosp.search);
router.get('/api/hospitals/:id', hosp.getOne);

router.post('/api/hospitals', authenticate, requireRole(...ADMIN), hosp.create);
router.put('/api/hospitals/:id', authenticate, requireRole(...ADMIN), hosp.update);
router.post('/api/hospitals/:id/services', authenticate, requireRole(...ADMIN), hosp.addService);
router.get('/api/hospitals/:id/appointments', authenticate, requireRole(...ADMIN), appt.hospitalAppointments);

// -- Appointments --------------------------------------------------------
// Booking is public; a valid token links the booking to a patient account.
router.post('/api/appointments', optionalAuth, appt.book);

router.get('/api/appointments/mine', authenticate, appt.myAppointments);
router.get('/api/appointments/:id', authenticate, appt.getOne);
router.patch('/api/appointments/:id/status', authenticate, requireRole(...ADMIN), appt.updateStatus);

// -- Patient intake ------------------------------------------------------
// `/mine` is declared before `/:code` so the literal path is never swallowed
// by the parameterised route.
router.get('/api/patient-profiles/mine', authenticate, profile.mine);
router.post('/api/patient-profiles', optionalAuth, profile.submit);
router.get('/api/patient-profiles/:code', profile.lookup);