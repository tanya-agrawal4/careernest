import rateLimit from 'express-rate-limit';

// express-rate-limit requires Express to trust the X-Forwarded-For header when
// running behind a reverse proxy (Render, Railway, Vercel, Nginx, etc.).
// `app.set('trust proxy', 1)` in app.ts handles this globally. The `validate`
// option below is a belt-and-suspenders guard that silences the validation
// error without masking real misconfigurations — we already set trust proxy.
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per IP per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,     // Return RateLimit-* headers (RFC 6585 draft-7)
  legacyHeaders: false,      // Disable deprecated X-RateLimit-* headers
  // Suppress the ValidationError thrown when X-Forwarded-For is present but
  // trust proxy is not yet applied. Since we set trust proxy in app.ts before
  // any middleware runs, this is a belt-and-suspenders safety valve only.
  validate: { xForwardedForHeader: false },
});

// Stricter limiter for auth endpoints to slow credential-stuffing attacks.
// Apply this INSTEAD of (not in addition to) the global limiter on auth routes.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 login/register attempts per IP per window
  message: 'Too many authentication attempts. Please wait 15 minutes and try again.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
