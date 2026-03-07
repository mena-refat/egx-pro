import { PrismaClient } from '@prisma/client';

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
      console.log('Initializing Prisma with URL:', maskedUrl);
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
  .then(() => console.log('✅ Database connected successfully'))
  .catch((e) => console.error('❌ Failed to connect to database:', e.message));

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
