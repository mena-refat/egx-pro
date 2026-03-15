import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../routes/types.ts';
import { IDEMPOTENCY } from '../lib/constants.ts';
import { idempotencyKeySchema } from '../schemas/idempotency.schema.ts';
import { sendError } from '../lib/apiResponse.ts';
import { IdempotencyService } from '../services/idempotency.service.ts';
import { logger } from '../lib/logger.ts';

function getPath(req: AuthRequest): string {
  return req.originalUrl.split('?')[0] ?? req.originalUrl;
}

function toJsonBody(body: unknown): unknown {
  if (body === undefined || body === '') return null;
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export async function idempotencyMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawHeader = req.header(IDEMPOTENCY.header);
  if (!rawHeader) {
    next();
    return;
  }

  const parsed = idempotencyKeySchema.safeParse(rawHeader);
  if (!parsed.success) {
    sendError(res, 'INVALID_IDEMPOTENCY_KEY', 400);
    return;
  }

  req.idempotencyKey = parsed.data;

  const userId = req.user?.id ?? req.userId;
  if (!userId) {
    next();
    return;
  }

  try {
    const reservation = await IdempotencyService.begin({
      userId,
      key: parsed.data,
      method: req.method,
      path: getPath(req),
      body: req.body,
    });

    if (reservation.kind === 'replay') {
      res.set('Idempotency-Replayed', 'true');
      if (reservation.body == null) {
        res.status(reservation.status).send();
        return;
      }
      res.status(reservation.status).json(reservation.body);
      return;
    }

    req.idempotencyRecordId = reservation.recordId;
    res.set('Idempotency-Replayed', 'false');

    let responseCaptured = false;
    let responseBody: unknown;

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = ((body: unknown) => {
      responseCaptured = true;
      responseBody = body;
      return originalJson(body);
    }) as Response['json'];

    res.send = ((body?: unknown) => {
      if (!responseCaptured) {
        responseCaptured = true;
        responseBody = toJsonBody(body);
      }
      return originalSend(body);
    }) as Response['send'];

    res.on('finish', () => {
      const recordId = req.idempotencyRecordId;
      if (!recordId) return;
      const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
      const action = isSuccess
        ? IdempotencyService.complete(recordId, res.statusCode, responseBody)
        : IdempotencyService.release(recordId);
      void action.catch((error: unknown) => {
        logger.warn('Failed to finalize idempotency request', {
          recordId,
          statusCode: res.statusCode,
          error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        });
      });
    });

    next();
  } catch (error) {
    if (error instanceof Error && 'code' in error && 'status' in error) {
      const appError = error as { code: string; status: number };
      sendError(res, appError.code, appError.status);
      return;
    }
    next(error);
  }
}
