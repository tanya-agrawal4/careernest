import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Apply a stricter per-IP rate limit on all auth endpoints to slow
// credential-stuffing and brute-force attacks (20 req / 15 min per IP).
router.use(authRateLimiter);

// POST /api/auth/register
// Body: { email, password, role: 'STUDENT' | 'RECRUITER', ...role-specific fields }
router.post('/register', register);

// POST /api/auth/login
// Body: { email, password }
// Returns: { token: string, user: { userId, email, role } }
router.post('/login', login);

export default router;
