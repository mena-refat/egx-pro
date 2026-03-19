/**
 * Rate limiting middleware.
 *
 * IP-based limiters are defined inline in each route file (e.g. analysis.ts, watchlist.ts)
 * using express-rate-limit so each route can configure its own window/max.
 *
 * User-keyed (authenticated) rate limiting lives in:
 *   server/middleware/userRateLimit.middleware.ts  →  userApiLimiter
 */

export {};
