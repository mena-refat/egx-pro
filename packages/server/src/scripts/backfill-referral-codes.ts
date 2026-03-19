import { prisma } from '../lib/prisma.ts';
import { generateUniqueReferralCode } from '../lib/referral.ts';

async function backfill() {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ referralCode: null }, { referralCode: '' }],
    },
    select: { id: true },
  });

  console.log(`Found ${users.length} users without referral codes`);

  for (const user of users) {
    const code = await generateUniqueReferralCode();
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: code },
    });
    console.log(`✅ ${user.id} → ${code}`);
  }

  console.log('Done!');
  await prisma.$disconnect();
}

backfill().catch(console.error);
