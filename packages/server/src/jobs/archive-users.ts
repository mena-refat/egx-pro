import { prisma } from '../lib/prisma.ts';
import { logger } from '../lib/logger.ts';

export async function runArchiveUsersJob(): Promise<void> {
  try {
    const now = new Date();
    const toArchive = await prisma.user.findMany({
      where: {
        isDeleted: true,
        deletionScheduledFor: { lt: now },
      },
    });
    const prismaWithArchive = prisma as typeof prisma & {
      archivedUser: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
      refreshToken: { deleteMany: (args: { where: { expiresAt: { lt: Date } } }) => Promise<unknown> };
    };
    for (const u of toArchive) {
      try {
        await prisma.$transaction(async (tx) => {
          const txWithArchive = tx as typeof prismaWithArchive;
          await txWithArchive.archivedUser.create({
            data: {
              originalId: u.id,
              email: u.email ?? undefined,
              phone: u.phone ?? undefined,
              username: u.username ?? undefined,
              name: u.fullName ?? undefined,
              userData: {
                id: u.id,
                email: u.email,
                phone: u.phone,
                username: u.username,
                fullName: u.fullName,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
              },
            },
          });
          await tx.user.delete({ where: { id: u.id } });
        });
      } catch (e) {
        logger.error('Archive user error', { userId: u.id, error: e });
      }
    }
    await prismaWithArchive.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });
  } catch (err) {
    logger.error('Cleanup job error', { error: err });
  }
}
