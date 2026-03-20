/** Referral - from Prisma (API: createdAt as ISO string) */
export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  status: string;
  createdAt: string;
}
