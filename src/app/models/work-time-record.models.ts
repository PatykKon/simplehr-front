export enum WorkTimeRecordStatus {
    WAITING,
    USER_ACCEPTED,
    SUPERVISOR_ACCEPTED,
    REJECTED,
    ANNEX_CREATED,
    CLOSED

}

export enum WorkTimeRecordAnnexStatus {
    WAITING,
    USER_ACCEPTED,
    SUPERVISOR_ACCEPTED,
    ANNEX_CREATED,
    CLOSED
}

export interface WorkTimeRecordResponse {
  id: number;
  userId: number;
  companyId: number;
  periodYear: number;
  periodMonth: number;
  periodDisplay: string;
  scheduledHours: number; // BigDecimal -> number
  leaveHours: number;
  totalHours: number;
  status: WorkTimeRecordStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  isPendingUserAction: boolean;
  isPendingSupervisorAction: boolean;
}

export interface WorkTimeRecordPageResponse {
  items: WorkTimeRecordResponse[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  sort: string;
}

export interface WorkTimeRecordAnnexResponse {
  id: number;
  correctionDate: string; // YYYY-MM-DD
  correctedHours: number;
  reason: string;
  createdBy: number;
  createdAt: string;
  approvedBy?: number | null;
  approvedAt?: string | null;
  status: WorkTimeRecordAnnexStatus;
}

export interface WorkTimeRecordDetailsResponse extends WorkTimeRecordResponse {
  userAcceptedBy?: number | null;
  userAcceptedAt?: string | null;
  supervisorAcceptedBy?: number | null;
  supervisorAcceptedAt?: string | null;
  rejectedBy?: number | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  annexes: WorkTimeRecordAnnexResponse[];
  isEditable: boolean;
}

export interface WorkTimeRecordHistoryResponse {
  id: number;
  workTimeRecordId: number;
  userId: number;
  previousStatus: WorkTimeRecordStatus;
  newStatus: WorkTimeRecordStatus;
  action: string;
  description: string;
  changedBy: number;
  changedAt: string;
}

export interface RejectWorkTimeRecordRequest {
  reason: string;
}

export interface CreateWorkTimeRecordAnnexRequest {
  correctionDate: string; // YYYY-MM-DD
  correctedHours: number; // 0.0 - 24.0
  reason: string; // 10 - 1000 chars
}

export interface RejectWorkTimeRecordAnnexRequest {
  reason: string; // 10 - 2000 chars
}
