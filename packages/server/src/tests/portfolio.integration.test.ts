import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../createApp.ts';

describe('Portfolio Integration', () => {
  let app: Express;
  let accessToken: string;

  beforeAll(async () => {
    app = await createApp();
    const email = `portfolio-${Date.now()}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Portfolio User',
        emailOrPhone: email,
        password: 'SecurePass123!',
      })
      .expect(200);
    accessToken = reg.body.data?.accessToken ?? '';
    if (!accessToken) throw new Error('Failed to get access token');
  });

  it('adds holding → gets portfolio → deletes', async () => {
    const addRes = await request(app)
      .post('/api/portfolio/add')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ticker: 'COMI',
        shares: 10,
        purchasePrice: 5,
        purchaseDate: '2024-01-15',
      });
    expect([200, 201]).toContain(addRes.status);
    expect(addRes.body.ok).toBe(true);

    const listRes = await request(app)
      .get('/api/portfolio')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listRes.body.ok).toBe(true);
    const holdings = listRes.body.data?.holdings ?? listRes.body.holdings ?? [];
    expect(holdings.length).toBeGreaterThanOrEqual(1);
    const added = holdings.find((h: { ticker: string }) => h.ticker === 'COMI');
    expect(added).toBeDefined();
    const id = added?.id ?? added?.holdingId;

    if (id) {
      const delRes = await request(app)
        .delete(`/api/portfolio/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 204]).toContain(delRes.status);
    }
  });

  it('rejects unauthenticated portfolio add', async () => {
    const res = await request(app)
      .post('/api/portfolio/add')
      .send({
        ticker: 'COMI',
        shares: 10,
        purchasePrice: 5,
        purchaseDate: '2024-01-15',
      });
    expect(res.status).toBe(401);
  });
});
