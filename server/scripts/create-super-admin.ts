import '../lib/dotenv.ts';
import { prisma } from '../lib/prisma.ts';
import { hashPassword } from '../../src/lib/auth.ts';

async function main(): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'admin@borsa.app';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? '';

  if (!password || password.length < 12) {
    // eslint-disable-next-line no-console
    console.error('Set SUPER_ADMIN_PASSWORD env (min 12 chars)');
    process.exit(1);
  }

  const { hash, salt } = await hashPassword(password);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      passwordHash: hash,
      salt,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      email,
      passwordHash: hash,
      salt,
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Super Admin created: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

