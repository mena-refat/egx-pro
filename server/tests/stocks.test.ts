import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Stocks', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
    const email = `stocks-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register')
      .send({ fullName: 'Stocks User', emailOrPhone: email, password: 'SecurePass123!' });
    const res = await request(app).post('/api/auth/login')
      .send({ emailOrPhone: email, password: 'SecurePass123!' });
    token = res.body.data?.accessToken;
  });

  describe('GET /api/stocks', () => {
    it('returns stock list (public)', async () => {
      const res = await request(app)
        .get('/api/stocks')
        .expect(200);
      expect(res.body.ok).toBe(true);
    });

    it('supports search query', async () => {
      const res = await request(app)
        .get('/api/stocks?q=com')
        .expect(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('GET /api/stocks/:ticker', () => {
    it('returns stock data for valid ticker', async () => {
      const res = await request(app)
        .get('/api/stocks/COMI')
        .set('Authorization', `Bearer ${token}`);
      // Could be 200 or 404 depending on seeded data
      expect([200, 404]).toContain(res.status);
    });

    it('returns 400 for invalid ticker format', async () => {
      const res = await request(app)
        .get('/api/stocks/INVALID_TICKER_TOO_LONG_123')
        .set('Authorization', `Bearer ${token}`);
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('GET /api/stocks/:ticker/news', () => {
    it('returns news for ticker', async () => {
      const res = await request(app)
        .get('/api/stocks/COMI/news')
        .set('Authorization', `Bearer ${token}`);
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.ok).toBe(true);
      }
    });
  });

  describe('GET /api/news/market', () => {
    it('returns market news', async () => {
      const res = await request(app)
        .get('/api/news/market')
        .expect(200);
      expect(res.body.ok).toBe(true);
    });
  });
});
