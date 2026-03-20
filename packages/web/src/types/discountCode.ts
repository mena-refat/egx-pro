/** DiscountCode - from Prisma (API: dates as ISO string) */
export interface DiscountCode {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}
