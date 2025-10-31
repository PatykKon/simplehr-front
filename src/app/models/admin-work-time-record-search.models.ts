// Admin work time record search models based on backend handover
export interface AdminWorkTimeRecordSearchItem {
  record_id: number;
  employee_id: number;
  employee_first_name: string;
  employee_last_name: string;
  period_year: number;
  period_month: number;
  planned_hours: number; // decimal -> number
  worked_hours: number;  // decimal -> number
  leave_hours: number;   // decimal -> number
  leave_days: number;    // decimal -> number (leave_hours / 8)
  status: string;        // WorkTimeRecordStatus as string
  created_at: string;    // ISO DateTime
}

export interface AdminWorkTimeRecordPageResponse {
  items: AdminWorkTimeRecordSearchItem[];
  page: number;           // 0-based
  size: number;
  total_elements: number;
  total_pages: number;
  sort?: string;          // description of sorting
}

export interface AdminWorkTimeRecordSearchParams {
  year?: number;
  month?: number;          // 1-12
  status?: string;         // enum value string
  my_only?: boolean;
  employee_id?: number;
  first_name?: string;
  last_name?: string;
  page?: number;           // 0-based
  size?: number;           // default 20
  sort?: string | string[]; // e.g. 'createdAt,DESC' or multi
}
