import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WorkTimeAdminService {
  private readonly API_URL = `${environment.apiUrl}/api/admin/work-time-records`;

  constructor(private http: HttpClient) {}

  // Triggers creation of monthly work time records for a company
  createMonthlyRecords(year: number, month: number): Observable<void> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month).padStart(2, '0'));
    return this.http.post<void>(`${this.API_URL}/create`, {}, { params });
  }

  // Returns history of recalculation jobs (optional, backend dependent)
  getHistory(): Observable<Array<{ id?: number; year: number; month: number; triggeredAt: string; triggeredBy?: string; status?: string; message?: string }>> {
    return this.http.get<Array<{ id?: number; year: number; month: number; triggeredAt: string; triggeredBy?: string; status?: string; message?: string }>>(`${this.API_URL}/history`);
  }
}
