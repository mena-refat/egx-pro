import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);
const PEPPER = process.env.AUTH_PEPPER || 'default-pepper-if-missing';

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
  return derivedKey.toString('hex') === hash;
}

export function generateAccessToken(user: { id: string; email: string }) {
  const rawKey = process.env.JWT_PRIVATE_KEY;
  const isRealKey = rawKey && rawKey.includes('BEGIN RSA PRIVATE KEY') && !rawKey.includes('...');
  const isDev = process.env.NODE_ENV === 'development';

  const secret = isRealKey
    ? rawKey.replace(/\\n/g, '\n')
    : process.env.JWT_ACCESS_TOKEN_SECRET;

  if (!secret && !isDev) {
    throw new Error('JWT configuration error: JWT_PRIVATE_KEY or JWT_ACCESS_TOKEN_SECRET must be set in non-development environments');
  }

  const effectiveSecret = secret || 'temp-secret-key-123';

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

  if (!secret && !isDev) {
    throw new Error('JWT configuration error: JWT_PUBLIC_KEY or JWT_ACCESS_TOKEN_SECRET must be set in non-development environments');
  }

  const effectiveSecret = secret || 'temp-secret-key-123';

  return jwt.verify(token, effectiveSecret, {
    algorithms: isRealKey ? ['RS256'] : ['HS256']
  });
}

export function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}
