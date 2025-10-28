export type SchedulePatternType = 'FIXED_HOURS' | 'WEEKLY_ROTATION' | 'CYCLE_WORK_OFF';

export interface BaseScheduleConfig {
  id: string; // uuid or generated
  name: string;
  description?: string;
  type: SchedulePatternType;
  includeSaturdays: boolean;
  includeSundays: boolean;
  includeHolidays: boolean; // Placeholder: requires holiday calendar to be effective
}

export interface FixedHoursConfig extends BaseScheduleConfig {
  type: 'FIXED_HOURS';
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface WeeklyRotationShift {
  label: string;            // e.g., "6-14"
  startTime: string;        // HH:mm
  endTime: string;          // HH:mm
  weeks: number;            // how many weeks this shift lasts before next
}

export interface WeeklyRotationConfig extends BaseScheduleConfig {
  type: 'WEEKLY_ROTATION';
  rotationMode?: 'BY_WEEKS' | 'BY_DATES';
  // BY_WEEKS mode (default)
  rotation?: WeeklyRotationShift[]; // in order, repeats
  rotationStartDate?: string;       // YYYY-MM-DD, alignment point
  // BY_DATES mode: explicit date segments
  segments?: Array<{
    from: string; // YYYY-MM-DD inclusive
    to: string;   // YYYY-MM-DD inclusive
    label?: string;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
  }>;
}

export interface CycleWorkOffConfig extends BaseScheduleConfig {
  type: 'CYCLE_WORK_OFF';
  cycleMode?: 'STRING' | 'BLOCKS';
  // STRING mode (backward compatible)
  cycle?: string;                  // e.g., "WWOO" (W=work, O=off)
  cycleStartDate: string;          // YYYY-MM-DD, alignment point (used by both modes)
  workStartTime?: string;          // HH:mm (STRING mode)
  workEndTime?: string;            // HH:mm (STRING mode)
  // BLOCKS mode: explicit sequence of work/off blocks that repeats
  blocks?: Array<{
    kind: 'WORK' | 'OFF';
    days: number;                  // consecutive day count
    startTime?: string;            // required when kind=WORK
    endTime?: string;              // required when kind=WORK
    label?: string;                // optional label e.g., "6-14"
  }>;
  // Anchor policy for preview/apply when no explicit date is provided
  startOnWeekend?: boolean;        // if true and no date provided, anchor on first weekend day of month
}

export type ScheduleConfig = FixedHoursConfig | WeeklyRotationConfig | CycleWorkOffConfig;

export interface DayPreview {
  date: string;         // YYYY-MM-DD
  isWork: boolean;
  startTime?: string;   // HH:mm
  endTime?: string;     // HH:mm
  note?: string;        // extra info, e.g., shift label
}

// Backend DTOs (for /api/schedule-configs)
export type BackendConfigType = 'ROTATIONAL' | 'WEEKLY' | 'FIXED' | 'CUSTOM_PATTERN' | 'HOLIDAY_RULES';
export type BackendBlockType = 'WORK' | 'OFF';

export interface PatternBlockDto {
  id?: number;
  blockType: BackendBlockType;
  durationDays: number;
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
}

export interface ShiftPatternDto {
  id?: number;
  name: string;
  blocks: PatternBlockDto[];
}

export interface ScheduleConfigDto {
  id?: number;
  name: string;
  configType: BackendConfigType;
  createdAt?: string; // ISO date-time
  patterns: ShiftPatternDto[];
}
