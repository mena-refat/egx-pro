import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Notifications', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
    const email = `notif-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register')
      .send({ fullName: 'Notif User', emailOrPhone: email, password: 'SecurePass123!' });
    const res = await request(app).post('/api/auth/login')
      .send({ emailOrPhone: email, password: 'SecurePass123!' });
    token = res.body.data?.accessToken;
  });

  describe('GET /api/notifications', () => {
    it('returns notifications list', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
    });

    it('supports pagination', async () => {
      const res = await request(app)
        .get('/api/notifications?limit=5&page=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(app).get('/api/notifications').expect(401);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);
      expect([200, 204]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      await request(app).patch('/api/notifications/read-all').expect(401);
    });
  });
});
