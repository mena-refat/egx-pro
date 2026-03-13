/**
 * Common param and query schemas for API validation.
 */
import { z } from 'zod';

const cuidRegex = /^c[a-z0-9]{24,}$/i;

export const idParamSchema = z.object({
  id: z.string().min(1).regex(cuidRegex, 'Invalid id format'),
});

export const tickerParamSchema = z.object({
  ticker: z.string().min(2).max(10).regex(/^[A-Z0-9.]+$/, 'Invalid ticker').transform((s) => s.toUpperCase()),
});

export const usernameParamSchema = z.object({
  username: z.string().min(1).max(100),
});

export const pageLimitQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const followerIdParamSchema = z.object({
  followerId: z.string().min(1).max(100),
});

export const tokenIdParamSchema = z.object({
  tokenId: z.string().min(1).max(100),
});

export const notificationIdParamSchema = z.object({
  id: z.string().min(1).max(100),
});

export const marketDataQuotesQuerySchema = z.object({
  symbols: z.string().min(1),
});
