import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ManualDayRequest, WorkTimeConfig, WorkTimeDayResponse, WorkTimePunchRequest } from '../models/work-time.models';

@Injectable({ providedIn: 'root' })
export class WorkTimeService {
  private readonly API_URL = `${environment.apiUrl}/api/work-time`;
  private readonly CONFIG_URL = `${environment.apiUrl}/api/work-time-configs`;

  constructor(private http: HttpClient) {}

  // Month view (0..31 items)
  getDays(period: string, userId?: number): Observable<WorkTimeDayResponse[]> {
    let params = new HttpParams().set('period', period);
    if (userId != null) params = params.set('userId', userId.toString());
    return this.http.get<WorkTimeDayResponse[]>(`${this.API_URL}/days`, { params });
  }

  // Day details
  getDay(date: string): Observable<WorkTimeDayResponse> {
    return this.http.get<WorkTimeDayResponse>(`${this.API_URL}/day/${date}`);
  }

  // Punch actions
  punchIn(payload: WorkTimePunchRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/punch/in`, payload);
  }

  punchOut(payload: WorkTimePunchRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/punch/out`, payload);
  }

  // Manual day update
  updateManualDay(payload: ManualDayRequest): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/manual/day`, payload);
  }

  // WorkTimeConfig - fetch list and pick active=true
  getActiveConfig(): Observable<WorkTimeConfig | null> {
    return this.http.get<WorkTimeConfig[]>(`${this.CONFIG_URL}`).pipe(
      switchMap(list => of((list || []).find(c => (c as any).active === true) ?? null)),
      catchError(() => of(null))
    );
  }

  // WorkTimeConfig - list all
  getConfigs(): Observable<WorkTimeConfig[]> {
    return this.http.get<WorkTimeConfig[]>(`${this.CONFIG_URL}`);
  }

  // WorkTimeConfig - create new (ADMIN/HR)
  createConfig(payload: WorkTimeConfig): Observable<WorkTimeConfig> {
    return this.http.post<WorkTimeConfig>(`${this.CONFIG_URL}`, payload);
  }

  // WorkTimeConfig - set active (ADMIN/HR)
  activateConfig(id: number): Observable<void> {
    return this.http.post<void>(`${this.CONFIG_URL}/${id}/activate`, {});
  }
}
