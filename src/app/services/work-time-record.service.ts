import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  WorkTimeRecordResponse,
  WorkTimeRecordDetailsResponse,
  WorkTimeRecordHistoryResponse,
  WorkTimeRecordStatus,
  WorkTimeRecordAnnexResponse,
  RejectWorkTimeRecordRequest,
  CreateWorkTimeRecordAnnexRequest,
  RejectWorkTimeRecordAnnexRequest,
  WorkTimeRecordPageResponse
} from '../models/work-time-record.models';

@Injectable({ providedIn: 'root' })
export class WorkTimeRecordService {
  private readonly API_URL = `${environment.apiUrl}/api/work-time-records`;

  constructor(private http: HttpClient) {}

  // Read endpoints
  getRecord(id: number): Observable<WorkTimeRecordDetailsResponse> {
    return this.http.get<WorkTimeRecordDetailsResponse>(`${this.API_URL}/${id}`);
    }

  getMyRecords(status?: WorkTimeRecordStatus, year?: number, month?: number): Observable<WorkTimeRecordResponse[]> {
    let params = new HttpParams();
    const statusParam = this.statusToParam(status);
    if (statusParam) params = params.set('status', statusParam);
    if (year != null) params = params.set('year', String(year));
    if (month != null) params = params.set('month', String(month));
    return this.http.get<WorkTimeRecordResponse[]>(`${this.API_URL}/my`, { params });
  }

  getMyPendingRecords(year?: number, month?: number): Observable<WorkTimeRecordResponse[]> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', String(year));
    if (month != null) params = params.set('month', String(month));
    return this.http.get<WorkTimeRecordResponse[]>(`${this.API_URL}/my/pending`, { params });
  }

  getCompanyRecords(status?: WorkTimeRecordStatus, year?: number, month?: number): Observable<WorkTimeRecordResponse[]> {
    let params = new HttpParams();
    const statusParam = this.statusToParam(status);
    if (statusParam) params = params.set('status', statusParam);
    if (year != null) params = params.set('year', String(year));
    if (month != null) params = params.set('month', String(month));
    return this.http.get<WorkTimeRecordResponse[]>(`${this.API_URL}/company`, { params });
  }

  getCompanyRecordsPage(options: {
    year: number;
    month: number;
    status?: WorkTimeRecordStatus;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<WorkTimeRecordPageResponse> {
    let params = new HttpParams()
      .set('year', String(options.year))
      .set('month', String(options.month));

    const statusParam = this.statusToParam(options.status);
    if (statusParam) {
      params = params.set('status', statusParam);
    }
    if (options.page != null) {
      params = params.set('page', String(options.page));
    }
    if (options.size != null) {
      params = params.set('size', String(options.size));
    }
    if (options.sort) {
      params = params.set('sort', options.sort);
    }

    return this.http.get<WorkTimeRecordPageResponse>(`${this.API_URL}`, { params });
  }

  getCompanyPendingRecords(year?: number, month?: number): Observable<WorkTimeRecordResponse[]> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', String(year));
    if (month != null) params = params.set('month', String(month));
    return this.http.get<WorkTimeRecordResponse[]>(`${this.API_URL}/company/pending`, { params });
  }

  // Workflow - user actions
  acceptByUser(id: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${id}/accept-by-user`, {});
  }

  // Workflow - supervisor actions
  acceptBySupervisor(id: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${id}/accept-by-supervisor`, {});
  }

  reject(id: number, payload: RejectWorkTimeRecordRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${id}/reject`, payload);
  }

  // Annexes
  createAnnex(id: number, payload: CreateWorkTimeRecordAnnexRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${id}/annex`, payload);
  }

  getAnnexes(id: number): Observable<WorkTimeRecordAnnexResponse[]> {
    return this.http.get<WorkTimeRecordAnnexResponse[]>(`${this.API_URL}/${id}/annexes`);
  }

  getAnnex(id: number, annexId: number): Observable<WorkTimeRecordAnnexResponse> {
    return this.http.get<WorkTimeRecordAnnexResponse>(`${this.API_URL}/${id}/annexes/${annexId}`);
  }

  approveAnnex(id: number, annexId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${id}/annexes/${annexId}/approve`, {});
  }

  rejectAnnex(id: number, annexId: number, payload: RejectWorkTimeRecordAnnexRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${id}/annexes/${annexId}/reject`, payload);
  }

  // History
  getRecordHistory(id: number): Observable<WorkTimeRecordHistoryResponse[]> {
    return this.http.get<WorkTimeRecordHistoryResponse[]>(`${this.API_URL}/${id}/history`);
  }

  getMyHistory(): Observable<WorkTimeRecordHistoryResponse[]> {
    return this.http.get<WorkTimeRecordHistoryResponse[]>(`${this.API_URL}/my/history`);
  }

  private statusToParam(status?: WorkTimeRecordStatus): string | undefined {
    if (status == null) {
      return undefined;
    }
    if (typeof status === 'string') {
      return status;
    }
    const mapped = WorkTimeRecordStatus[status];
    return mapped ?? undefined;
  }
}
