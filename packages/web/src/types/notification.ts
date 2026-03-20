/** Notification type - from Prisma + API */
export type NotificationType =
  | 'achievement'
  | 'stock_target'
  | 'referral_success'
  | 'goal_reminder'
  | 'portfolio_update'
  | 'referral'
  | 'goal'
  | 'portfolio';

/** Notification - from Prisma (API: createdAt as ISO string) */
export interface Notification {
  id: string;
  userId?: string;
  type: NotificationType | string;
  title: string;
  body: string;
  isRead: boolean;
  route?: string;
  createdAt: string;
}
