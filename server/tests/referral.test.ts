import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Referral', () => {
  let app: Express;
  let token: string;
  let referralCode: string;

  beforeAll(async () => {
    app = await createApp();
    const email = `referral-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register')
      .send({ fullName: 'Referral User', emailOrPhone: email, password: 'SecurePass123!' });
    const res = await request(app).post('/api/auth/login')
      .send({ emailOrPhone: email, password: 'SecurePass123!' });
    token = res.body.data?.accessToken;
  });

  describe('GET /api/referral', () => {
    it('returns referral info with code', async () => {
      const res = await request(app)
        .get('/api/referral')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
      referralCode = res.body.data?.referralCode;
      expect(referralCode).toBeDefined();
    });

    it('returns 401 without token', async () => {
      await request(app).get('/api/referral').expect(401);
    });
  });

  describe('POST /api/referral/apply', () => {
    it('returns 400 for own referral code', async () => {
      if (!referralCode) return;
      const res = await request(app)
        .post('/api/referral/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: referralCode });
      // Should reject self-referral
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 400 for invalid referral code', async () => {
      const res = await request(app)
        .post('/api/referral/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'INVALIDREF999' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .post('/api/referral/apply')
        .send({ code: 'SOMEREF' })
        .expect(401);
    });
  });
});
