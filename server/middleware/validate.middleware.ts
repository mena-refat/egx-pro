import type { Request, Response, NextFunction } from 'express';
import type { z, ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = (schema as z.ZodSchema).safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
