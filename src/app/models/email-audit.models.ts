export type EmailStatus = string; // e.g., PENDING | SENT | FAILED
export type EmailType = string;   // e.g., TRIAL_SIGNUP | VERIFY | WELCOME | NOTIFICATION

export interface EmailAuditItem {
  id: number;
  recipient: string;
  subject: string;
  preview: string;
  type: EmailType;
  status: EmailStatus;
  provider: string; // smtp|log
  error?: string | null;
  createdAt: string; // ISO
  sentAt?: string | null; // ISO
}

export interface EmailAuditPage {
  items: EmailAuditItem[];
  page: number;
  size: number;
  total: number;
}

export interface EmailAuditQuery {
  page?: number;
  size?: number;
  sort?: string; // createdAt,desc | status,asc ... (whitelist enforced server-side)
  status?: EmailStatus | null;
  type?: EmailType | null;
  to?: string | null; // recipient contains
  provider?: 'smtp' | 'log' | string | null;
  from?: string | null; // ISO date-time
  toDate?: string | null; // ISO date-time
}
