import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);
const rawPepper = process.env.AUTH_PEPPER?.trim();
if (!rawPepper) {
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
  if (isDev) {
    throw new Error(
      'AUTH_PEPPER must be set in .env even in development. Generate one with: openssl rand -hex 32'
    );
  }
  throw new Error('AUTH_PEPPER must be set in production.');
}
const PEPPER = rawPepper;

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const pepperedPwd = crypto.createHmac('sha256', PEPPER).update(password).digest('hex');
  
  // Using scrypt for hashing
  const derivedKey = (await scrypt(pepperedPwd + salt, salt, 64)) as Buffer;
  const hash = derivedKey.toString('hex');

  return { hash, salt };
}

export async function verifyPassword(password: string, hash: string, salt: string) {
  const pepperedPwd = crypto.createHmac('sha256', PEPPER).update(password).digest('hex');
  const derivedKey = (await scrypt(pepperedPwd + salt, salt, 64)) as Buffer;
  const a = Buffer.from(derivedKey.toString('hex'), 'utf8');
  const b = Buffer.from(hash, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateAccessToken(user: { id: string; email: string }) {
  const rawKey = process.env.JWT_PRIVATE_KEY;
  const isRealKey = rawKey && rawKey.includes('BEGIN RSA PRIVATE KEY') && !rawKey.includes('...');
  const isDev = process.env.NODE_ENV === 'development';

  const secret = isRealKey
    ? rawKey.replace(/\\n/g, '\n')
    : process.env.JWT_ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error('JWT_PRIVATE_KEY or JWT_ACCESS_TOKEN_SECRET must be set.');
  }
  const effectiveSecret = secret;

  const algorithm = isRealKey ? 'RS256' : 'HS256';

  return jwt.sign(
    { sub: user.id, email: user.email },
    effectiveSecret,
    { 
      expiresIn: '15m', 
      algorithm: algorithm as jwt.Algorithm
    }
  );
}

export function verifyAccessToken(token: string) {
  const rawPrivateKey = process.env.JWT_PRIVATE_KEY;
  const rawPublicKey = process.env.JWT_PUBLIC_KEY;
  const isRealKey = rawPrivateKey && rawPrivateKey.includes('BEGIN RSA PRIVATE KEY') && !rawPrivateKey.includes('...');

  const isDev = process.env.NODE_ENV === 'development';

  const secret = isRealKey
    ? (rawPublicKey || '').replace(/\\n/g, '\n')
    : process.env.JWT_ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error('JWT_PRIVATE_KEY or JWT_ACCESS_TOKEN_SECRET must be set.');
  }
  const effectiveSecret = secret;

  return jwt.verify(token, effectiveSecret, {
    algorithms: isRealKey ? ['RS256'] : ['HS256']
  });
}

/** Secret used only for 2FA temp tokens (not shared with access token). */
function get2FATokenSecret(): string {
  const explicit = process.env.JWT_2FA_SECRET?.trim();
  if (explicit) return explicit;
  const base = process.env.JWT_ACCESS_TOKEN_SECRET || process.env.JWT_PRIVATE_KEY;
  if (!base) throw new Error('JWT_ACCESS_TOKEN_SECRET or JWT_PRIVATE_KEY must be set.');
  return crypto.createHmac('sha256', base).update('2fa-scope').digest('hex');
}

/** Short-lived token returned after login when 2FA is required. Uses separate secret so it cannot be used as access token. */
export function generate2FATempToken(userId: string): string {
  const secret = get2FATokenSecret();
  return jwt.sign(
    { sub: userId, purpose: '2fa_pending' },
    secret,
    { expiresIn: '5m', algorithm: 'HS256' }
  );
}

export function verify2FATempToken(token: string): { userId: string } {
  const secret = get2FATokenSecret();
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { sub: string; purpose?: string };
  if (decoded.purpose !== '2fa_pending') throw new Error('Invalid token purpose');
  return { userId: decoded.sub };
}

/** Refresh token: 64 bytes, not JWT — not decodable. */
export function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/** Hash refresh token for storage (do not store raw token in DB). */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}
