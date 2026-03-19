import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Billing', () => {
  let app: Express;
  let accessToken: string;

  beforeAll(async () => {
    app = await createApp();
    // Register + login to get an access token
    const email = `billing-${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Billing User', emailOrPhone: email, password: 'SecurePass123!' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: email, password: 'SecurePass123!' });
    accessToken = res.body.data?.accessToken;
  });

  describe('GET /api/billing/plan', () => {
    it('returns plan info for authenticated user', async () => {
      const res = await request(app)
        .get('/api/billing/plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data?.plan).toBeDefined();
    });

    it('returns 401 without token', async () => {
      await request(app).get('/api/billing/plan').expect(401);
    });
  });

  describe('POST /api/billing/validate-discount', () => {
    it('returns 400 for invalid discount code', async () => {
      const res = await request(app)
        .post('/api/billing/validate-discount')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: 'INVALIDCODE999', plan: 'pro' });
      expect(res.body.ok).toBe(false);
      expect(['INVALID_DISCOUNT_CODE', 'INVALID_REQUEST']).toContain(res.body.error);
    });

    it('returns 400 for empty code', async () => {
      const res = await request(app)
        .post('/api/billing/validate-discount')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '', plan: 'pro' });
      expect(res.body.ok).toBe(false);
    });

    it('returns 400 for invalid plan', async () => {
      const res = await request(app)
        .post('/api/billing/validate-discount')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: 'TEST', plan: 'super_ultra' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .post('/api/billing/validate-discount')
        .send({ code: 'TEST', plan: 'pro' })
        .expect(401);
    });
  });

  describe('POST /api/billing/upgrade', () => {
    it('returns 400 without paymentToken when discount < 100%', async () => {
      const res = await request(app)
        .post('/api/billing/upgrade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ plan: 'pro' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 400 for invalid plan', async () => {
      const res = await request(app)
        .post('/api/billing/upgrade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ plan: 'invalid_plan', paymentToken: 'tok_123' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .post('/api/billing/upgrade')
        .send({ plan: 'pro', paymentToken: 'tok_123' })
        .expect(401);
    });
  });

  describe('POST /api/billing/google-play/verify', () => {
    it('returns 400 for missing purchaseToken', async () => {
      const res = await request(app)
        .post('/api/billing/google-play/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId: 'borsa_pro_monthly' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 400 for invalid productId', async () => {
      const res = await request(app)
        .post('/api/billing/google-play/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ purchaseToken: 'tok_abc', productId: 'invalid_product' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .post('/api/billing/google-play/verify')
        .send({ purchaseToken: 'tok', productId: 'borsa_pro_monthly' })
        .expect(401);
    });
  });

  describe('POST /api/billing/google-play/webhook', () => {
    it('returns 401 without Authorization header', async () => {
      await request(app)
        .post('/api/billing/google-play/webhook')
        .send({ message: { data: Buffer.from('{}').toString('base64') } })
        .expect(401);
    });

    it('returns 401 with invalid Bearer token', async () => {
      await request(app)
        .post('/api/billing/google-play/webhook')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .send({ message: { data: Buffer.from('{}').toString('base64') } })
        .expect(401);
    });
  });
});
