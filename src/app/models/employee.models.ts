export interface AddEmployeeRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
  leaveBalances: { [key: string]: LeaveBalanceDto };
}

export interface LeaveBalanceDto {
  allocatedDays: number;
  usedDays: number;
}

export interface AddEmployeeResponse {
  id: number;
  username: string;
  message: string;
}

export interface EmployeeSummaryResponse {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  enabled: boolean;
}

export interface EmployeeDetailsResponse {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: number;
  roles: string[];
  enabled: boolean;
  leaveBalances: EmployeeLeaveBalanceResponse[];
  leaveProposals: EmployeeLeaveProposalResponse[];
}

export interface EmployeeLeaveBalanceResponse {
  id: number;
  userId: number;
  leaveType: string;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
}

export interface EmployeeLeaveProposalResponse {
  id: number;
  userId: number;
  userName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason?: string;
  status: string;
  urgentRequest: boolean;
  submittedAt: string;
  processedAt?: string;
  processedByUserId?: number;
  processedByUserName?: string;
  rejectionReason?: string;
  approverComments?: string;
}

export interface ImportEmployeesResponse {
  successCount: number;
  failedCount: number;
  errors: string[];
  message: string;
}

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  COMPASSIONATE = 'COMPASSIONATE',
  UNPAID = 'UNPAID'
}

export enum Role {
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_HR = 'ROLE_HR',
  ROLE_MANAGER = 'ROLE_MANAGER',
  ROLE_USER = 'ROLE_USER'
}