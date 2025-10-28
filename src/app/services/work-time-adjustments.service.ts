import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type WorkTimeAdjustmentType = 'OVERTIME' | 'UNDERTIME';
export type WorkTimeAdjustmentStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface CreateAdjustmentRequest {
  workDate: string; // YYYY-MM-DD
  adjustmentType: WorkTimeAdjustmentType;
  hours: number; // >0
  title: string;
  reason?: string;
}

export interface AdjustmentResponse {
  id: number;
  workDate: string;
  adjustmentType: WorkTimeAdjustmentType;
  hours: number;
  title: string;
  reason?: string;
  status: WorkTimeAdjustmentStatus;
}

@Injectable({ providedIn: 'root' })
export class WorkTimeAdjustmentsService {
  private readonly API_URL = `${environment.apiUrl}/api/work-time-adjustments`;

  constructor(private http: HttpClient) {}

  create(req: CreateAdjustmentRequest): Observable<AdjustmentResponse> {
    return this.http.post<AdjustmentResponse>(`${this.API_URL}`, req);
  }

  submit(id: number): Observable<void> { return this.http.post<void>(`${this.API_URL}/${id}/submit`, {}); }
  approve(id: number): Observable<void> { return this.http.post<void>(`${this.API_URL}/${id}/approve`, {}); }
  reject(id: number, reason: string): Observable<void> { return this.http.post<void>(`${this.API_URL}/${id}/reject`, { reason }); }

  getMy(status?: WorkTimeAdjustmentStatus): Observable<AdjustmentResponse[]> {
    let params = new HttpParams(); if (status) params = params.set('status', status);
    return this.http.get<AdjustmentResponse[]>(`${this.API_URL}/my`, { params });
  }

  getCompany(status?: WorkTimeAdjustmentStatus): Observable<AdjustmentResponse[]> {
    let params = new HttpParams(); if (status) params = params.set('status', status);
    return this.http.get<AdjustmentResponse[]>(`${this.API_URL}/company`, { params });
  }
}
