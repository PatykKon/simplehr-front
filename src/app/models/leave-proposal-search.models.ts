import { LeaveProposalStatus, LeaveType } from './leave-proposal.models';

// Search result item for leave proposals (snake_case aligned with backend paging contracts)
export interface LeaveProposalSearchItem {
  proposal_id: number;
  employee_id: number | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  leave_type: LeaveType | string | null;
  start_date: string;         // YYYY-MM-DD
  end_date: string;           // YYYY-MM-DD
  requested_days: number | null;
  status: LeaveProposalStatus | string | null;
  title: string | null;
  created_at: string;       // ISO DateTime
  submitted_at?: string | null; // ISO DateTime (prefer for "Utworzono" if present)
  // Approval details (preferred when present)
  approved_by?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  processed_by: number | null;
  processed_by_name: string | null; // "Imię Nazwisko"
  processed_at: string | null;      // ISO DateTime or null
}

export interface LeaveProposalPageResponse {
  items: LeaveProposalSearchItem[];
  page: number;            // 0-based
  size: number;            // page size
  total_elements: number;  // total elements
  total_pages: number;     // total pages
  sort?: string;           // description of sorting
}

export type LeaveProposalSearchStatus = LeaveProposalStatus | 'PENDING'; // allow common aliases

export interface LeaveProposalSearchParams {
  year?: number;         // derived from start_date/end_date period
  month?: number;        // 1-12
  status?: LeaveProposalSearchStatus;
  leave_type?: LeaveType | string;
  my_only?: boolean;
  first_name?: string;
  last_name?: string;
  start_date?: string;   // YYYY-MM-DD
  end_date?: string;     // YYYY-MM-DD
  page?: number;         // 0-based
  size?: number;         // default 20
  sort?: string | string[]; // e.g. 'submittedAt,DESC' or multi
}
