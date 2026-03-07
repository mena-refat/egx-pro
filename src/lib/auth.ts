import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);
const isDev = process.env.NODE_ENV === 'development';
const rawPepper = process.env.AUTH_PEPPER;
if (!rawPepper?.trim() && !isDev) {
  throw new Error('AUTH_PEPPER must be set in non-development environments.');
}
const PEPPER = rawPepper?.trim() || 'default-pepper-if-missing';

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

/** Short-lived token returned after login when 2FA is required. */
export function generate2FATempToken(userId: string): string {
  const rawKey = process.env.JWT_PRIVATE_KEY;
  const isRealKey = rawKey && rawKey.includes('BEGIN RSA PRIVATE KEY') && !rawKey.includes('...');
  const secret = isRealKey ? rawKey.replace(/\\n/g, '\n') : process.env.JWT_ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error('JWT_PRIVATE_KEY or JWT_ACCESS_TOKEN_SECRET must be set.');
  }
  const effectiveSecret = secret;
  const algorithm = isRealKey ? 'RS256' : 'HS256';
  return jwt.sign(
    { sub: userId, purpose: '2fa_pending' },
    effectiveSecret,
    { expiresIn: '5m', algorithm: algorithm as jwt.Algorithm }
  );
}

export function verify2FATempToken(token: string): { userId: string } {
  const decoded = verifyAccessToken(token) as { sub: string; purpose?: string };
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
