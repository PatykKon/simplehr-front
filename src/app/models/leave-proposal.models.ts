// Enum dla typów urlopów - zgodny z backendem
export enum LeaveType {
  ANNUAL = 'ANNUAL',           // Urlop wypoczynkowy
  SICK = 'SICK',              // Zwolnienie lekarskie
  UNPAID = 'UNPAID',          // Urlop bezpłatny
  PARENTAL = 'PARENTAL',      // Urlop rodzicielski
  MATERNITY = 'MATERNITY',    // Urlop macierzyński
  PATERNITY = 'PATERNITY',    // Urlop ojcowski
  COMPASSIONATE = 'COMPASSIONATE', // Urlop okolicznościowy
  STUDY = 'STUDY',            // Urlop szkoleniowy
  SABBATICAL = 'SABBATICAL',  // Urlop sabbatical
  OTHER = 'OTHER'             // Inny
}

export interface CreateLeaveProposalRequest {
  leaveType: LeaveType;
  startDate: string;          // Format: YYYY-MM-DD
  endDate: string;           // Format: YYYY-MM-DD
  title?: string;
  description?: string;
  handoverNotes?: string;
  substituteUserId?: number;
}

export interface CreateLeaveProposalResponse {
  id: number;
  message: string;
}

export interface UpdateLeaveProposalRequest {
  leaveType: LeaveType;
  startDate: string;          // Format: YYYY-MM-DD
  endDate: string;           // Format: YYYY-MM-DD
  title?: string;
  description?: string;
  handoverNotes?: string;
  substituteUserId?: number;
}

export interface AcceptLeaveProposalRequest {
  approverComments?: string;
}

export interface RejectLeaveProposalRequest {
  rejectionReason: string;
  approverComments?: string;
}

export interface LeaveProposalOperationResponse {
  message: string;
}

export interface EmployeeLeaveProposalResponse {
  id: number;
  userId: number;
  userName: string;
  userFirstName: string;
  userLastName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  requestedDays: number;
  title?: string;
  description?: string;
  handoverNotes?: string;
  substituteUserId?: number;
  substituteUserName?: string;
  status: LeaveProposalStatus;
  urgentRequest: boolean;
  submittedAt: string;
  processedAt?: string;
  processedByUserId?: number;
  processedByUserName?: string;
  rejectionReason?: string;
  approverComments?: string;
}

export enum LeaveProposalStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface LeaveConfiguration {
  id: number;
  companyId: number;
  leaveType: string;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  canCarryOver: boolean;
  maxCarryOverDays?: number;
  description?: string;
}

export interface EmployeeLeavesResponse {
  year: number;
  month: number;
  employees: EmployeeLeaveInfo[];
}

export interface EmployeeLeaveInfo {
  employeeId: number;
  firstName: string;
  lastName: string;
  email: string;
  leaveDays: LeaveDay[];
}

export interface LeaveDay {
  date: string;
  leaveType: LeaveType;
}

// Kalendarz urlopów
export interface LeaveCalendarResponse {
  date: string;              // Format: YYYY-MM-DD
  users: LeaveCalendarUser[];
}

export interface LeaveCalendarUser {
  userId: number;
  userName: string;
  userFirstName: string;
  userLastName: string;
  leaveType: LeaveType;
  proposalId: number;
}

// Historia zmian wniosku
export interface ProposalHistoryResponse {
  id: number;
  proposalId: number;
  proposalType: string;
  version: number;
  status: LeaveProposalStatus;
  changedBy: string;
  changedAt: string;
  changeType: string;
  changeDescription?: string;
  changedFields?: string;
}

// Statystyki urlopowe dla danego okresu
export interface LeaveStatsResponse {
  totalEmployees: number;
  employeesOnLeave: number;
  overlappingRequests: OverlappingRequest[];
}

export interface OverlappingRequest {
  date: string;
  employees: LeaveCalendarUser[];
}

// Opcje dla selectów
export interface LeaveTypeOption {
  value: LeaveType;
  label: string;
  description: string;
  color: string;
  icon: string;
}

export interface LeaveStatusOption {
  value: LeaveProposalStatus;
  label: string;
  color: string;
  icon: string;
}

// Pomocnicze funkcje do mapowania
export const LEAVE_TYPE_LABELS: { [key in LeaveType]: string } = {
  [LeaveType.ANNUAL]: 'Urlop wypoczynkowy',
  [LeaveType.SICK]: 'Zwolnienie lekarskie',
  [LeaveType.UNPAID]: 'Urlop bezpłatny',
  [LeaveType.PARENTAL]: 'Urlop rodzicielski',
  [LeaveType.MATERNITY]: 'Urlop macierzyński',
  [LeaveType.PATERNITY]: 'Urlop ojcowski',
  [LeaveType.COMPASSIONATE]: 'Urlop okolicznościowy',
  [LeaveType.STUDY]: 'Urlop szkoleniowy',
  [LeaveType.SABBATICAL]: 'Urlop sabbatical',
  [LeaveType.OTHER]: 'Inny'
};

export const LEAVE_STATUS_LABELS: { [key in LeaveProposalStatus]: string } = {
  [LeaveProposalStatus.DRAFT]: 'Roboczy',
  [LeaveProposalStatus.SUBMITTED]: 'Złożony',
  [LeaveProposalStatus.IN_REVIEW]: 'W trakcie przeglądu',
  [LeaveProposalStatus.APPROVED]: 'Zatwierdzony',
  [LeaveProposalStatus.REJECTED]: 'Odrzucony',
  [LeaveProposalStatus.CANCELLED]: 'Anulowany',
  [LeaveProposalStatus.WITHDRAWN]: 'Wycofany',
};

export const LEAVE_TYPE_OPTIONS: LeaveTypeOption[] = [
  {
    value: LeaveType.ANNUAL,
    label: 'Urlop wypoczynkowy',
    description: 'Płatny urlop wypoczynkowy',
    color: '#2563eb',
    icon: '🏖️'
  },
  {
    value: LeaveType.SICK,
    label: 'Zwolnienie lekarskie',
    description: 'Zwolnienie z powodu choroby',
    color: '#dc2626',
    icon: '🏥'
  },
  {
    value: LeaveType.UNPAID,
    label: 'Urlop bezpłatny',
    description: 'Niepatny urlop na żądanie',
    color: '#6b7280',
    icon: '💸'
  },
  {
    value: LeaveType.PARENTAL,
    label: 'Urlop rodzicielski',
    description: 'Urlop związany z opieką nad dzieckiem',
    color: '#059669',
    icon: '👶'
  },
  {
    value: LeaveType.MATERNITY,
    label: 'Urlop macierzyński',
    description: 'Urlop macierzyński',
    color: '#ec4899',
    icon: '🤱'
  },
  {
    value: LeaveType.PATERNITY,
    label: 'Urlop ojcowski',
    description: 'Urlop ojcowski',
    color: '#0ea5e9',
    icon: '👨‍👶'
  },
  {
    value: LeaveType.COMPASSIONATE,
    label: 'Urlop okolicznościowy',
    description: 'Urlop w szczególnych okolicznościach',
    color: '#7c3aed',
    icon: '🤝'
  },
  {
    value: LeaveType.STUDY,
    label: 'Urlop szkoleniowy',
    description: 'Urlop na cele edukacyjne',
    color: '#ea580c',
    icon: '📚'
  },
  {
    value: LeaveType.SABBATICAL,
    label: 'Urlop sabbatical',
    description: 'Długoterminowy urlop sabbatical',
    color: '#84cc16',
    icon: '🧘'
  },
  {
    value: LeaveType.OTHER,
    label: 'Inny',
    description: 'Inny typ urlopu',
    color: '#64748b',
    icon: '📝'
  }
];

export const LEAVE_STATUS_OPTIONS: LeaveStatusOption[] = [
  {
    value: LeaveProposalStatus.APPROVED,
    label: 'Zatwierdzony',
    color: '#10b981',
    icon: '✅'
  },
  {
    value: LeaveProposalStatus.REJECTED,
    label: 'Odrzucony',
    color: '#ef4444',
    icon: '❌'
  },
  {
    value: LeaveProposalStatus.CANCELLED,
    label: 'Anulowany',
    color: '#6b7280',
    icon: '🚫'
  }
];