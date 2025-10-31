import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountOverview } from '../models/account.models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly API_URL = `${environment.apiUrl}/api/account`;

  constructor(private http: HttpClient) {}

  getOverview(): Observable<AccountOverview> {
    return this.http.get<AccountOverview>(`${this.API_URL}/overview`).pipe(
      catchError(() => {
        // Graceful fallback so the UI renders even if backend is not ready
        const mock: AccountOverview = {
          companyId: 0,
          companyName: '—',
          plan: 'TRIAL',
          active: true,
          activatedAt: null,
          subscriptionStart: null,
          subscriptionEnd: null,
          nextPaymentDue: null,
          seats: null,
          usedSeats: null,
          usersCount: null,
          lastInvoiceId: null,
          lastInvoiceDate: null,
          lastPaymentStatus: null,
          twoFactorEnabled: null,
          lastPasswordChangeAt: null,
          lastLoginAt: null,
          lastTokenIssuedAt: null,
          ownerEmail: null,
        };
        return of(mock);
      })
    );
  }
}
