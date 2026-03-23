/**
 * One-time script: delete admin IDs 2–7 safely.
 * Run: npx tsx --env-file=../../.env src/scripts/delete-admins.ts
 */
import { prisma } from '../lib/prisma.ts';

const IDS_TO_DELETE = [2, 3, 4, 5, 6, 7];

async function main() {
  console.log('Deleting admins:', IDS_TO_DELETE);

  await prisma.$transaction(async (tx) => {
    // 1. Nullify nullable FK references in SupportTicket
    await tx.supportTicket.updateMany({
      where: { assignedTo: { in: IDS_TO_DELETE } },
      data: { assignedTo: null, assignedAt: null },
    });
    await tx.supportTicket.updateMany({
      where: { repliedBy: { in: IDS_TO_DELETE } },
      data: { repliedBy: null },
    });

    // 2. Nullify reviewerId in AbuseReport (nullable)
    await tx.abuseReport.updateMany({
      where: { reviewerId: { in: IDS_TO_DELETE } },
      data: { reviewerId: null },
    });

    // 3. Delete AbuseReports where reporter is one of these admins
    await tx.abuseReport.deleteMany({
      where: { reporterId: { in: IDS_TO_DELETE } },
    });

    // 4. Delete ScheduledNotifications created by these admins
    await tx.scheduledNotification.deleteMany({
      where: { createdById: { in: IDS_TO_DELETE } },
    });

    // 5. Delete QuickReplies created by these admins
    await tx.quickReply.deleteMany({
      where: { createdBy: { in: IDS_TO_DELETE } },
    });

    // 6. Delete AdminAuditLogs for these admins
    await tx.adminAuditLog.deleteMany({
      where: { adminId: { in: IDS_TO_DELETE } },
    });

    // 7. Nullify managerId for any admin managed by these admins
    await tx.admin.updateMany({
      where: { managerId: { in: IDS_TO_DELETE } },
      data: { managerId: null },
    });

    // 8. Finally delete the admins
    const deleted = await tx.admin.deleteMany({
      where: { id: { in: IDS_TO_DELETE } },
    });
    console.log(`Deleted ${deleted.count} admins.`);
  });

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
