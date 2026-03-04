import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    let url = process.env.DATABASE_URL;
    if (!url) {
      console.error('DATABASE_URL is not defined in environment variables!');
    } else {
      // Force port 6543 and pgbouncer for Supabase if not already set
      if (url.includes('supabase.co') && !url.includes(':6543')) {
        url = url.replace(':5432', ':6543');
        if (!url.includes('pgbouncer=true')) {
          url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
        }
      }
      const maskedUrl = url.replace(/:[^:@]+@/, ':****@');
      console.log('Initializing Prisma with URL:', maskedUrl);
    }
    return new PrismaClient({
      datasources: {
        db: {
          url: url,
        },
      },
      log: ['query', 'error', 'warn'],
    });
  })();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
