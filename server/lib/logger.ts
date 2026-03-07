import winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? '\n' + JSON.stringify(meta, null, 2)
            : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      )
    : winston.format.combine(
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
