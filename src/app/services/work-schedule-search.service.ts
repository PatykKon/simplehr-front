import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { WorkSchedulePageResponse, WorkScheduleSearchParams } from '../models/work-schedule-search.models';

@Injectable({ providedIn: 'root' })
export class WorkScheduleSearchService {
  private readonly API_URL = `${environment.apiUrl}/api/work-schedules/search`;

  constructor(private http: HttpClient) {}

  search(params: WorkScheduleSearchParams): Observable<WorkSchedulePageResponse> {
    let httpParams = new HttpParams();

    if (params.name) httpParams = httpParams.set('name', params.name);
    if (params.year != null) httpParams = httpParams.set('year', String(params.year));
    if (params.month != null) httpParams = httpParams.set('month', String(params.month));
    if (params.status) httpParams = httpParams.set('status', String(params.status));
    if (params.my_only != null) httpParams = httpParams.set('my_only', String(params.my_only));
    if (params.created_by != null) httpParams = httpParams.set('created_by', String(params.created_by));
    if (params.created_from) httpParams = httpParams.set('created_from', params.created_from);
    if (params.created_to) httpParams = httpParams.set('created_to', params.created_to);
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));

    if (params.sort) {
      const toCamel = (s: string) => {
        const [f, d] = s.split(',');
        const alias: Record<string, string> = {
          created_at: 'createdAt',
          created: 'createdAt',
          name: 'name',
          start_date: 'startDate',
          end_date: 'endDate',
          status: 'status',
          created_by: 'createdByUserId',
          createdbyuserid: 'createdByUserId'
        };
        const key = alias[(f || '').replace(/\s+/g, '').toLowerCase()] || f || 'createdAt';
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

    return this.http.get<WorkSchedulePageResponse>(this.API_URL, { params: httpParams });
  }
}
