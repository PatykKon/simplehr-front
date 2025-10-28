export type WorkTimeType = 'SCHEDULE_WORK' | 'PUNCH_IN_OUT' | 'MANUAL_ENTRY';

export interface WorkTimeDayResponse {
  workDate: string; // YYYY-MM-DD
  // Schedule/planned
  scheduledStartTime?: string | null; // HH:mm
  scheduledEndTime?: string | null; // HH:mm
  // Punch
  punchInTime?: string | null; // HH:mm
  punchOutTime?: string | null; // HH:mm
  // Manual
  standardHours?: number | null;
  overtimeHours?: number | null;
  // Effective
  roundedHours?: number | null;
  // Meta
  editable: boolean;
  leaveDay: boolean;
  leaveType?: string | null;
  note?: string | null;
}

export interface WorkTimePunchRequest {
  workDate: string; // YYYY-MM-DD
  time?: string; // HH:mm, optional (server time if absent)
}

export interface ManualDayRequest {
  workDate: string; // YYYY-MM-DD
  standardHours: number; // 0..24
  overtimeHours: number; // 0..24
  note?: string | null;
}

export interface WorkTimeConfig {
  id?: number;
  name: string;
  description?: string;
  workTimeType: WorkTimeType;
  active: boolean;
  approverUserIds?: number[];
  // Flags
  autoMarkLeaveDays?: boolean;
  allowCorrections?: boolean;
  correctionDaysLimit?: number;
  // Punch
  autoRoundEnabled?: boolean;
  roundingMinutes?: number; // default 15
  // Manual
  maxDailyHours?: number;
  maxDailyOvertimeHours?: number;
}
