import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../lib/adminAuth.ts';
import { prisma } from '../lib/prisma.ts';
import { hasPermission, type AdminPermission } from '../lib/adminPermissions.ts';

export interface AdminRequest extends Request {
  admin?: { id: number; role: string; permissions: string[]; email: string };
}

export async function adminAuthenticate(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
    return;
  }

  try {
    const payload = verifyAdminToken(token);
    const adminId = parseInt(payload.sub, 10);
    if (isNaN(adminId)) {
      res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
      return;
    }
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        isDeleted: true,
        tokenVersion: true,
      },
    });
    if (!admin || !admin.isActive || admin.isDeleted) {
      res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
      return;
    }
    // Reject tokens issued before a password/2FA reset
    if (payload.tokenVersion !== admin.tokenVersion) {
      res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
      return;
    }
    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    };
    next();
  } catch {
    res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
  }
}

export function requirePermission(permission: AdminPermission) {
  return (req: AdminRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
      return;
    }
    if (!hasPermission(req.admin, permission)) {
      res.status(403).json({ error: 'ADMIN_FORBIDDEN', required: permission });
      return;
    }
    next();
  };
}

export function requireSuperAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  if (!req.admin) {
    res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
    return;
  }
  if (req.admin.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'ADMIN_FORBIDDEN', required: 'SUPER_ADMIN' });
    return;
  }
  next();
}

async function geolocateIp(ip: string): Promise<string | null> {
  const LOCAL = /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  if (LOCAL) return null;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=regionName,city`, {
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    const geo = await res.json() as { regionName?: string; city?: string };
    return geo.regionName ?? geo.city ?? null;
  } catch {
    return null;
  }
}

export async function adminAudit(
  adminId: number,
  action: string,
  target?: string,
  details?: string,
  req?: Request
): Promise<void> {
  try {
    const ip = req?.ip ?? 'unknown';
    const ipHash = ip !== 'unknown'
      ? (await import('crypto')).createHash('sha256').update(ip, 'utf8').digest('hex')
      : null;
    const city = ip !== 'unknown' ? await geolocateIp(ip) : null;
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        target: target ?? null,
        details: details ?? null,
        ipHash,
        userAgent: (req?.headers['user-agent'] ?? '').slice(0, 500),
        city,
      },
    });
  } catch {
    // لا نوقف الـ request لو فشل الـ audit
  }
}

