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
import { fileURLToPath } from 'url';

import { createServer } from 'http';
import { setupWebSocket } from './server/websocket.ts';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const server = createServer(app);
  const PORT = 3000;

  // ESM-safe equivalent of __dirname
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "https://api.anthropic.com", "https://api.gemini.com", "https://*.run.app", "wss://*.run.app", "ws://localhost:3000", "ws://localhost:8080"],
        imgSrc: ["'self'", "data:", "https://picsum.photos", "https://*.run.app"],
        frameAncestors: ["'self'", "https://*.google.com", "https://*.aistudio.google", "https://*.run.app"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(hpp());
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use(morgan('combined'));

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', apiLimiter);

  // API Routes
  const authRoutes = (await import('./server/routes/auth.ts')).default;
  app.use('/api/auth', authRoutes);

  // Real auth middleware to inject user id for other routes
  app.use('/api', async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { verifyAccessToken } = await import('./src/lib/auth.ts');
        const decoded = verifyAccessToken(token) as { sub: string, email: string };
        Object.assign(req, { user: { id: decoded.sub, email: decoded.email } });
      } catch (err) {
        console.error('JWT Verification Error:', err);
      }
    }
    next();
  });

  const portfolioRoutes = (await import('./server/routes/portfolio.ts')).default;
  app.use('/api/portfolio', portfolioRoutes);

  const stocksRoutes = (await import('./server/routes/stocks.ts')).default;
  app.use('/api/stocks', stocksRoutes);

  const analysisRoutes = (await import('./server/routes/analysis.ts')).default;
  app.use('/api/analysis', analysisRoutes);

  const userRoutes = (await import('./server/routes/user.ts')).default;
  app.use('/api/user', userRoutes);

  const watchlistRoutes = (await import('./server/routes/watchlist.ts')).default;
  app.use('/api/watchlist', watchlistRoutes);

  const goalsRoutes = (await import('./server/routes/goals.ts')).default;
  app.use('/api/goals', goalsRoutes);

  const billingRoutes = (await import('./server/routes/billing.ts')).default;
  app.use('/api/billing', billingRoutes);

  // API Routes (Placeholder for Auth)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global Error Handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
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
    console.log(`🚀 EGX Pro Server running on http://localhost:${PORT}`);
    setupWebSocket(server);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
