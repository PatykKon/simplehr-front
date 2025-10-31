export type PlanType = 'FREE' | 'TRIAL' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';

export interface AccountOverview {
  // Company/account scope
  companyId: number;
  companyName: string;
  plan: PlanType;
  active: boolean;
  activatedAt?: string | null; // ISO date
  subscriptionStart?: string | null; // ISO date
  subscriptionEnd?: string | null; // ISO date
  nextPaymentDue?: string | null; // ISO date

  // Usage
  seats?: number | null;
  usedSeats?: number | null;
  usersCount?: number | null;

  // Billing
  lastInvoiceId?: string | null;
  lastInvoiceDate?: string | null; // ISO date
  lastPaymentStatus?: 'PAID' | 'DUE' | 'FAILED' | null;

  // Security / audit
  twoFactorEnabled?: boolean | null;
  lastPasswordChangeAt?: string | null; // ISO date
  lastLoginAt?: string | null; // ISO date
  lastTokenIssuedAt?: string | null; // ISO date

  // Owner / contact
  ownerEmail?: string | null;
}
