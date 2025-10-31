import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LeaveProposalPageResponse, LeaveProposalSearchParams } from '../models/leave-proposal-search.models';

@Injectable({ providedIn: 'root' })
export class LeaveProposalSearchService {
  private readonly API_URL = `${environment.apiUrl}/api/leave-proposals/search`;

  constructor(private http: HttpClient) {}

  search(params: LeaveProposalSearchParams): Observable<LeaveProposalPageResponse> {
    let httpParams = new HttpParams();

    if (params.year != null) httpParams = httpParams.set('year', String(params.year));
    if (params.month != null) httpParams = httpParams.set('month', String(params.month));
    if (params.status) httpParams = httpParams.set('status', String(params.status));
    if (params.leave_type) httpParams = httpParams.set('leave_type', String(params.leave_type));
    if (params.my_only != null) httpParams = httpParams.set('my_only', String(params.my_only));
    if (params.first_name) httpParams = httpParams.set('first_name', params.first_name);
    if (params.last_name) httpParams = httpParams.set('last_name', params.last_name);
    if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
    if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));

    if (params.sort) {
      if (Array.isArray(params.sort)) {
        params.sort.forEach(s => { if (s) httpParams = httpParams.append('sort', s); });
      } else {
        httpParams = httpParams.set('sort', params.sort);
      }
    }

    return this.http.get<LeaveProposalPageResponse>(this.API_URL, { params: httpParams });
  }
}
