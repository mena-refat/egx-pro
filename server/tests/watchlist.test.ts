import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Watchlist', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
    const email = `watchlist-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register')
      .send({ fullName: 'Watch User', emailOrPhone: email, password: 'SecurePass123!' });
    const res = await request(app).post('/api/auth/login')
      .send({ emailOrPhone: email, password: 'SecurePass123!' });
    token = res.body.data?.accessToken;
  });

  describe('GET /api/watchlist', () => {
    it('returns empty list for new user', async () => {
      const res = await request(app)
        .get('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(app).get('/api/watchlist').expect(401);
    });
  });

  describe('POST /api/watchlist', () => {
    it('adds a stock to watchlist', async () => {
      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({ ticker: 'COMI' });
      expect([200, 201]).toContain(res.status);
      expect(res.body.ok).toBe(true);
    });

    it('returns 400 for missing ticker', async () => {
      const res = await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .post('/api/watchlist')
        .send({ ticker: 'COMI' })
        .expect(401);
    });
  });

  describe('DELETE /api/watchlist/:ticker', () => {
    it('removes a stock from watchlist', async () => {
      // Add first
      await request(app)
        .post('/api/watchlist')
        .set('Authorization', `Bearer ${token}`)
        .send({ ticker: 'EKHC' });
      // Then delete
      const res = await request(app)
        .delete('/api/watchlist/EKHC')
        .set('Authorization', `Bearer ${token}`);
      expect([200, 204]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      await request(app).delete('/api/watchlist/COMI').expect(401);
    });
  });
});
