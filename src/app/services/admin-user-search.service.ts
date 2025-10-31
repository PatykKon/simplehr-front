import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserPageResponse } from '../models/user-search.models';

export interface UserSearchParams {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  role?: 'ROLE_ADMIN' | 'ROLE_HR' | 'ROLE_MANAGER' | 'ROLE_USER' | string;
  enabled?: boolean;
  my_only?: boolean;
  page?: number;
  size?: number;
  sort?: string | string[]; // e.g., 'createdAt,DESC' or multiple
}

@Injectable({ providedIn: 'root' })
export class AdminUserSearchService {
  private readonly PRIMARY_URL = `${environment.apiUrl}/api/admin/employee/list`;
  private readonly FALLBACK_URL = `${environment.apiUrl}/api/users/search`;

  constructor(private http: HttpClient) {}

  search(params: UserSearchParams, useFallback = false): Observable<UserPageResponse> {
    const url = useFallback ? this.FALLBACK_URL : this.PRIMARY_URL;
    let httpParams = new HttpParams();

    if (params.first_name) httpParams = httpParams.set('first_name', params.first_name);
    if (params.last_name) httpParams = httpParams.set('last_name', params.last_name);
    if (params.username) httpParams = httpParams.set('username', params.username);
    if (params.email) httpParams = httpParams.set('email', params.email);
    if (params.role) httpParams = httpParams.set('role', String(params.role));
    if (params.enabled != null) httpParams = httpParams.set('enabled', String(params.enabled));
    if (params.my_only != null) httpParams = httpParams.set('my_only', String(params.my_only));
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));

    if (params.sort) {
      const toCamel = (s: string) => {
        const [f, d] = s.split(',');
        const alias: Record<string, string> = {
          created_at: 'createdAt',
          created: 'createdAt',
          first_name: 'firstName',
          last_name: 'lastName',
          username: 'username',
          email: 'email',
          enabled: 'enabled'
        };
        const key = alias[(f || '').toLowerCase()] || f || 'createdAt';
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

    return this.http.get<UserPageResponse>(url, { params: httpParams });
  }
}
