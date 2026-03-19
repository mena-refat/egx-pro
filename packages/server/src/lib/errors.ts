/**
 * Typed business errors for consistent API responses.
 * Use in services: throw new AppError('CODE', status);
 * Central error middleware in server.ts maps these to JSON.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message ?? code);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
