// Work Schedules search contracts based on backend handover L4
export interface WorkScheduleSearchItem {
  schedule_id: number;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  period_year: number | null;
  period_month: number | null;
  status: string;     // WorkScheduleStatus
  created_by: number | null;
  created_by_name: string | null;
  created_at: string; // ISO
}

export interface WorkSchedulePageResponse {
  items: WorkScheduleSearchItem[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  sort?: string;
}

export interface WorkScheduleSearchParams {
  name?: string;
  year?: number;
  month?: number; // 1-12, paired with year
  status?: string;
  my_only?: boolean;
  created_by?: number;
  created_from?: string; // YYYY-MM-DD
  created_to?: string;   // YYYY-MM-DD
  page?: number;
  size?: number;
  sort?: string | string[]; // e.g. 'createdAt,DESC'
}
