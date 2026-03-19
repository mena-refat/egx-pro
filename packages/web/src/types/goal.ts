/** Goal — from Prisma (API: dates as ISO string) */
export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string | null;
  category: string;
  status: string;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
