import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.ts';
import { verifyAccessToken } from '../../src/lib/auth.ts';
import { AuthRequest } from './types';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

const router = Router();

// Middleware to verify JWT
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token) as { sub: string };
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        riskTolerance: true,
        investmentHorizon: true,
        monthlyBudget: true,
        shariaMode: true,
        onboardingCompleted: true,
        interestedSectors: true,
        twoFactorEnabled: true,
        language: true,
        theme: true,
      }
    });
    
    const responseUser = user && typeof user.interestedSectors === 'string'
      ? {
          ...user,
          interestedSectors: (() => {
            try {
              return JSON.parse(user.interestedSectors as string);
            } catch {
              return [];
            }
          })(),
        }
      : user;
    
    res.json(responseUser);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      fullName, 
      riskTolerance, 
      investmentHorizon, 
      monthlyBudget, 
      shariaMode, 
      onboardingCompleted,
      interestedSectors,
      twoFactorEnabled,
      language,
      theme 
    } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        fullName,
        riskTolerance,
        investmentHorizon,
        monthlyBudget,
        shariaMode,
        onboardingCompleted,
        interestedSectors: Array.isArray(interestedSectors) ? JSON.stringify(interestedSectors) : interestedSectors,
        twoFactorEnabled,
        language,
        theme,
      }
    });

    const responseUser = {
      ...user,
      interestedSectors: typeof user.interestedSectors === 'string' ? JSON.parse(user.interestedSectors) : user.interestedSectors,
    };

    res.json(responseUser);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 2FA Setup
router.post('/2fa/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `EGX Pro (${req.userId})`,
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// 2FA Verify and Enable
router.post('/2fa/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token, secret } = req.body;

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
    });

    if (verified) {
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
        },
      });
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error('2FA verify error:', err);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// 2FA Disable
router.post('/2fa/disable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

export default router;
