import './server/lib/dotenv.ts';

import express from 'express';
import { createServer as createViteServer } from 'vite';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import cron from 'node-cron';

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
import referralRoutes from './server/routes/referral.ts';
import socialRoutes from './server/routes/social.ts';
import predictionsRoutes from './server/routes/predictions.ts';
import adminRoutes from './server/routes/admin.ts';
import supportRoutes from './server/routes/support.ts';
import marketDataRoutes from './server/routes/market-data.ts';
import { userApiLimiter } from './server/middleware/userRateLimit.middleware.ts';
import { marketDataService } from './server/services/market-data/market-data.service.ts';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './server/lib/swagger.ts';
import { prisma } from './server/lib/prisma.ts';
import { redis } from './server/lib/redis.ts';
import { EGX_TICKERS } from './server/lib/egxTickers.ts';
import { runResolvePredictions } from './server/jobs/resolve-predictions.ts';
import { runTrackRecordCheck } from './server/jobs/track-record.ts';
import { runNewsSyncJob } from './server/jobs/sync-news.ts';
import { runArchiveUsersJob } from './server/jobs/archive-users.ts';
import { runResetAiUsageJob } from './server/jobs/reset-ai-usage.ts';
import { runDelayedPricesJob, DELAYED_PRICES_INTERVAL_MS } from './server/jobs/delayed-prices.ts';
import { runScheduledNotificationsJob } from './server/jobs/scheduled-notifications.ts';

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
  const PORT = process.env.PORT || 3000;

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

  // يمكن أن يكون origin واحد أو عدة أصول مفصولة بفاصلة (مثلاً Vercel + Railway)
  const frontendOriginRaw = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  const frontendOrigins = frontendOriginRaw.split(',').map((o) => o.trim()).filter(Boolean);
  // في التطوير دائماً نضيف localhost عشان يشتغل بدون إعداد إضافي
  if (process.env.NODE_ENV !== 'production') {
    if (!frontendOrigins.includes('http://localhost:3000')) frontendOrigins.push('http://localhost:3000');
    if (!frontendOrigins.includes('http://127.0.0.1:3000')) frontendOrigins.push('http://127.0.0.1:3000');
  }
  const frontendOrigin = frontendOrigins.length === 1 ? frontendOrigins[0] : frontendOrigins;

  // في التطوير نعطّل CSP بالكامل عشان Vite و HMR يشتغلوا بسرعة من غير أخطاء
  const isDev = process.env.NODE_ENV !== 'production';
  app.use(helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", ...(Array.isArray(frontendOrigin) ? frontendOrigin : [frontendOrigin])],
        connectSrc: ["'self'", "https://api.anthropic.com", "https://api.gemini.com", "https://*.run.app", "https://*.vercel.app", "wss://*.run.app", "ws://localhost:3000", "ws://localhost:8080"],
        frameAncestors: ["'self'", "https://*.google.com", "https://*.aistudio.google", "https://*.run.app", "https://*.vercel.app"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(cors({
    origin: frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(hpp());

  // Structured request logging (Winston) — بديل morgan
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
  app.use('/api/admin/auth/login', loginLimiter);
  app.use('/api/auth/register', registerLimiter);
  app.use('/api/auth/refresh', refreshLimiter);
  app.use('/api/', apiLimiter);
  app.use('/api/', userApiLimiter);

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
  app.use('/api/referral', referralRoutes);
  app.use('/api/market', marketDataRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/predictions', predictionsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/support', supportRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  let wsHandlers: ReturnType<typeof setupWebSocket> | null = null;

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
    checks.wsClients = String(wsHandlers?.getClientCount?.() ?? 0);
    const allOk = checks.db === 'ok';
    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      checks,
    });
  });

  const swaggerUiOptions = {
    customSiteTitle: 'Borsa — API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 2rem 0 }
      .swagger-ui .info .title { font-size: 2rem; margin: 0 0 0.5rem; color: #1e293b }
      .swagger-ui .info .description { font-size: 1rem; line-height: 1.6; color: #475569; white-space: pre-wrap }
      .swagger-ui .opblock-tag { font-size: 1.25rem; border-bottom: 1px solid #e2e8f0; padding: 0.75rem 0 }
      .swagger-ui .opblock { border-radius: 8px; margin: 0.5rem 0 }
      .swagger-ui .opblock .opblock-summary-method { border-radius: 4px; font-weight: 600 }
      .swagger-ui table thead tr th { border-bottom: 2px solid #e2e8f0; padding: 0.75rem }
      .swagger-ui .model-box-control { font-weight: 600 }
      .swagger-ui .wrapper { max-width: 1460px; margin: 0 auto; padding: 0 24px }
      .swagger-ui .scheme-container { box-shadow: none; border-radius: 8px; padding: 1rem }
    `,
    swaggerOptions: {
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      syntaxHighlight: { theme: 'monokai' },
    },
  };
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));
    logger.info('📚 API Docs: http://localhost:3000/api/docs');
  } else if (process.env.EGX_EXPOSE_DOCS === 'true') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));
    logger.info('📚 API Docs exposed at /api/docs (EGX_EXPOSE_DOCS=true)');
  }

  // 404 for unknown API routes (before static so /api/foo returns JSON not HTML)
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  });

  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Global Error Handler — كل الأخطاء ترجع { ok: false, error, message? }; لا filesystem logging
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const reqId = (req as express.Request & { id?: string }).id;

    if (err instanceof AppError) {
      logger.warn('AppError', { reqId, code: err.code, status: err.status });
      return res.status(err.status).json({
        ok: false,
        error: err.code,
        ...(err.message && err.message !== err.code && { message: err.message }),
        ...(err.details && { details: err.details }),
      });
    }
    if (err && typeof err === 'object' && (err as { name?: string }).name === 'ZodError') {
      return res.status(400).json({ ok: false, error: 'VALIDATION_ERROR' });
    }

    const message = err instanceof Error ? err.message : String(err);
    logger.error('Unhandled Error', { reqId, message, stack: err instanceof Error ? err.stack : undefined });
    res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
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
    app.use('/admin', express.static(path.join(__dirname, 'dist', 'admin')));
    app.get('/admin/*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'admin', 'index.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    void (async () => {
      logger.info(`🚀 Borsa Server running on http://localhost:${PORT}`);
      wsHandlers = setupWebSocket(server);
      marketDataService.setBroadcastFn(wsHandlers.broadcastPrices);

      try {
        let symbols: string[] = [...EGX_TICKERS];
        try {
          // Use DB stocks if the model exists on the generated Prisma client
          type PrismaWithStock = { stock?: { findMany: (args: { select: { ticker: true } }) => Promise<{ ticker: string }[]> } };
          const prismaWithStock = prisma as unknown as PrismaWithStock;
          if (prismaWithStock.stock?.findMany) {
            const stocks = await prismaWithStock.stock.findMany({ select: { ticker: true } });
            if (stocks.length > 0) {
              symbols = stocks.map((s) => s.ticker);
            }
          }
        } catch {
          // إذا ما كانش فيه موديل Stock في Prisma client هنكمل باستخدام EGX_TICKERS
        }

        logger.info(`Starting market data polling for ${symbols.length} symbols`);
        marketDataService.startPolling(symbols);
      } catch (err) {
        logger.error('Failed to start market polling', { error: err });
      }
    })();
  });

  const archiveCron = cron.schedule('0 3 * * *', () => runArchiveUsersJob().catch((err) => logger.error('Archive job error', { error: err })), { timezone: 'Africa/Cairo' });

  const aiResetCron = cron.schedule('1 0 1 * *', () => runResetAiUsageJob().catch((err) => logger.error('AI reset job error', { error: err })), { timezone: 'Africa/Cairo' });

  const pricesInterval = setInterval(
    () => runDelayedPricesJob().catch((err) => logger.error('Delayed prices job error', { error: err })),
    DELAYED_PRICES_INTERVAL_MS
  );

  const resolveCron = cron.schedule('30 15 * * 0-4', () => runResolvePredictions().catch((err) => logger.error('Resolve predictions job error', { error: err })), { timezone: 'Africa/Cairo' });

  const trackRecordCron = cron.schedule('0 16 * * 0-4', () => runTrackRecordCheck().catch((err) => logger.error('Track record job error', { error: err })), { timezone: 'Africa/Cairo' });

  let newsSyncRunning = false;
  const safeRunNewsSyncJob = async () => {
    if (newsSyncRunning) return;
    newsSyncRunning = true;
    try {
      await runNewsSyncJob();
    } catch (err) {
      logger.error('News sync job error', { error: err });
    } finally {
      newsSyncRunning = false;
    }
  };

  const newsSyncCron = cron.schedule('*/30 * * * *', () => {
    void safeRunNewsSyncJob();
  }, { timezone: 'Africa/Cairo' });

  const scheduledNotifCron = cron.schedule('* * * * *', () => {
    void runScheduledNotificationsJob().catch((err) => logger.error('Scheduled notifications job error', { error: err }));
  }, { timezone: 'Africa/Cairo' });

  void safeRunNewsSyncJob();

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    marketDataService.stopPolling();
    wsHandlers?.closeWss();
    archiveCron.stop();
    aiResetCron.stop();
    resolveCron.stop();
    trackRecordCron.stop();
    newsSyncCron.stop();
    scheduledNotifCron.stop();
    clearInterval(pricesInterval);
    server.close(() => {
      logger.info('HTTP server closed');
    });
    // Drain: give in-flight requests time to finish, then disconnect DB
    const drainMs = 5000;
    setTimeout(async () => {
      try {
        await prisma.$disconnect();
        logger.info('DB connection closed');
      } catch {
        // ignore if prisma import failed
      }
      process.exit(0);
    }, drainMs);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
});
