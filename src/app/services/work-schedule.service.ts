import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  WorkScheduleResponse,
  WorkScheduleDetailsResponse,
  CreateWorkScheduleRequest,
  AddWorkScheduleEntryRequest,
  UpdateWorkScheduleEntryRequest,
  RejectWorkScheduleRequest,
  WorkScheduleHistoryResponse,
  WorkScheduleEntryResponse
} from '../models/work-schedule.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WorkScheduleService {
  private readonly API_URL = `${environment.apiUrl}/api/work-schedules`;

  constructor(private http: HttpClient) {}

  // Grafiki
  createSchedule(request: CreateWorkScheduleRequest): Observable<WorkScheduleResponse> {
    return this.http.post<WorkScheduleResponse>(this.API_URL, request);
  }

  getSchedule(id: number): Observable<WorkScheduleDetailsResponse> {
    return this.http.get<WorkScheduleDetailsResponse>(`${this.API_URL}/${id}`);
  }

  getAllSchedules(status?: string): Observable<WorkScheduleResponse[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<WorkScheduleResponse[]>(this.API_URL, { params });
  }

  getPublishedSchedules(): Observable<WorkScheduleResponse[]> {
    return this.http.get<WorkScheduleResponse[]>(`${this.API_URL}/published`);
  }

  // Wpisy w grafiku
  addEntry(scheduleId: number, request: AddWorkScheduleEntryRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${scheduleId}/entries`, request);
  }

  updateEntry(scheduleId: number, entryId: number, request: UpdateWorkScheduleEntryRequest): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/${scheduleId}/entries/${entryId}`, request);
  }

  removeEntry(scheduleId: number, entryId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${scheduleId}/entries/${entryId}`);
  }

  getUserEntries(scheduleId: number, userId: number): Observable<WorkScheduleEntryResponse[]> {
    return this.http.get<WorkScheduleEntryResponse[]>(`${this.API_URL}/${scheduleId}/entries/user/${userId}`);
  }

  getEntriesForDate(scheduleId: number, date: string): Observable<WorkScheduleEntryResponse[]> {
    return this.http.get<WorkScheduleEntryResponse[]>(`${this.API_URL}/${scheduleId}/entries/date/${date}`);
  }

  // Workflow
  submitSchedule(scheduleId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${scheduleId}/submit`, {});
  }

  approveSchedule(scheduleId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${scheduleId}/approve`, {});
  }

  rejectSchedule(scheduleId: number, request: RejectWorkScheduleRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${scheduleId}/reject`, request);
  }

  publishSchedule(scheduleId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${scheduleId}/publish`, {});
  }

  // Historia
  getScheduleHistory(scheduleId: number): Observable<WorkScheduleHistoryResponse[]> {
    return this.http.get<WorkScheduleHistoryResponse[]>(`${this.API_URL}/${scheduleId}/history`);
  }

  getLeaveConflicts(scheduleId: number): Observable<WorkScheduleHistoryResponse[]> {
    return this.http.get<WorkScheduleHistoryResponse[]>(`${this.API_URL}/${scheduleId}/history/conflicts`);
  }
}