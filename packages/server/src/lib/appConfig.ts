import { prisma } from './prisma.ts';
import { getCache, setCache, deleteCache } from './redis.ts';
import { logger } from './logger.ts';

const SUPPORT_PLANS_KEY = 'support:allowedPlans';
const CACHE_KEY = 'appconfig:support_plans';
const CACHE_TTL = 30; // 30 seconds — short enough that admin changes take effect quickly

const DEFAULT_PLANS = ['pro', 'yearly', 'ultra', 'ultra_yearly'];

export async function getSupportAllowedPlans(): Promise<string[]> {
  const cached = await getCache<string[]>(CACHE_KEY);
  if (cached) return cached;

  const row = await prisma.appConfig.findUnique({ where: { key: SUPPORT_PLANS_KEY } });
  if (!row) {
    logger.warn('[appConfig] support:allowedPlans not found in DB — using defaults. Run the seed script to initialize.');
  }
  const plans: string[] = row ? (JSON.parse(row.value) as string[]) : DEFAULT_PLANS;

  await setCache(CACHE_KEY, plans, CACHE_TTL);
  return plans;
}

export async function setSupportAllowedPlans(plans: string[]): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: SUPPORT_PLANS_KEY },
    update: { value: JSON.stringify(plans) },
    create: { key: SUPPORT_PLANS_KEY, value: JSON.stringify(plans) },
  });
  await deleteCache(CACHE_KEY);
}
