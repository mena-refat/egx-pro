import jwt from 'jsonwebtoken';

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ?? process.env.JWT_ACCESS_TOKEN_SECRET ?? '';
const ADMIN_TOKEN_EXPIRES = '8h';

export function generateAdminToken(admin: {
  id: number;
  role: string;
  permissions: string[];
}): string {
  return jwt.sign(
    { sub: String(admin.id), role: admin.role, permissions: admin.permissions, type: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_TOKEN_EXPIRES, algorithm: 'HS256' }
  );
}

export function verifyAdminToken(token: string): {
  sub: string;
  role: string;
  permissions: string[];
} {
  const payload = jwt.verify(token, ADMIN_JWT_SECRET) as {
    sub: string;
    role: string;
    permissions: string[];
    type: string;
  };
  if (payload.type !== 'admin') {
    throw new Error('Invalid admin token');
  }
  return { sub: payload.sub, role: payload.role, permissions: payload.permissions };
}

