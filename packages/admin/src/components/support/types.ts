export type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assignedTo: number | null;
  assignedAt: string | null;
  assignedAgent: { fullName: string; email: string } | null;
  reply: string | null;
  repliedAt: string | null;
  rating: number | null;
  escalatedAt: string | null;
  escalatedBy: number | null;
  escalationNote: string | null;
  escalatedToManager: number | null;
  createdAt: string;
  user: { id: number; email: string | null; username: string | null; fullName: string | null; plan: string };
};

export type AgentStat = {
  agent: { id: number; fullName: string; email: string };
  total: number;
  resolved: number;
  active: number;
  avgRating: number | null;
  ratingCount: number;
  avgResponseHours: number | null;
};

export type ManagerStat = {
  manager: { id: number; fullName: string; email: string };
  teamSize: number;
  teamTotal: number;
  teamResolved: number;
  teamResolveRate: number;
  avgAssignmentHours: number | null;
};

export type MyStats = {
  total: number;
  resolved: number;
  active: number;
  avgRating: number | null;
  ratingCount: number;
  avgResponseHours: number | null;
};

export type Agent = { id: number; fullName: string; email: string };
export type QuickReply = { id: number; title: string; content: string };

export type AbuseReport = {
  id: number;
  ticketId: string;
  reason: string;
  status: 'PENDING' | 'WARNED' | 'DISMISSED';
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  ticket: { id: string; subject: string; message: string };
  user: { id: number; email: string | null; username: string | null; fullName: string | null; warningCount: number; isSuspended: boolean };
  reporter: { id: number; fullName: string; email: string };
  reviewer: { id: number; fullName: string } | null;
};
