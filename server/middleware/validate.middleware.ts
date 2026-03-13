import type { Request, Response, NextFunction } from 'express';
import type { z, ZodSchema } from 'zod';
import { sendError } from '../lib/apiResponse.ts';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = (schema as z.ZodSchema).safeParse(req[source]);
    if (!result.success) {
      sendError(
        res,
        'VALIDATION_ERROR',
        400,
        undefined,
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      );
      return;
    }
    // Express Request typings don't allow indexed assignment; validated data is type-safe from schema
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
