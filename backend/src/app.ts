import express from 'express';
import type { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import jobRoutes from './routes/job.routes.js';
import eligibilityRoutes from './routes/eligibility.routes.js';
import prisma from './config/prismaClient.js';

// ESM-safe __dirname: resolves correctly in both dev (ts-node-dev) and
// production (dist/) because it is derived from the current file URL,
// not a compile-time constant.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Application = express();

// Trust Render / Vercel / Nginx reverse-proxy so Express reads the real
// client IP from X-Forwarded-For.  Required for express-rate-limit to work
// correctly on hosted platforms (Render, Railway, Vercel, etc.).
app.set('trust proxy', 1);

// =============================================================================
// Security Middlewares
// =============================================================================
app.use(helmet());
app.use(
  cors({
    origin: process.env['CORS_ORIGIN']?.split(',') ?? [
      'http://localhost:5173',
      'http://localhost:4173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());
app.use(morgan('dev'));

// Global rate limiter - applied before any route is processed
app.use(globalRateLimiter);

// =============================================================================
// Static File Serving - /uploads
// =============================================================================
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// =============================================================================
// Health Checks
// =============================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// DB connectivity diagnostic: GET /api/health/db
// Use this to confirm Prisma can reach MongoDB Atlas from the deployed
// environment (Render, Railway, etc.).
// Returns 200 if the DB round-trip succeeds, 503 if it fails.
app.get('/api/health/db', async (_req: Request, res: Response) => {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    res.status(200).json({ status: 'ok', message: 'Database connection is healthy.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/health/db] Database connection failed:', message);
    res.status(503).json({ status: 'error', message: 'Database connection failed.', detail: message });
  }
});

// =============================================================================
// API Routes
// =============================================================================
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/eligibility', eligibilityRoutes);

export default app;
