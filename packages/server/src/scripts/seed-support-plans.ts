/**
 * One-time script: set support:allowedPlans in AppConfig.
 * Edit ALLOWED_PLANS below then run:
 *   npx tsx --env-file=../../.env src/scripts/seed-support-plans.ts
 */
import { prisma } from '../lib/prisma.ts';

// Change this array to whatever plans should have support access:
const ALLOWED_PLANS = ['ultra', 'ultra_yearly'];  // Pro disabled

async function main() {
  const value = JSON.stringify(ALLOWED_PLANS);
  await prisma.appConfig.upsert({
    where:  { key: 'support:allowedPlans' },
    update: { value },
    create: { key: 'support:allowedPlans', value },
  });
  console.log('support:allowedPlans set to:', ALLOWED_PLANS);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
