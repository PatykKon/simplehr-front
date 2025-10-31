import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminWorkTimeRecordPageResponse, AdminWorkTimeRecordSearchParams } from '../models/admin-work-time-record-search.models';

@Injectable({ providedIn: 'root' })
export class AdminWorkTimeRecordService {
  private readonly API_URL = `${environment.apiUrl}/api/admin/work-time-records/search`;

  constructor(private http: HttpClient) {}

  search(params: AdminWorkTimeRecordSearchParams): Observable<AdminWorkTimeRecordPageResponse> {
    let httpParams = new HttpParams();

    if (params.year != null) httpParams = httpParams.set('year', String(params.year));
    if (params.month != null) httpParams = httpParams.set('month', String(params.month));
    if (params.status) httpParams = httpParams.set('status', String(params.status));
    if (params.my_only != null) httpParams = httpParams.set('my_only', String(params.my_only));
    if (params.employee_id != null) httpParams = httpParams.set('employee_id', String(params.employee_id));
    if (params.first_name) httpParams = httpParams.set('first_name', params.first_name);
    if (params.last_name) httpParams = httpParams.set('last_name', params.last_name);
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));

    // Ensure camelCase entity property names for sort, allow multiple
    if (params.sort) {
      const toCamel = (s: string) => {
        const [f, d] = s.split(',');
        const alias: Record<string, string> = {
          created_at: 'createdAt',
          created: 'createdAt',
          status: 'status'
        };
        const key = alias[f] || f || 'createdAt';
        const dir = (d || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        return `${key},${dir}`;
      };
      if (Array.isArray(params.sort)) {
        params.sort.forEach(s => { if (s) httpParams = httpParams.append('sort', toCamel(s)); });
      } else {
        httpParams = httpParams.append('sort', toCamel(params.sort));
      }
    } else {
      httpParams = httpParams.append('sort', 'createdAt,DESC');
    }

    return this.http.get<AdminWorkTimeRecordPageResponse>(this.API_URL, { params: httpParams });
  }
}
