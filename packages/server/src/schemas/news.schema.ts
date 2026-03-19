import { z } from 'zod';

export const analyzeNewsBodySchema = z.object({
  title: z.string().min(5).max(400),
  description: z.string().max(2000).optional(),
});
