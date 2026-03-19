import winston from 'winston';
import pc from 'picocolors';

const isDev = process.env.NODE_ENV !== 'production';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'salt', 'currentPassword', 'newPassword',
  'token', 'refreshToken', 'accessToken', 'secret', 'twoFactorSecret',
  'authorization', 'cookie', 'apiKey', 'api_key', 'creditCard', 'cvv',
  'cardNumber', 'otp', 'code',
]);

function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 6 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => redactSensitive(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redactSensitive(value, depth + 1);
  }
  return result;
}

const redactFormat = winston.format((info) => {
  const { level, message, timestamp, ...meta } = info;
  return { level, message, timestamp, ...redactSensitive(meta) as object };
});

const LEVEL_COLOR: Record<string, (s: string) => string> = {
  error: pc.red,
  warn: pc.yellow,
  info: pc.green,
  debug: pc.blue,
  http: pc.cyan,
  verbose: pc.magenta,
  silly: pc.gray,
};

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev
    ? winston.format.combine(
        redactFormat(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const colorLevel = (LEVEL_COLOR[level] ?? ((s: string) => s))(level.toUpperCase());
          const metaStr = Object.keys(meta).length
            ? '\n' + JSON.stringify(meta, null, 2)
            : '';
          return `${timestamp} [${colorLevel}]: ${message}${metaStr}`;
        })
      )
    : winston.format.combine(
        redactFormat(),
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
  transports: [
    new winston.transports.Console(),
    ...(isDev ? [] : [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      }),
    ]),
  ],
});
