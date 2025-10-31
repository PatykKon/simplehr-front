export type TrialStatus = {
  trial: boolean;
  expires_at: string | null;
  remaining_days: number | null;
  days_used: number | null;
  plan: string | null;
};

export type TrialExpiredError = {
  code: 'TRIAL_EXPIRED';
  message?: string;
  expiresAt?: string;
};
