import { config } from 'dotenv';
// Load base .env first, then override with .env.local if it exists
config();
config({ path: '.env.local', override: true });

import express from 'express';
import { createServer as createViteServer } from 'vite';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

import { createServer } from 'http';
import * as Sentry from '@sentry/node';
import { setupWebSocket } from './server/websocket.ts';
import { validateEnv } from './server/lib/env.ts';
import { logger } from './server/lib/logger.ts';
import { RATE_LIMITS } from './server/lib/constants.ts';
import { AppError } from './server/lib/errors.ts';
import { sanitizeInput } from './server/lib/sanitize.ts';
import authRoutes from './server/routes/auth.ts';
import portfolioRoutes from './server/routes/portfolio.ts';
import stocksRoutes from './server/routes/stocks.ts';
import analysisRoutes from './server/routes/analysis.ts';
import userRoutes from './server/routes/user.ts';
import profileRoutes from './server/routes/profile.ts';
import watchlistRoutes from './server/routes/watchlist.ts';
import goalsRoutes from './server/routes/goals.ts';
import notificationsRoutes from './server/routes/notifications.ts';
import billingRoutes from './server/routes/billing.ts';
import newsRoutes from './server/routes/news.ts';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './server/lib/swagger.ts';

async function startServer() {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [Sentry.expressIntegration()],
      tracesSampleRate: 0.1,
    });
  }

  validateEnv();

  const app = express();
  app.set('trust proxy', 1);
  const server = createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // ESM-safe equivalent of __dirname
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Request ID for tracing
  app.use((req, _res, next) => {
    (req as express.Request & { id?: string }).id = randomUUID();
    next();
  });

  // Body parser (before sanitization)
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/profile/avatar', express.json({ limit: '2mb' }));
  app.use('/api/user/avatar', express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.use('/api', sanitizeInput);

  // في التطوير نعطّل CSP بالكامل عشان Vite و HMR يشتغلوا بسرعة من غير أخطاء
  const isDev = process.env.NODE_ENV !== 'production';
  app.use(helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.anthropic.com", "https://api.gemini.com", "https://*.run.app", "wss://*.run.app", "ws://localhost:3000", "ws://localhost:8080"],
        frameAncestors: ["'self'", "https://*.google.com", "https://*.aistudio.google", "https://*.run.app"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  const frontendOrigin = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  app.use(cors({
    origin: frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(hpp());
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  } else {
    // في الـ production نحافظ على لوج مبسط بدون تفاصيل داخلية
    app.use(morgan('combined'));
  }

  // Static uploads (avatars, etc.)
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Rate Limiting — always respond with JSON so the client never gets "Too many requests" as plain text
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
    skip: (req) => req.path.startsWith('/api/auth'), // لا نحسب تسجيل الدخول/التسجيل ضمن الحد العام
    handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
  });

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/register', registerLimiter);
  app.use('/api/auth/refresh', refreshLimiter);
  app.use('/api/', apiLimiter);

  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug/time', (_req, res) => {
      res.json({
        serverTime: new Date().toISOString(),
        serverTimestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    });
  }

  // API Routes
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

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health/ready', async (_req, res) => {
    try {
      const { prisma } = await import('./server/lib/prisma.ts');
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'connected' });
    } catch (e) {
      res.status(503).json({ status: 'error', db: 'disconnected' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'EGX Pro API Docs',
    }));
    logger.info('📚 API Docs available at http://localhost:3000/api/docs');
  }

  // 404 for unknown API routes (before static so /api/foo returns JSON not HTML)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Global Error Handler — AppError and ZodError get consistent JSON; never expose internals
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const reqId = (req as express.Request & { id?: string }).id;

    if (err instanceof AppError) {
      return res.status(err.status).json({ error: err.code });
    }
    if (err && typeof err === 'object' && (err as { name?: string }).name === 'ZodError') {
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    }

    const message = err instanceof Error ? err.message : String(err);
    const logLine = `[${new Date().toISOString()}] [${reqId ?? 'no-id'}] ${message}\n`;

    if (process.env.NODE_ENV === 'production') {
      try {
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        fs.appendFileSync(path.join(logsDir, 'error.log'), logLine);
      } catch {
        // لو حصل خطأ في اللوج، منظهرش أي تفاصيل للـ client
      }
    } else {
      logger.error('Unhandled Error:', { reqId, err });
    }

    res.status(500).json({ error: 'INTERNAL_ERROR' });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 EGX Pro Server running on http://localhost:${PORT}`);
    setupWebSocket(server);
  });

  // أرشفة الحسابات المحذوفة بعد 30 يوم + انتهاء الـ refresh tokens (يومي)
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const archiveInterval = setInterval(async () => {
    try {
      const { prisma } = await import('./server/lib/prisma.ts');
      const now = new Date();
      const toArchive = await prisma.user.findMany({
        where: {
          isDeleted: true,
          deletionScheduledFor: { lt: now },
        },
      });
      const prismaWithArchive = prisma as typeof prisma & {
        archivedUser: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
        refreshToken: { deleteMany: (args: { where: { expiresAt: { lt: Date } } }) => Promise<unknown> };
      };
      for (const u of toArchive) {
        try {
          await prismaWithArchive.archivedUser.create({
            data: {
              originalId: u.id,
              email: u.email ?? undefined,
              phone: u.phone ?? undefined,
              username: u.username ?? undefined,
              name: u.fullName ?? undefined,
              userData: {
                id: u.id,
                email: u.email,
                phone: u.phone,
                username: u.username,
                fullName: u.fullName,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
              },
            },
          });
          await prisma.user.delete({ where: { id: u.id } });
        } catch (e) {
          logger.error('Archive user error', { userId: u.id, error: e });
        }
      }
      await prismaWithArchive.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      });
    } catch (err) {
      logger.error('Cleanup job error', { error: err });
    }
  }, ONE_DAY_MS);

  // كل أول الشهر: إعادة تعيين عداد تحليلات الذكاء الاصطناعي للمجانيين
  let lastAiResetMonth = '';
  const aiResetInterval = setInterval(async () => {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (now.getDate() !== 1 || lastAiResetMonth === monthKey) return;
      lastAiResetMonth = monthKey;
      const { prisma } = await import('./server/lib/prisma.ts');
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      await prisma.user.updateMany({
        data: { aiAnalysisUsedThisMonth: 0, aiAnalysisResetDate: nextReset },
      });
    } catch (err) {
      logger.error('AI usage reset job error', { error: err });
    }
  }, 60 * 60 * 1000);

  // كل 10 دقائق: تحديث كاش الأسعار المتأخرة للمجانيين
  const TEN_MIN_MS = 10 * 60 * 1000;
  const pricesInterval = setInterval(async () => {
    try {
      const { getStockPrice } = await import('./server/lib/yahoo.ts');
      const { setCache } = await import('./server/lib/redis.ts');
      const { EGX_TICKERS } = await import('./server/lib/egxTickers.ts');
      const { prisma } = await import('./server/lib/prisma.ts');
      const { createNotification } = await import('./server/lib/createNotification.ts');
      const now = Date.now();
      for (const ticker of EGX_TICKERS) {
        const data = await getStockPrice(ticker);
        if (data) {
          await setCache(`stock:price:delayed:${ticker}`, { ...data, delayedAt: now }, 15 * 60);
        }
      }
      const watchlistAlerts = await prisma.watchlist.findMany({
        where: { targetPrice: { not: null } },
        include: { user: { select: { id: true, notifySignals: true } } },
      });
      for (const item of watchlistAlerts) {
        const priceData = await getStockPrice(item.ticker);
        if (!priceData || item.targetPrice == null) continue;
        const hit = priceData.price >= item.targetPrice;
        const alreadyNotified = item.targetReachedNotifiedAt != null;
        if (hit && !alreadyNotified && item.user.notifySignals) {
          await createNotification(
            item.user.id,
            'stock_target',
            `${item.ticker} وصل للسعر المستهدف`,
            `السعر الحالي ${priceData.price} ج.م — وصل للهدف ${item.targetPrice} ج.م`,
            { route: `/stocks/${item.ticker}` }
          );
          await prisma.watchlist.update({
            where: { id: item.id },
            data: { targetReachedNotifiedAt: new Date() },
          });
        }
        if (!hit && alreadyNotified) {
          await prisma.watchlist.update({
            where: { id: item.id },
            data: { targetReachedNotifiedAt: null },
          });
        }
      }
    } catch (err) {
      logger.error('Delayed prices refresh error', { error: err });
    }
  }, TEN_MIN_MS);

  process.on('SIGTERM', () => {
    clearInterval(archiveInterval);
    clearInterval(aiResetInterval);
    clearInterval(pricesInterval);
    server.close();
  });
}

startServer().catch(err => {
  logger.error('Failed to start server', { error: err });
});
