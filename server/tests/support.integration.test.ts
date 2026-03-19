import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Support Tickets', () => {
  let app: Express;
  let accessToken: string;
  let ticketId: string;

  beforeAll(async () => {
    app = await createApp();
    const email = `support-${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Support User', emailOrPhone: email, password: 'SecurePass123!' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: email, password: 'SecurePass123!' });
    accessToken = res.body.data?.accessToken;
  });

  describe('POST /api/support', () => {
    it('creates a ticket for authenticated user', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ subject: 'Test subject', message: 'This is a test message for support.' })
        .expect(200);
      expect(res.body.ok).toBe(true);
      ticketId = res.body.data?.id ?? res.body.data?.ticket?.id;
    });

    it('returns 400 for missing subject', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Message without subject' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 400 for short message', async () => {
      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ subject: 'Valid subject', message: 'Short' });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 401 without token', async () => {
      await request(app)
        .post('/api/support')
        .send({ subject: 'Test', message: 'Test message here' })
        .expect(401);
    });
  });

  describe('GET /api/support/my', () => {
    it('returns user tickets', async () => {
      const res = await request(app)
        .get('/api/support/my')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data?.tickets ?? res.body.data)).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(app).get('/api/support/my').expect(401);
    });
  });

  describe('PATCH /api/support/:id/rate', () => {
    it('returns 400 for invalid rating', async () => {
      if (!ticketId) return;
      const res = await request(app)
        .patch(`/api/support/${ticketId}/rate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ rating: 10 }); // invalid — must be 1-5
      expect([400, 422]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      if (!ticketId) return;
      await request(app)
        .patch(`/api/support/${ticketId}/rate`)
        .send({ rating: 5 })
        .expect(401);
    });
  });
});
