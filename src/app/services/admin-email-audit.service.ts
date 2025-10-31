import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { EmailAuditPage, EmailAuditQuery } from '../models/email-audit.models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminEmailAuditService {
  private readonly API = `${environment.apiUrl}/api/admin/emails`;

  constructor(private http: HttpClient) {}

  list(query: EmailAuditQuery): Observable<EmailAuditPage> {
    let params = new HttpParams();
    const q = {
      page: query.page ?? 0,
      size: query.size ?? 20,
      sort: query.sort ?? 'createdAt,desc',
      status: query.status ?? undefined,
      type: query.type ?? undefined,
      to: query.to ?? undefined,
      provider: query.provider ?? undefined,
      from: query.from ?? undefined,
      toDate: query.toDate ?? undefined
    } as Record<string, string | number | undefined>;
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<EmailAuditPage>(this.API, { params });
  }
}
