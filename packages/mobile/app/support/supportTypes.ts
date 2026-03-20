export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  reply?: string | null;
  repliedAt?: string | null;
  replyRead: boolean;
  rating?: number | null;
  createdAt: string;
}

export const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'مفتوحة', color: '#3b82f6', bg: '#3b82f615' },
  IN_PROGRESS: { label: 'قيد المعالجة', color: '#f59e0b', bg: '#f59e0b15' },
  RESOLVED: { label: 'محلولة', color: '#4ade80', bg: '#4ade8015' },
  CLOSED: { label: 'مغلقة', color: '#8b949e', bg: '#8b949e15' },
};

export function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ي`;
  return new Date(d).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

