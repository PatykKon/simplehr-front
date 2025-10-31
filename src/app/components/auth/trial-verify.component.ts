import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-trial-verify',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="verify-page">
      <div class="verify-card">
        <h1>Aktywacja konta testowego</h1>
        <div *ngIf="loading" class="state">Weryfikuję token…</div>
        <div *ngIf="!loading && success" class="state ok">
          <div class="big">✅</div>
          <p>Konto trial aktywowane.</p>
          <div class="meta" *ngIf="meta">
            <div><strong>Firma ID:</strong> {{ meta.company_id }}</div>
            <div><strong>Właściciel ID:</strong> {{ meta.owner_user_id }}</div>
            <div><strong>Wygasa:</strong> {{ meta.trial_expires_at | date:'yyyy-MM-dd HH:mm' }}</div>
          </div>
          <a routerLink="/login" class="btn">Przejdź do logowania →</a>
        </div>
        <div *ngIf="!loading && error" class="state err">
          <div class="big">⚠️</div>
          <p>{{ error }}</p>
          <a routerLink="/trial-signup" class="btn ghost">Załóż konto testowe</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verify-page{display:grid;place-items:center;min-height:100dvh;background:#f9fafb;padding:24px}
    .verify-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;max-width:560px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,.05)}
    .state{display:grid;gap:8px;place-items:center;margin-top:12px}
    .state.ok{color:#065f46}
    .state.err{color:#7f1d1d}
    .big{font-size:42px}
    .btn{display:inline-block;margin-top:10px;padding:10px 14px;border-radius:8px;border:1px solid #2563eb;background:#2563eb;color:#fff;text-decoration:none}
    .btn.ghost{border-color:#9ca3af;background:#fff;color:#111827}
    .meta{margin:8px 0 0 0; font-size:.95rem; color:#374151}
  `]
})
export class TrialVerifyComponent implements OnInit {
  loading = true;
  success = false;
  error: string | null = null;
  meta: any = null;

  constructor(private route: ActivatedRoute, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading = false;
      this.error = 'Brak tokenu weryfikacyjnego';
      return;
    }
    this.auth.verify(token).subscribe({
      next: (res) => { this.success = true; this.meta = res; },
      error: () => { this.error = 'Token nieprawidłowy lub wygasł'; },
      complete: () => this.loading = false
    });
  }
}
