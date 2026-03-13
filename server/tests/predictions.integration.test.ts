import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Predictions Integration', () => {
  let app: Express;
  let accessToken: string;

  beforeAll(async () => {
    app = await createApp();
    const email = `pred-${Date.now()}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Pred User',
        emailOrPhone: email,
        password: 'SecurePass123!',
      })
      .expect(200);
    accessToken = reg.body.data?.accessToken ?? '';
    if (!accessToken) throw new Error('Failed to get access token');
  });

  it('creates prediction with valid data', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ticker: 'COMI',
        direction: 'UP',
        timeframe: 'WEEK',
        targetPrice: 25,
        reason: 'تحسن أرباح الشركة وأداء قوي في السوق.',
        isPublic: true,
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
    expect(res.body.data?.id).toBeDefined();
    expect(res.body.data?.ticker).toBe('COMI');
  });

  it('rejects prediction without auth', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .send({
        ticker: 'COMI',
        direction: 'UP',
        timeframe: 'WEEK',
        targetPrice: 25,
        reason: 'سبب كافٍ للتحقق من التحقق.',
        isPublic: true,
      });
    expect(res.status).toBe(401);
  });

  it('rejects invalid timeframe', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ticker: 'COMI',
        direction: 'UP',
        timeframe: 'INVALID',
        targetPrice: 25,
        reason: 'سبب كافٍ للتحقق من التحقق.',
      });
    expect(res.status).toBe(400);
  });
});
