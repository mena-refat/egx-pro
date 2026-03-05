/**
 * Validate required environment variables at startup.
 * Call this once before starting the server.
 */
export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    missing.push('DATABASE_URL');
  }

  const jwtSecret = process.env.JWT_ACCESS_TOKEN_SECRET?.trim();
  const jwtPrivate = process.env.JWT_PRIVATE_KEY?.trim();
  if (!jwtSecret && !jwtPrivate && isProd) {
    missing.push('JWT_ACCESS_TOKEN_SECRET or JWT_PRIVATE_KEY');
  }

  if (isProd && !process.env.APP_URL?.trim()) {
    missing.push('APP_URL');
  }

  if (isProd && (!process.env.AUTH_PEPPER || process.env.AUTH_PEPPER === 'default-pepper-if-missing')) {
    missing.push('AUTH_PEPPER (must be set and non-default in production)');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing or invalid required environment variables: ${missing.join(', ')}. ` +
      'Check .env and .env.local.'
    );
  }
}
