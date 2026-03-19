import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Auth Integration', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  describe('POST /api/auth/register', () => {
    it('creates user and returns tokens', async () => {
      const email = `test-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Test User',
          emailOrPhone: email,
          password: 'SecurePass123!',
        })
        .expect(200);
      expect(res.body).toMatchObject({ ok: true });
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user?.id).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
      const hasRefresh = res.headers['set-cookie']?.some((c: string) => c.includes('refreshToken'));
      expect(hasRefresh).toBe(true);
    });

    it('rejects duplicate email', async () => {
      const email = `dup-${Date.now()}@example.com`;
      await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'First',
          emailOrPhone: email,
          password: 'SecurePass123!',
        })
        .expect(200);
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Second',
          emailOrPhone: email,
          password: 'SecurePass123!',
        });
      expect([400, 409]).toContain(res.status);
      expect(res.body.ok).toBe(false);
    });

    it('rejects weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Test',
          emailOrPhone: `weak-${Date.now()}@example.com`,
          password: '123',
        });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns tokens for valid credentials', async () => {
      const email = `login-${Date.now()}@example.com`;
      await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Login User',
          emailOrPhone: email,
          password: 'SecurePass123!',
        })
        .expect(200);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ emailOrPhone: email, password: 'SecurePass123!' })
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data?.accessToken).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      const email = `wrong-${Date.now()}@example.com`;
      await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Wrong',
          emailOrPhone: email,
          password: 'SecurePass123!',
        })
        .expect(200);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ emailOrPhone: email, password: 'WrongPassword' });
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns 401 without refresh cookie', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('accepts logout and returns 200', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect([200, 204]).toContain(res.status);
    });
  });
});
