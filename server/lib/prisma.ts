import { PrismaClient } from '@prisma/client';
import { logger } from './logger.ts';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  (() => {
    let url = process.env.DATABASE_URL;
    if (!url || !url.trim()) {
      throw new Error('DATABASE_URL is not defined in environment variables.');
    }
    {
      // Force port 6543 and pgbouncer for Supabase if not already set
      if (url.includes('supabase.co') && !url.includes(':6543')) {
        url = url.replace(':5432', ':6543');
        if (!url.includes('pgbouncer=true')) {
          url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
        }
      }
      // Mask password for logging
      const maskedUrl = url.replace(/:[^:@]+@/, ':****@');
      logger.info('Initializing Prisma with URL', { url: maskedUrl });
    }

    return new PrismaClient({
      datasources: {
        db: {
          url: url,
        },
      },
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    });
  })();

// Test connection on startup
prisma.$connect()
  .then(() => logger.info('✅ Database connected successfully'))
  .catch((e) => logger.error('❌ Failed to connect to database', { message: (e as Error).message }));

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
