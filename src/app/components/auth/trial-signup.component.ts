import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-trial-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>Załóż konto testowe</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label>Email
            <input type="email" formControlName="email" placeholder="you@example.com" required />
          </label>
          <label>Hasło
            <input type="password" formControlName="password" placeholder="********" required />
          </label>
          <label class="checkbox">
            <input type="checkbox" formControlName="consent_tc" /> Akceptuję regulamin
          </label>
          <label class="checkbox">
            <input type="checkbox" formControlName="consent_rodo" /> Wyrażam zgodę RODO
          </label>

          <button type="submit" [disabled]="loading || form.invalid">Utwórz konto testowe</button>
        </form>

        <div class="hint" *ngIf="success">
          Sprawdź skrzynkę — wysłaliśmy e‑mail weryfikacyjny z linkiem aktywacyjnym.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page{display:grid;place-items:center;min-height:100dvh;background:#f9fafb;padding:24px}
    .auth-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,.05)}
    form{display:grid;gap:12px;margin-top:12px}
    label{display:grid;gap:6px}
    input[type="email"],input[type="password"]{padding:10px;border:1px solid #d1d5db;border-radius:8px}
    .checkbox{display:flex;gap:8px;align-items:center}
    button{padding:10px 14px;border-radius:8px;border:1px solid #2563eb;background:#2563eb;color:#fff;cursor:pointer}
    .hint{margin-top:12px;background:#ecfeff;border:1px solid #06b6d4;color:#0e7490;padding:10px;border-radius:8px}
  `]
})
export class TrialSignupComponent {
  form: FormGroup;
  loading = false;
  success = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private notifications: NotificationService, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      consent_tc: [false, [Validators.requiredTrue]],
      consent_rodo: [false, [Validators.requiredTrue]]
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    const v = this.form.value as any;
    this.auth.trialSignup({
      email: v.email,
      password: v.password,
      consent_tc: v.consent_tc,
      consent_rodo: v.consent_rodo
    }).subscribe({
      next: () => {
        this.success = true;
        this.notifications.success('Wysłaliśmy e‑mail weryfikacyjny');
        this.form.disable();
      },
      error: () => {
        this.notifications.error('Nie udało się utworzyć konta testowego');
      },
      complete: () => this.loading = false
    });
  }
}
