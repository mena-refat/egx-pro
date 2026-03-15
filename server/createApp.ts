import './lib/dotenv.ts';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

import { validateEnv } from './lib/env.ts';
import { logger } from './lib/logger.ts';
import { RATE_LIMITS } from './lib/constants.ts';
import { AppError } from './lib/errors.ts';
import { sanitizeInput } from './lib/sanitize.ts';
import authRoutes from './routes/auth.ts';
import portfolioRoutes from './routes/portfolio.ts';
import stocksRoutes from './routes/stocks.ts';
import analysisRoutes from './routes/analysis.ts';
import userRoutes from './routes/user.ts';
import profileRoutes from './routes/profile.ts';
import watchlistRoutes from './routes/watchlist.ts';
import goalsRoutes from './routes/goals.ts';
import notificationsRoutes from './routes/notifications.ts';
import billingRoutes from './routes/billing.ts';
import newsRoutes from './routes/news.ts';
import referralRoutes from './routes/referral.ts';
import marketDataRoutes from './routes/market-data.ts';
import socialRoutes from './routes/social.ts';
import predictionsRoutes from './routes/predictions.ts';
import { userApiLimiter } from './middleware/userRateLimit.middleware.ts';
import { prisma } from './lib/prisma.ts';
import { redis } from './lib/redis.ts';
import { marketDataService } from './services/market-data/market-data.service.ts';

/**
 * Build and return the Express app (no listen, no Vite).
 * Use for testing or programmatic mounting.
 */
export async function createApp(): Promise<express.Express> {
  validateEnv();

  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '100kb' }));
  app.use('/api/profile/avatar', express.json({ limit: '2mb' }));
  app.use('/api/user/avatar', express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use('/api', sanitizeInput);

  const frontendOriginRaw = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  const frontendOrigins = frontendOriginRaw.split(',').map((origin) => origin.trim()).filter(Boolean);
  const frontendOrigin = frontendOrigins.length === 1 ? frontendOrigins[0] : frontendOrigins;
  const isDev = process.env.NODE_ENV !== 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isDev
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:', ...(Array.isArray(frontendOrigin) ? frontendOrigin : [frontendOrigin])],
              connectSrc: [
                "'self'",
                'https://api.anthropic.com',
                'https://api.gemini.com',
                'https://*.run.app',
                'https://*.vercel.app',
                'wss://*.run.app',
                'ws://localhost:3000',
                'ws://localhost:8080',
              ],
              frameAncestors: ["'self'", 'https://*.google.com', 'https://*.aistudio.google', 'https://*.run.app', 'https://*.vercel.app'],
            },
          },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(
    cors({
      origin: frontendOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(hpp());

  app.use((req, _res, next) => {
    (req as express.Request & { id?: string }).id = randomUUID();
    next();
  });

  app.use((req, res, next) => {
    const reqId = (req as express.Request & { id?: string }).id ?? randomUUID();
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger[level]('request', {
        reqId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
      });
    });
    next();
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.join(__dirname, '..');
  app.use('/uploads', express.static(path.join(projectRoot, 'uploads')));

  const ipKey = (req: express.Request) => (req.ip ?? 'unknown').replace(/^::ffff:/, '');
  const loginLimiter = rateLimit({
    windowMs: RATE_LIMITS.login.windowMs,
    max: RATE_LIMITS.login.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKey(req),
    handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
  });
  const registerLimiter = rateLimit({
    windowMs: RATE_LIMITS.register.windowMs,
    max: RATE_LIMITS.register.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKey(req),
    handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
  });
  const refreshLimiter = rateLimit({
    windowMs: RATE_LIMITS.refresh.windowMs,
    max: RATE_LIMITS.refresh.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKey(req),
    handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
  });
  const apiLimiter = rateLimit({
    windowMs: RATE_LIMITS.api.windowMs,
    max: RATE_LIMITS.api.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKey(req),
    skip: (req) => req.path.startsWith('/api/auth'),
    handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
  });

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/register', registerLimiter);
  app.use('/api/auth/refresh', refreshLimiter);
  app.use('/api/', apiLimiter);
  app.use('/api/', userApiLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/stocks', stocksRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/watchlist', watchlistRoutes);
  app.use('/api/goals', goalsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/news', newsRoutes);
  app.use('/api/referral', referralRoutes);
  app.use('/api/market', marketDataRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/predictions', predictionsRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health/ready', async (_req, res) => {
    const checks: Record<string, string> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch {
      checks.db = 'error';
    }

    try {
      if (redis) {
        await redis.ping();
        checks.redis = 'ok';
      } else {
        checks.redis = 'disabled';
      }
    } catch {
      checks.redis = 'error';
    }

    checks.marketData = marketDataService.isMarketOpen() ? 'open' : 'closed';
    const allOk = checks.db === 'ok';
    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      checks,
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  });

  app.use(
    (err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      void _next;
      const reqId = (req as express.Request & { id?: string }).id;

      if (err instanceof AppError) {
        logger.warn('AppError', { reqId, code: err.code, status: err.status });
        return res.status(err.status).json({ ok: false, error: err.code });
      }
      if (err && typeof err === 'object' && (err as { name?: string }).name === 'ZodError') {
        return res.status(400).json({ ok: false, error: 'VALIDATION_ERROR' });
      }

      const message = err instanceof Error ? err.message : String(err);
      logger.error('Unhandled Error', {
        reqId,
        message,
        stack: err instanceof Error ? err.stack : undefined,
      });
      res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
    }
  );

  return app;
}
