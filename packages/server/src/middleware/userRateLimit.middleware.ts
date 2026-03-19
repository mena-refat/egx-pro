import { rateLimit } from 'express-rate-limit';
import { verifyAccessToken } from '../lib/auth.ts';

const ipKey = (req: { ip?: string }) => (req.ip ?? 'unknown').replace(/^::ffff:/, '');

/** Rate limit keyed by userId when Bearer token present, else by IP. Applied after auth routes. */
export const userApiLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = verifyAccessToken(auth.slice(7)) as { sub?: string } | null;
        if (payload?.sub) return `user:${payload.sub}`;
      } catch {
        // invalid token — fall through to IP
      }
    }
    return ipKey(req);
  },
  skip: (req) =>
    req.originalUrl.startsWith('/api/auth') ||
    req.originalUrl.startsWith('/api/admin'),
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});
