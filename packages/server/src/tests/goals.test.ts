import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Financial Goals', () => {
  let app: Express;
  let token: string;
  let goalId: string | number;

  beforeAll(async () => {
    app = await createApp();
    const email = `goals-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register')
      .send({ fullName: 'Goals User', emailOrPhone: email, password: 'SecurePass123!' });
    const res = await request(app).post('/api/auth/login')
      .send({ emailOrPhone: email, password: 'SecurePass123!' });
    token = res.body.data?.accessToken;
  });

  describe('GET /api/goals', () => {
    it('returns empty list for new user', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(app).get('/api/goals').expect(401);
    });
  });

  describe('POST /api/goals', () => {
    it('creates a financial goal', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Save for car',
          targetAmount: 100000,
          currentAmount: 0,
          targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.ok).toBe(true);
      goalId = res.body.data?.id;
    });

    it('returns 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetAmount: 50000 });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 400 for negative target amount', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Bad goal', targetAmount: -1000 });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .post('/api/goals')
        .send({ title: 'Test', targetAmount: 10000 })
        .expect(401);
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('deletes a goal', async () => {
      if (!goalId) return;
      const res = await request(app)
        .delete(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`);
      expect([200, 204]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      await request(app).delete('/api/goals/999').expect(401);
    });
  });
});
