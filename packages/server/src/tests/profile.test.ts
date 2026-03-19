import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('User Profile', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
    const email = `profile-${Date.now()}@example.com`;
    await request(app).post('/api/auth/register')
      .send({ fullName: 'Profile User', emailOrPhone: email, password: 'SecurePass123!' });
    const res = await request(app).post('/api/auth/login')
      .send({ emailOrPhone: email, password: 'SecurePass123!' });
    token = res.body.data?.accessToken;
  });

  describe('GET /api/user/profile', () => {
    it('returns profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data?.email ?? res.body.data?.id).toBeDefined();
    });

    it('returns 401 without token', async () => {
      await request(app).get('/api/user/profile').expect(401);
    });
  });

  describe('PUT /api/user/profile', () => {
    it('updates fullName', async () => {
      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Updated Name' });
      expect([200, 204]).toContain(res.status);
    });

    it('rejects invalid theme value', async () => {
      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'rainbow' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .put('/api/user/profile')
        .send({ fullName: 'Hacker' })
        .expect(401);
    });
  });

  describe('PUT /api/user/password', () => {
    it('returns 400 for wrong current password', async () => {
      const res = await request(app)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'WrongPassword', newPassword: 'NewSecure123!' });
      expect([400, 401]).toContain(res.status);
      expect(res.body.ok).toBe(false);
    });

    it('returns 400 for weak new password', async () => {
      const res = await request(app)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'SecurePass123!', newPassword: '123' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .put('/api/user/password')
        .send({ currentPassword: 'SecurePass123!', newPassword: 'NewSecure123!' })
        .expect(401);
    });
  });
});
