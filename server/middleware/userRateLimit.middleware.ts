import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { RATE_LIMITS } from '../lib/constants.ts';

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
        const decoded = jwt.decode(auth.slice(7)) as { sub?: string } | null;
        if (decoded?.sub) return `user:${decoded.sub}`;
      } catch {
        // ignore
      }
    }
    return ipKey(req);
  },
  skip: (req) => req.originalUrl.startsWith('/api/auth'),
  handler: (_req, res) => res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' }),
});
