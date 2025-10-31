// Annex search models based on backend contract

export type AnnexStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AnnexSearchItem {
  annex_id: number;
  record_id: number | null;
  employee_id: number | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  period_year: number | null;
  period_month: number | null;
  correction_date: string;            // ISO Date: YYYY-MM-DD
  original_hours: number | null;      // currently always null
  corrected_hours: number | null;     // decimal -> number
  status: AnnexStatus | null;
  reason: string;
  created_by: number;
  created_by_name: string | null;     // "Imię Nazwisko"
  created_at: string;                 // ISO DateTime
  approved_by: number | null;
  approved_by_name: string | null;    // "Imię Nazwisko"
  approved_at: string | null;         // ISO DateTime or null
}

export interface AnnexPageResponse {
  items: AnnexSearchItem[];
  page: number;            // 0-based
  size: number;            // page size
  total_elements: number;  // total elements
  total_pages: number;     // total pages
  sort?: string;           // description of sorting
}
