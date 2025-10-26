export interface WorkScheduleResponse {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: WorkScheduleStatus;
  createdByUserId: number;
  approvedByUserId?: number;
  approvedAt?: string;
  publishedAt?: string;
  rejectionReason?: string;
  entriesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkScheduleDetailsResponse {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: WorkScheduleStatus;
  createdByUserId: number;
  approvedByUserId?: number;
  approvedAt?: string;
  publishedAt?: string;
  rejectionReason?: string;
  entries: WorkScheduleEntryResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkScheduleEntryResponse {
  id: number;
  userId: number;
  userName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  workingHours: number;
  shiftType?: string;
  position?: string;
  location?: string;
  notes?: string;
  status: WorkScheduleEntryStatus;
  isOvertime: boolean;
  conflictingLeaveProposalId?: number;
}

export interface CreateWorkScheduleRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface AddWorkScheduleEntryRequest {
  userId: number;
  workDate: string;
  startTime: string;
  endTime: string;
  shiftType?: string;
  position?: string;
  location?: string;
  notes?: string;
  isOvertime: boolean;
}

export interface UpdateWorkScheduleEntryRequest {
  startTime: string;
  endTime: string;
  shiftType?: string;
  position?: string;
  location?: string;
  notes?: string;
  isOvertime: boolean;
}

export interface RejectWorkScheduleRequest {
  rejectionReason: string;
}

export interface WorkScheduleHistoryResponse {
  id: number;
  workScheduleId: number;
  entryId?: number;
  version: number;
  changeType: string;
  changedBy: string;
  changedAt: string;
  changeDescription?: string;
  snapshotData?: string;
  changedFields?: string;
}

export enum WorkScheduleStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED'
}

export enum WorkScheduleEntryStatus {
  ACTIVE = 'ACTIVE',
  CONFLICTED = 'CONFLICTED',
  CANCELLED = 'CANCELLED'
}