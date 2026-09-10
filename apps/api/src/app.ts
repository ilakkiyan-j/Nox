import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { apiError } from './lib/http';
import { requireAuth, requireAdmin } from './middleware/auth';
import { globalErrorHandler } from './middleware/error';

import healthRouter from './routes/health';
import { authPublicRouter, authPrivateRouter } from './routes/auth';
import adminRouter from './routes/admin';
import dashboardRouter from './routes/dashboard';
import goalsRouter from './routes/goals';
import roadmapsRouter from './routes/roadmaps';
import tasksRouter from './routes/tasks';
import learningRouter from './routes/learning';
import eventsRouter from './routes/events';
import habitsRouter from './routes/habits';
import notesRouter from './routes/notes';
import remindersRouter from './routes/reminders';
import notificationsRouter from './routes/notifications';
import timeRouter from './routes/time';
import searchRouter from './routes/search';

export function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  // ---- Security headers --------------------------------------------------------
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), sync-xhr=()',
    );
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // ---- CORS (restricted to configured origin when available) -------------------
  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      origin: corsOrigin
        ? corsOrigin.split(',').map((o) => o.trim())
        : function (origin, cb) {
            // Default: allow same-origin / no-origin requests (curl, server-to-server).
            if (!origin) return cb(null, true);
            const localDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
            return cb(null, localDevOrigin || !isProduction);
          },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.use(express.json({ limit: '512kb' }));

  // ---- Rate limiting ------------------------------------------------------------
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 1000 : 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many login attempts. Please try again in 15 minutes.' } },
  });

  const importLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many roadmap import requests. Please try again later.' } },
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests. Please slow down.' } },
  });

  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/roadmaps/import', importLimiter);
  app.use('/api/v1', apiLimiter);

  app.use('/api/v1', healthRouter);
  app.use('/api/v1', authPublicRouter);

  // All routes below /api/v1 require authentication.
  app.use('/api/v1', requireAuth);
  app.use('/api/v1', authPrivateRouter);
  app.use('/api/v1/admin', requireAdmin, adminRouter);
  app.use('/api/v1', dashboardRouter);
  app.use('/api/v1', goalsRouter);
  app.use('/api/v1', roadmapsRouter);
  app.use('/api/v1', tasksRouter);
  app.use('/api/v1', learningRouter);
  app.use('/api/v1', eventsRouter);
  app.use('/api/v1', habitsRouter);
  app.use('/api/v1', notesRouter);
  app.use('/api/v1', remindersRouter);
  app.use('/api/v1', notificationsRouter);
  app.use('/api/v1', timeRouter);
  app.use('/api/v1', searchRouter);

  // 404 for unmatched API routes
  app.use('/api/v1', (req, res) => {
    return apiError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
  });

  // Global error handler (last middleware)
  app.use(globalErrorHandler);

  return app;
}