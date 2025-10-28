import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  WorkTimeRecordResponse,
  WorkTimeRecordDetailsResponse,
  WorkTimeRecordHistoryResponse,
  WorkTimeRecordStatus,
  RejectWorkTimeRecordRequest,
  CreateWorkTimeRecordAnnexRequest
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
    if (status) params = params.set('status', status);
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
    if (status) params = params.set('status', status);
    if (year != null) params = params.set('year', String(year));
    if (month != null) params = params.set('month', String(month));
    return this.http.get<WorkTimeRecordResponse[]>(`${this.API_URL}/company`, { params });
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

  // History
  getRecordHistory(id: number): Observable<WorkTimeRecordHistoryResponse[]> {
    return this.http.get<WorkTimeRecordHistoryResponse[]>(`${this.API_URL}/${id}/history`);
  }

  getMyHistory(): Observable<WorkTimeRecordHistoryResponse[]> {
    return this.http.get<WorkTimeRecordHistoryResponse[]>(`${this.API_URL}/my/history`);
  }
}
