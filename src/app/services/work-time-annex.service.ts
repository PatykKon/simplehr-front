import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AnnexPageResponse, AnnexStatus } from '../models/work-time-annex.models';

export interface AnnexSearchParams {
  year?: number;
  month?: number; // 1-12
  status?: AnnexStatus;
  my_only?: boolean;
  first_name?: string;
  last_name?: string;
  page?: number; // 0-based
  size?: number; // default 20
  sort?: string | string[]; // e.g. 'createdAt,DESC' or ['createdAt,DESC','status,ASC']
}

@Injectable({ providedIn: 'root' })
export class WorkTimeAnnexService {
  private readonly API_URL = `${environment.apiUrl}/api/work-time-records/annexes/search`;

  constructor(private http: HttpClient) {}

  search(params: AnnexSearchParams): Observable<AnnexPageResponse> {
    let httpParams = new HttpParams();

    if (params.year != null) httpParams = httpParams.set('year', String(params.year));
    if (params.month != null) httpParams = httpParams.set('month', String(params.month));
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.my_only != null) httpParams = httpParams.set('my_only', String(params.my_only));
    if (params.first_name) httpParams = httpParams.set('first_name', params.first_name);
    if (params.last_name) httpParams = httpParams.set('last_name', params.last_name);
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));

    if (params.sort) {
      if (Array.isArray(params.sort)) {
        params.sort.forEach(s => { if (s) httpParams = httpParams.append('sort', s); });
      } else {
        httpParams = httpParams.set('sort', params.sort);
      }
    }

    return this.http.get<AnnexPageResponse>(this.API_URL, { params: httpParams });
  }
}
