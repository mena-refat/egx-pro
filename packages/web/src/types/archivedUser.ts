/** ArchivedUser — from Prisma (API: archivedAt as ISO string) */
export interface ArchivedUser {
  id: string;
  originalId: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  name: string | null;
  userData: unknown;
  archivedAt: string;
}
