import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TrialExpiredError, TrialStatus } from '../models/trial.models';
import { catchError, of, tap } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class TrialService {
  private readonly API_URL = `${environment.apiUrl}/api`;

  // State
  private statusSig = signal<TrialStatus | null>(null);
  private loadingSig = signal<boolean>(false);
  private errorSig = signal<unknown | null>(null);
  private expiredModalOpenSig = signal<boolean>(false);
  private expiredAtSig = signal<string | undefined>(undefined);

  // Lock to prevent modal flood
  private lockUntil = 0;
  private readonly LOCK_MS = 30000; // 30s default

  // Public selectors
  status = computed(() => this.statusSig());
  loading = computed(() => this.loadingSig());
  error = computed(() => this.errorSig());
  expiredModalOpen = computed(() => this.expiredModalOpenSig());
  expiredAt = computed(() => this.expiredAtSig());

  showBanner = computed(() => {
    const s = this.statusSig();
    if (!s) return false;
    if (!s.trial) return false;
    if (s.remaining_days === null || s.remaining_days === undefined) return false;
    return s.remaining_days >= 0;
  });

  warningVariant = computed(() => {
    const s = this.statusSig();
    if (!s || s.remaining_days == null) return false;
    return s.remaining_days <= 3;
  });

  isExpired = computed(() => {
    const s = this.statusSig();
    if (!s) return false;
    // rely on backend data; if remaining_days < 0 treat as expired
    if (s.remaining_days != null && s.remaining_days < 0) return true;
    return false;
  });

  constructor(private http: HttpClient, private auth: AuthService) {
    // Refresh on login events
    this.auth.currentUser$.subscribe(user => {
      if (user) this.refresh();
    });
  }

  init(): void {
    // Call on app start
    this.refresh();
  }

  refresh(): void {
    if (!this.auth.isAuthenticated()) {
      // user not logged in; don't fetch to avoid 401 noise
      return;
    }
    this.loadingSig.set(true);
    this.errorSig.set(null);
    this.http
      .get<TrialStatus>(`${this.API_URL}/me/trial-status`)
      .pipe(
        tap((status) => this.statusSig.set(status)),
        catchError((err: HttpErrorResponse) => {
          this.errorSig.set(err);
          return of(null);
        })
      )
      .subscribe({
        complete: () => this.loadingSig.set(false)
      });
  }

  openExpiredModal(expiresAt?: string): void {
    const now = Date.now();
    if (now < this.lockUntil && this.expiredModalOpenSig()) return;
    this.lockUntil = now + this.LOCK_MS;
    this.expiredAtSig.set(expiresAt);
    this.expiredModalOpenSig.set(true);
  }

  closeExpiredModal(): void {
    this.expiredModalOpenSig.set(false);
  }
}
