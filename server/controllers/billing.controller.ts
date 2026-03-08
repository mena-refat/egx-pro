import { Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service.ts';
import type { AuthRequest } from '../routes/types.ts';
import { auditLog } from '../lib/audit.ts';

function run(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const BillingController = {
  getPlan: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const data = await BillingService.getPlan(userId);
    res.json({ data });
  }),

  validateDiscount: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const { code, plan } = req.body as { code?: string; plan?: string };
    const data = await BillingService.validateDiscount(
      userId,
      String(code ?? '').trim(),
      plan as 'pro' | 'annual' | undefined
    );
    res.json({ data });
  }),

  upgrade: run(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    const { plan, discountCode, paymentToken } = req.body as {
      plan?: string;
      discountCode?: string;
      paymentToken?: string;
    };
    const data = await BillingService.upgrade(userId, plan as import('../services/billing.service.ts').PlanUpgrade, {
      discountCode,
      paymentToken,
    });
    await auditLog({
      userId,
      action: 'SUBSCRIPTION_UPGRADE',
      details: `Upgraded to ${plan}${discountCode ? ` with discount ${discountCode}` : ''}`,
      result: 'success',
      req: { ip: req.ip, headers: req.headers as { 'user-agent'?: string } },
    });
    res.json({ data });
  }),
};
